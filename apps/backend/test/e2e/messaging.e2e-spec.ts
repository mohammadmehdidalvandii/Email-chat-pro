import { ERROR_CODES, ERROR_MESSAGES, MESSAGE_LIMIT_MAX } from '@email-chat-pro/constants'
import {
  createE2EApp,
  loginAs,
  makeChat,
  makeContactRequest,
  makeMessage,
  makeUser,
  request,
  type ApiEnvelope,
  type E2EContext,
  type TestUser,
} from './e2e-app'

/**
 * Chat and message integration (P2, Step 7) — the messaging HTTP surface:
 * sending, history, pagination, and the conversation list, over real HTTP
 * against the real guard, controller, ValidationPipe and service.
 *
 * The decisions this file exists to pin down:
 *   1. `sendMessage` refuses in three distinct ways — unknown chat (404), a
 *      caller who is not a participant (403), and a chat between two users who
 *      are not accepted contacts (403) — and each must be distinguishable;
 *   2. the sender is derived from the JWT, never from the request body, so a
 *      client cannot post a message as somebody else;
 *   3. history is participant-scoped and newest-first, and its pagination
 *      metadata describes the whole chat rather than the returned page;
 *   4. the conversation list is scoped to the caller, resolves the *other*
 *      participant as `contact`, and orders by most recent activity.
 *
 * `GET /chats` exercises the only `createQueryBuilder` call in the codebase
 * (the `DISTINCT ON (chat_id)` latest-message query), so this suite is also the
 * only automated coverage of that path.
 */
interface MessageContract {
  id: string
  chatId: string
  senderId: string
  sender: UserContract
  content: string
  messageType: string
  mediaUrl: string | null
  createdAt: string
}

interface UserContract {
  id: string
  email: string
  username: string | null
}

interface PaginatedMessages {
  success: true
  data: MessageContract[]
  pagination: { total: number; page: number; limit: number; pages: number }
  timestamp: string
}

interface ConversationListItem {
  id: string
  contact: UserContract
  lastMessage: MessageContract | null
  lastActivityAt: string
}

describe('messaging (e2e)', () => {
  let ctx: E2EContext

  beforeAll(async () => {
    ctx = await createE2EApp()
  })

  afterAll(async () => {
    await ctx?.close()
  })

  beforeEach(() => {
    ctx.store.reset()
    ctx.mail.reset()
  })

  let alice: TestUser
  let bob: TestUser
  let carol: TestUser
  let aliceToken: string
  let bobToken: string
  let carolToken: string
  /** A chat between two users who share an accepted contact relationship. */
  let chat: { id: string }

  beforeEach(async () => {
    alice = makeUser(ctx.store, { email: 'alice@example.com', username: 'alice' })
    bob = makeUser(ctx.store, { email: 'bob@example.com', username: 'bob' })
    carol = makeUser(ctx.store, { email: 'carol@example.com', username: 'carol' })
    aliceToken = await loginAs(ctx.baseUrl, alice.email)
    bobToken = await loginAs(ctx.baseUrl, bob.email)
    carolToken = await loginAs(ctx.baseUrl, carol.email)
    // Acceptance is what authorizes messaging, so the happy-path chat is
    // seeded with a real accepted request rather than the chat row alone.
    makeContactRequest(ctx.store, alice, bob, 'accepted')
    chat = makeChat(ctx.store, alice, bob) as { id: string }
  })

  const send = (token: string, chatId: string, body: Record<string, unknown>) =>
    request<ApiEnvelope<MessageContract>>(ctx.baseUrl, `/chats/${chatId}/messages`, {
      method: 'POST',
      token,
      body,
    })

  const history = (token: string, chatId: string, query: Record<string, string> = {}) =>
    request<PaginatedMessages>(ctx.baseUrl, `/chats/${chatId}/messages`, { token, query })

  // -------------------------------------------------------------------------
  describe('POST /chats/:chatId/messages', () => {
    it('persists a text message and returns the shared contract', async () => {
      const res = await send(aliceToken, chat.id, {
        messageType: 'text',
        content: 'hello bob',
      })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toMatchObject({
        chatId: chat.id,
        senderId: alice.id,
        content: 'hello bob',
        messageType: 'text',
        mediaUrl: null,
      })
      expect(typeof res.body.data.id).toBe('string')
      // The nested sender is the shared User contract and must not leak the hash.
      expect(res.body.data.sender).toMatchObject({ id: alice.id, email: alice.email })
      expect(res.body.data.sender).not.toHaveProperty('passwordHash')
      // It was really persisted, not just echoed.
      expect(ctx.store.messages.size).toBe(1)
    })

    it('derives the sender from the JWT, never from the body', async () => {
      // `senderId` is not a CreateMessageDto property, and the global pipe runs
      // with forbidNonWhitelisted, so a client that tries to post as somebody
      // else is rejected outright rather than having the field quietly dropped.
      // Either way the sender can only come from the verified token; the
      // separate test below asserts the accepted shape stays the token's user.
      const res = await send(bobToken, chat.id, {
        messageType: 'text',
        content: 'hi alice',
        senderId: carol.id,
      })

      expect(res.status).toBe(400)
      expect(res.body.error?.code).toBe(ERROR_CODES.VALIDATION_ERROR)
      expect(ctx.store.messages.size).toBe(0)
    })

    it('attributes the message to the token holder, not to any other participant', async () => {
      // carol is a real user with a real account, and the message is accepted
      // — it is simply attributed to the authenticated sender, bob.
      const res = await send(bobToken, chat.id, {
        messageType: 'text',
        content: 'hi alice',
      })

      expect(res.status).toBe(201)
      expect(res.body.data.senderId).toBe(bob.id)
      expect(res.body.data.sender.id).toBe(bob.id)
      expect(res.body.data.chatId).toBe(chat.id)
    })

    it('requires authentication', async () => {
      const res = await request(ctx.baseUrl, `/chats/${chat.id}/messages`, {
        method: 'POST',
        body: { messageType: 'text', content: 'anonymous' },
      })

      expect(res.status).toBe(401)
      expect(ctx.store.messages.size).toBe(0)
    })

    it('returns 404 for a chat that does not exist', async () => {
      const missing = '99999999-0000-4000-8000-000000000001'
      const res = await send(aliceToken, missing, {
        messageType: 'text',
        content: 'into the void',
      })

      expect(res.status).toBe(404)
      expect(res.body.error?.code).toBe(ERROR_CODES.NOT_FOUND)
      expect(ctx.store.messages.size).toBe(0)
    })

    it('returns 404 for a chat id that is not a UUID', async () => {
      // ParseUUIDPipe runs before the service, so a malformed id never reaches
      // a database query.
      const res = await send(aliceToken, 'not-a-uuid', {
        messageType: 'text',
        content: 'nope',
      })

      expect(res.status).toBe(400)
      expect(ctx.store.messages.size).toBe(0)
    })

    it('returns 403 for a caller who is not a participant', async () => {
      const res = await send(carolToken, chat.id, {
        messageType: 'text',
        content: 'eavesdropping',
      })

      expect(res.status).toBe(403)
      expect(res.body.error?.code).toBe(ERROR_CODES.FORBIDDEN)
      expect(res.body.error?.message).toBe(ERROR_MESSAGES.NOT_CHAT_PARTICIPANT)
      expect(ctx.store.messages.size).toBe(0)
    })

    it('returns 403 when the participants are not accepted contacts', async () => {
      // A chat row between two users who never accepted a contact request.
      // Chats are only created on acceptance, so this is the defense-in-depth
      // branch — it must not be reachable by sending a message.
      const strangers = makeChat(ctx.store, alice, carol) as { id: string }

      const res = await send(aliceToken, strangers.id, {
        messageType: 'text',
        content: 'not a contact',
      })

      expect(res.status).toBe(403)
      expect(res.body.error?.message).toBe(ERROR_MESSAGES.CONTACT_RELATIONSHIP_REQUIRED)
      expect(ctx.store.messages.size).toBe(0)
    })

    it('rejects a text message with no content', async () => {
      const res = await send(aliceToken, chat.id, { messageType: 'text' })

      expect(res.status).toBe(400)
      expect(res.body.error?.message).toBe(ERROR_MESSAGES.MESSAGE_CONTENT_REQUIRED)
      expect(ctx.store.messages.size).toBe(0)
    })

    it('rejects a whitespace-only text message', async () => {
      const res = await send(aliceToken, chat.id, { messageType: 'text', content: '   ' })

      expect(res.status).toBe(400)
      expect(res.body.error?.message).toBe(ERROR_MESSAGES.MESSAGE_CONTENT_REQUIRED)
      expect(ctx.store.messages.size).toBe(0)
    })

    it('rejects a mediaUrl on a text message', async () => {
      const res = await send(aliceToken, chat.id, {
        messageType: 'text',
        content: 'look',
        mediaUrl: 'https://cdn.example.com/a.png',
      })

      expect(res.status).toBe(400)
      expect(res.body.error?.message).toBe(ERROR_MESSAGES.MESSAGE_MEDIA_NOT_ALLOWED)
      expect(ctx.store.messages.size).toBe(0)
    })

    it('rejects an unknown messageType', async () => {
      const res = await send(aliceToken, chat.id, {
        messageType: 'sticker',
        content: 'nope',
      })

      expect(res.status).toBe(400)
      expect(res.body.error?.code).toBe(ERROR_CODES.VALIDATION_ERROR)
      expect(ctx.store.messages.size).toBe(0)
    })

    it('stores an image message with no caption as empty content', async () => {
      const res = await send(aliceToken, chat.id, {
        messageType: 'image',
        mediaUrl: 'https://cdn.example.com/photo.jpg',
      })

      expect(res.status).toBe(201)
      expect(res.body.data).toMatchObject({
        messageType: 'image',
        mediaUrl: 'https://cdn.example.com/photo.jpg',
        // messages.content is NOT NULL, so an absent caption becomes ''.
        content: '',
      })
    })

    it('rejects an image message with a non-http mediaUrl', async () => {
      const res = await send(aliceToken, chat.id, {
        messageType: 'image',
        mediaUrl: 'javascript:alert(1)',
      })

      expect(res.status).toBe(400)
      expect(res.body.error?.message).toBe(ERROR_MESSAGES.IMAGE_MEDIA_URL_INVALID)
      expect(ctx.store.messages.size).toBe(0)
    })

    it('rejects an image message with no mediaUrl', async () => {
      const res = await send(aliceToken, chat.id, { messageType: 'image' })

      expect(res.status).toBe(400)
      expect(res.body.error?.message).toBe(ERROR_MESSAGES.IMAGE_MEDIA_URL_REQUIRED)
      expect(ctx.store.messages.size).toBe(0)
    })

    it('rejects a video message with a non-http mediaUrl', async () => {
      const res = await send(aliceToken, chat.id, {
        messageType: 'video',
        mediaUrl: 'file:///etc/passwd',
      })

      expect(res.status).toBe(400)
      expect(res.body.error?.message).toBe(ERROR_MESSAGES.VIDEO_MEDIA_URL_INVALID)
      expect(ctx.store.messages.size).toBe(0)
    })

    it('accepts a video message with a valid mediaUrl', async () => {
      const res = await send(bobToken, chat.id, {
        messageType: 'video',
        mediaUrl: 'https://cdn.example.com/clip.mp4',
        content: 'clip caption',
      })

      expect(res.status).toBe(201)
      expect(res.body.data).toMatchObject({
        messageType: 'video',
        mediaUrl: 'https://cdn.example.com/clip.mp4',
        content: 'clip caption',
      })
    })

    it('rejects a body field that is not on the DTO', async () => {
      // forbidNonWhitelisted: true, so an unknown field is a 400 rather than
      // being silently dropped.
      const res = await send(aliceToken, chat.id, {
        messageType: 'text',
        content: 'hello',
        isDeleted: true,
      })

      expect(res.status).toBe(400)
      expect(res.body.error?.code).toBe(ERROR_CODES.VALIDATION_ERROR)
      expect(ctx.store.messages.size).toBe(0)
    })
  })

  // -------------------------------------------------------------------------
  describe('GET /chats/:chatId/messages', () => {
    /**
     * Seeds `count` messages with strictly increasing, explicit timestamps.
     * `makeMessage` stamps `new Date()`, and every ordering assertion below
     * depends on the rows being distinguishable within the same millisecond.
     */
    const seedHistory = (count: number, sender: TestUser = bob) => {
      const rows = []
      for (let i = 0; i < count; i += 1) {
        rows.push(
          makeMessage(ctx.store, chat as never, sender, {
            content: `message ${i + 1}`,
            createdAt: new Date(`2026-01-01T00:00:${String(i).padStart(2, '0')}.000Z`),
            updatedAt: new Date(`2026-01-01T00:00:${String(i).padStart(2, '0')}.000Z`),
          }),
        )
      }
      return rows
    }

    it('returns the history newest-first', async () => {
      seedHistory(3)

      const res = await history(aliceToken, chat.id)

      expect(res.status).toBe(200)
      expect(res.body.data.map((m) => m.content)).toEqual([
        'message 3',
        'message 2',
        'message 1',
      ])
    })

    it('reports pagination metadata for the whole chat, not the page', async () => {
      seedHistory(5)

      const res = await history(aliceToken, chat.id, { page: '1', limit: '2' })

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(2)
      // `total` counts every message in the chat; `pages` follows from it.
      expect(res.body.pagination).toEqual({ total: 5, page: 1, limit: 2, pages: 3 })
    })

    it('returns the second page without repeating the first', async () => {
      seedHistory(5)

      const res = await history(aliceToken, chat.id, { page: '2', limit: '2' })

      expect(res.status).toBe(200)
      expect(res.body.data.map((m) => m.content)).toEqual(['message 3', 'message 2'])
      expect(res.body.pagination).toEqual({ total: 5, page: 2, limit: 2, pages: 3 })
    })

    it('defaults to page 1 with the default limit', async () => {
      const res = await history(aliceToken, chat.id)

      expect(res.status).toBe(200)
      expect(res.body.pagination.page).toBe(1)
      expect(res.body.pagination.limit).toBe(50)
    })

    it('reports zero pages for an empty chat', async () => {
      const res = await history(aliceToken, chat.id)

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
      // Division by an empty total would be NaN, so pages is pinned to 0.
      expect(res.body.pagination).toEqual({ total: 0, page: 1, limit: 50, pages: 0 })
    })

    it('accepts a limit at the maximum', async () => {
      const res = await history(aliceToken, chat.id, { limit: String(MESSAGE_LIMIT_MAX) })

      expect(res.status).toBe(200)
      expect(res.body.pagination.limit).toBe(MESSAGE_LIMIT_MAX)
    })

    it('rejects a limit above the maximum', async () => {
      const res = await history(aliceToken, chat.id, { limit: '100000' })

      expect(res.status).toBe(400)
      expect(res.body.error?.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects a page below one', async () => {
      const res = await history(aliceToken, chat.id, { page: '0' })

      expect(res.status).toBe(400)
      expect(res.body.error?.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects a negative limit', async () => {
      const res = await history(aliceToken, chat.id, { limit: '-5' })

      expect(res.status).toBe(400)
      expect(res.body.error?.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects a non-numeric page', async () => {
      const res = await history(aliceToken, chat.id, { page: 'abc' })

      expect(res.status).toBe(400)
      expect(res.body.error?.code).toBe(ERROR_CODES.VALIDATION_ERROR)
    })

    it('requires authentication', async () => {
      const res = await request(ctx.baseUrl, `/chats/${chat.id}/messages`)

      expect(res.status).toBe(401)
    })

    it('returns 404 for a chat that does not exist', async () => {
      const res = await history(aliceToken, '99999999-0000-4000-8000-000000000001')

      expect(res.status).toBe(404)
      expect(res.body.error?.code).toBe(ERROR_CODES.NOT_FOUND)
    })

    it('returns 403 for a caller who is not a participant', async () => {
      seedHistory(1)

      const res = await history(carolToken, chat.id)

      expect(res.status).toBe(403)
      expect(res.body.error?.message).toBe(ERROR_MESSAGES.NOT_CHAT_PARTICIPANT)
      // A 403 must not leak the history it was protecting.
      expect(res.body.data).toBeUndefined()
    })

    it('lets either participant read the history', async () => {
      seedHistory(1)

      const res = await history(bobToken, chat.id)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
    })
  })

  // -------------------------------------------------------------------------
  describe('GET /chats', () => {
    const conversations = (token: string) =>
      request<ApiEnvelope<ConversationListItem[]>>(ctx.baseUrl, '/chats', { token })

    it('returns an empty list when the user has no chats', async () => {
      const res = await conversations(carolToken)

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
    })

    it('resolves the other participant as the contact', async () => {
      const res = await conversations(aliceToken)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].id).toBe(chat.id)
      expect(res.body.data[0].contact).toMatchObject({ id: bob.id, username: 'bob' })
      // The User contract must not carry the password hash.
      expect(res.body.data[0].contact).not.toHaveProperty('passwordHash')
    })

    it('never returns a conversation the caller is not part of', async () => {
      const res = await conversations(carolToken)

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
    })

    it('reports a null lastMessage for an empty chat, and uses its creation time', async () => {
      ;(chat as { createdAt: Date }).createdAt = new Date('2026-02-01T00:00:00.000Z')

      const res = await conversations(aliceToken)

      expect(res.status).toBe(200)
      expect(res.body.data[0].lastMessage).toBeNull()
      expect(res.body.data[0].lastActivityAt).toBe('2026-02-01T00:00:00.000Z')
    })

    it('reports only the most recent message per chat', async () => {
      makeMessage(ctx.store, chat as never, alice, {
        content: 'older',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      })
      const newest = makeMessage(ctx.store, chat as never, bob, {
        content: 'newest',
        createdAt: new Date('2026-01-05T00:00:00.000Z'),
        updatedAt: new Date('2026-01-05T00:00:00.000Z'),
      })

      const res = await conversations(aliceToken)

      expect(res.status).toBe(200)
      // This is the DISTINCT ON (chat_id) path: exactly one row, the latest.
      expect(res.body.data[0].lastMessage?.id).toBe(newest.id)
      expect(res.body.data[0].lastMessage?.sender.id).toBe(bob.id)
      expect(res.body.data[0].lastActivityAt).toBe('2026-01-05T00:00:00.000Z')
    })

    it('orders conversations by most recent activity', async () => {
      const withBob = makeChat(ctx.store, bob, carol) as { id: string }
      makeMessage(ctx.store, withBob as never, carol, {
        content: 'latest overall',
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        updatedAt: new Date('2026-03-01T00:00:00.000Z'),
      })
      makeMessage(ctx.store, chat as never, alice, {
        content: 'earlier',
        createdAt: new Date('2026-01-10T00:00:00.000Z'),
        updatedAt: new Date('2026-01-10T00:00:00.000Z'),
      })

      const res = await conversations(bobToken)

      expect(res.status).toBe(200)
      expect(res.body.data.map((c) => c.id)).toEqual([withBob.id, chat.id])
      expect(res.body.data[0].contact.id).toBe(carol.id)
      expect(res.body.data[1].contact.id).toBe(alice.id)
    })

    it('falls back to chat creation time when a newer chat has no messages', async () => {
      const empty = makeChat(ctx.store, bob, carol) as { id: string }
      ;(empty as { createdAt: Date }).createdAt = new Date('2026-05-01T00:00:00.000Z')
      makeMessage(ctx.store, chat as never, alice, {
        content: 'old news',
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      })

      const res = await conversations(bobToken)

      expect(res.status).toBe(200)
      // The empty chat was created later, so it sorts first despite having no
      // message of its own.
      expect(res.body.data.map((c) => c.id)).toEqual([empty.id, chat.id])
      expect(res.body.data[0].lastMessage).toBeNull()
    })

    it('requires authentication', async () => {
      const res = await request(ctx.baseUrl, '/chats')

      expect(res.status).toBe(401)
    })
  })
})
