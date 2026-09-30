import { ERROR_CODES, ERROR_MESSAGES } from '@email-chat-pro/constants'
import {
  createE2EApp,
  loginAs,
  makeContactRequest,
  makeUser,
  request,
  type ApiEnvelope,
  type ApiErrorEnvelope,
  type E2EContext,
  type TestUser,
} from './e2e-app'

/**
 * Contacts and authorization integration (P2, Step 6) — user search, the
 * contact-request lifecycle, and the ownership rules that guard it, all over
 * real HTTP against the real guard, controller, ValidationPipe and service.
 *
 * The three authorization decisions this file exists to pin down:
 *   1. the sender of a request is derived from the JWT, never from the body;
 *   2. only the request's receiver may accept or decline it;
 *   3. a contact relationship is mutual once accepted, in either direction.
 */
interface ContactRequestContract {
  id: string
  senderId: string
  receiverId: string
  status: string
  createdAt: string
  updatedAt: string
}

interface UserContract {
  id: string
  email: string
  username: string | null
}

describe('contacts (e2e)', () => {
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
  let aliceToken: string
  let bobToken: string

  beforeEach(async () => {
    alice = makeUser(ctx.store, { email: 'alice@example.com', username: 'alice' })
    bob = makeUser(ctx.store, { email: 'bob@example.com', username: 'bob' })
    aliceToken = await loginAs(ctx.baseUrl, alice.email)
    bobToken = await loginAs(ctx.baseUrl, bob.email)
  })

  const sendRequest = (token: string, receiverId: string) =>
    request<ApiEnvelope<ContactRequestContract>>(ctx.baseUrl, '/contacts/requests', {
      method: 'POST',
      token,
      body: { receiverId },
    })

  const respond = (token: string, requestId: string, status: string) =>
    request<ApiEnvelope<ContactRequestContract>>(ctx.baseUrl, `/contacts/requests/${requestId}`, {
      method: 'PATCH',
      token,
      body: { status },
    })

  const getContacts = (token: string) =>
    request<ApiEnvelope<UserContract[]>>(ctx.baseUrl, '/contacts', { token })

  const getIncoming = (token: string) =>
    request<ApiEnvelope<ContactRequestContract[]>>(ctx.baseUrl, '/contacts/requests/incoming', {
      token,
    })

  // -------------------------------------------------------------------------
  describe('GET /users/search', () => {
    it('returns matches and never includes the caller', async () => {
      const res = await request<ApiEnvelope<UserContract[]>>(ctx.baseUrl, '/users/search', {
        token: aliceToken,
        query: { q: 'bob@example.com' },
      })

      expect(res.status).toBe(200)
      const ids = res.body.data.map((u) => u.id)
      expect(ids).toEqual([bob.id])
      // P1-4: the caller's own exclusion is applied on both `where` branches.
      expect(ids).not.toContain(alice.id)
    })

    it('matches usernames partially and case-insensitively', async () => {
      const res = await request<ApiEnvelope<UserContract[]>>(ctx.baseUrl, '/users/search', {
        token: aliceToken,
        query: { q: 'BO' },
      })

      expect(res.status).toBe(200)
      expect(res.body.data.map((u) => u.id)).toEqual([bob.id])
    })

    it('does not treat LIKE wildcards in the query as wildcards', async () => {
      const res = await request<ApiEnvelope<UserContract[]>>(ctx.baseUrl, '/users/search', {
        token: aliceToken,
        query: { q: '%' },
      })

      expect(res.status).toBe(200)
      // `%` is escaped by the service, so it matches no stored username.
      expect(res.body.data).toEqual([])
    })

    it('excludes deleted and inactive users', async () => {
      const gone = makeUser(ctx.store, { email: 'gone@example.com', deletedAt: new Date() })
      const off = makeUser(ctx.store, { email: 'off@example.com', isActive: false })

      const res = await request<ApiEnvelope<UserContract[]>>(ctx.baseUrl, '/users/search', {
        token: aliceToken,
        // The email branch is an EXACT match (`LOWER(email) = LOWER(:email)`),
        // so a shared domain is not enough to make bob a candidate — the point
        // here is that both filtered accounts drop out of his result, not that
        // the domain matches them.
        query: { q: 'bob@example.com' },
      })

      expect(res.status).toBe(200)
      const ids = res.body.data.map((u) => u.id)
      expect(ids).toEqual([bob.id])
      expect(ids).not.toContain(gone.id)
      expect(ids).not.toContain(off.id)
    })

    it('excludes deleted and inactive users from a partial username match too', async () => {
      const gone = makeUser(ctx.store, { username: 'gone', deletedAt: new Date() })
      const off = makeUser(ctx.store, { username: 'offline', isActive: false })

      const res = await request<ApiEnvelope<UserContract[]>>(ctx.baseUrl, '/users/search', {
        token: aliceToken,
        // The LIKE branch is a partial match, so `o` reaches bob, gone and off.
        query: { q: 'o' },
      })

      expect(res.status).toBe(200)
      const ids = res.body.data.map((u) => u.id)
      expect(ids).toEqual([bob.id])
      expect(ids).not.toContain(gone.id)
      expect(ids).not.toContain(off.id)
    })

    it('never returns a password hash', async () => {
      const res = await request<ApiEnvelope<UserContract[]>>(ctx.baseUrl, '/users/search', {
        token: aliceToken,
        query: { q: 'bob' },
      })

      expect(res.status).toBe(200)
      expect(JSON.stringify(res.body)).not.toContain('passwordHash')
    })

    it('rejects a query longer than the documented maximum with 400', async () => {
      const res = await request(ctx.baseUrl, '/users/search', {
        token: aliceToken,
        query: { q: 'a'.repeat(101) },
      })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })

    it('rejects an empty query with 400', async () => {
      const res = await request(ctx.baseUrl, '/users/search', {
        token: aliceToken,
        query: { q: '' },
      })

      expect(res.status).toBe(400)
    })

    it('requires authentication', async () => {
      const res = await request(ctx.baseUrl, '/users/search', { query: { q: 'bob' } })

      expect(res.status).toBe(401)
      expect((res.body as ApiErrorEnvelope).error.code).toBe(ERROR_CODES.UNAUTHORIZED)
    })
  })

  // -------------------------------------------------------------------------
  describe('POST /contacts/requests', () => {
    it('creates a pending request with 201 and the standard envelope', async () => {
      const res = await sendRequest(aliceToken, bob.id)
      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toMatchObject({
        senderId: alice.id,
        receiverId: bob.id,
        status: 'pending',
      })
      expect(typeof res.body.data.id).toBe('string')
    })

    it('takes the sender from the JWT, not from the body', async () => {
      // `senderId` is not a property of the DTO, so with `forbidNonWhitelisted`
      // it is rejected outright rather than silently ignored.
      const res = await request<ApiEnvelope<ContactRequestContract>>(
        ctx.baseUrl,
        '/contacts/requests',
        {
          method: 'POST',
          token: aliceToken,
          body: { receiverId: bob.id, senderId: alice.id },
        },
      )

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(ctx.store.contactRequests.size).toBe(0)
    })

    it('returns the full user objects for sender and receiver', async () => {
      const res = await sendRequest(aliceToken, bob.id)

      const data = res.body.data as unknown as {
        sender: UserContract
        receiver: UserContract
      }
      expect(data.sender.id).toBe(alice.id)
      expect(data.receiver.id).toBe(bob.id)
      // The shared User contract never carries the hash.
      expect(JSON.stringify(res.body)).not.toContain('passwordHash')
    })

    it('rejects a self-request with 400', async () => {
      const res = await sendRequest(aliceToken, alice.id)

      expect(res.status).toBe(400)
      expect((res.body as unknown as ApiErrorEnvelope).error).toEqual({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: ERROR_MESSAGES.CONTACT_REQUEST_SELF_NOT_ALLOWED,
      })
      expect(ctx.store.contactRequests.size).toBe(0)
    })

    it('returns 404 for an unknown receiver', async () => {
      const res = await sendRequest(aliceToken, '99999999-9999-4999-8999-999999999999')

      expect(res.status).toBe(404)
      expect((res.body as unknown as ApiErrorEnvelope).error.message).toBe(
        ERROR_MESSAGES.CONTACT_REQUEST_RECEIVER_NOT_FOUND,
      )
    })

    it('returns 404 for a soft-deleted receiver', async () => {
      const gone = makeUser(ctx.store, { email: 'gone@example.com', deletedAt: new Date() })

      const res = await sendRequest(aliceToken, gone.id)

      expect(res.status).toBe(404)
    })

    it('returns 404 for an inactive receiver', async () => {
      const inactive = makeUser(ctx.store, { email: 'off@example.com', isActive: false })

      const res = await sendRequest(aliceToken, inactive.id)

      expect(res.status).toBe(404)
    })

    it('returns 409 for a duplicate pending request', async () => {
      await sendRequest(aliceToken, bob.id)

      const res = await sendRequest(aliceToken, bob.id)

      expect(res.status).toBe(409)
      expect((res.body as unknown as ApiErrorEnvelope).error).toEqual({
        code: ERROR_CODES.CONFLICT,
        message: ERROR_MESSAGES.CONTACT_REQUEST_DUPLICATE,
      })
      expect(ctx.store.contactRequests.size).toBe(1)
    })

    it('reactivates a declined request to pending instead of creating a second one', async () => {
      const declined = makeContactRequest(ctx.store, alice, bob, 'declined')

      const res = await sendRequest(aliceToken, bob.id)

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBe(declined.id)
      expect(res.body.data.status).toBe('pending')
      // The existing row is updated in place, not duplicated.
      expect(ctx.store.contactRequests.size).toBe(1)
      expect(ctx.store.contactRequests.get(declined.id as string)?.status).toBe('pending')
    })

    it('allows a request in the opposite direction — the unique pair is directed', async () => {
      // `contact_requests` is one-directional and its UNIQUE constraint is on
      // (sender_id, receiver_id), so bob's existing request to alice does not
      // block alice from sending her own.
      makeContactRequest(ctx.store, bob, alice, 'accepted')

      const res = await sendRequest(aliceToken, bob.id)

      expect(res.status).toBe(201)
      expect(ctx.store.contactRequests.size).toBe(2)
    })

    it('rejects a non-UUID receiverId with 400 before the service runs', async () => {
      const res = await sendRequest(aliceToken, 'not-a-uuid')

      expect(res.status).toBe(400)
      expect(ctx.store.contactRequests.size).toBe(0)
    })

    it('requires authentication', async () => {
      const res = await request(ctx.baseUrl, '/contacts/requests', {
        method: 'POST',
        body: { receiverId: bob.id },
      })

      expect(res.status).toBe(401)
      expect(ctx.store.contactRequests.size).toBe(0)
    })
  })

  // -------------------------------------------------------------------------
  describe('GET /contacts/requests/incoming', () => {
    it('returns only the caller’s own pending requests, newest first', async () => {
      const carol = makeUser(ctx.store, { email: 'carol@example.com', username: 'carol' })
      const older = makeContactRequest(ctx.store, bob, alice, 'pending')
      const newer = makeContactRequest(ctx.store, carol, alice, 'pending')
      // Outgoing for alice, so it is not incoming.
      const outgoing = makeContactRequest(ctx.store, alice, bob, 'pending')
      // Addressed to alice, but already answered.
      const declined = makeContactRequest(ctx.store, bob, alice, 'declined')

      // `makeContactRequest` stamps `new Date()`, and the DESC ordering assertion
      // below is only meaningful if the two rows differ, so the timestamps are
      // set explicitly rather than left to whichever millisecond they landed in.
      older.createdAt = new Date('2026-01-01T00:00:00.000Z')
      newer.createdAt = new Date('2026-01-02T00:00:00.000Z')

      const res = await getIncoming(aliceToken)

      expect(res.status).toBe(200)
      const ids = res.body.data.map((r) => r.id)
      // Exactly the two pending rows addressed to alice.
      expect(ids).toEqual([newer.id, older.id])
      expect(ids).not.toContain(outgoing.id)
      expect(ids).not.toContain(declined.id)
      // Both are addressed to alice, from bob and carol respectively.
      expect(res.body.data.every((r) => r.receiverId === alice.id)).toBe(true)
    })

    it('returns an empty array when there is nothing pending', async () => {
      const res = await getIncoming(aliceToken)

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
    })

    it('never returns another user’s requests to the wrong caller', async () => {
      makeContactRequest(ctx.store, bob, alice, 'pending')

      const res = await getIncoming(bobToken)

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
    })
  })

  // -------------------------------------------------------------------------
  describe('PATCH /contacts/requests/:requestId', () => {
    it('accepts a request and creates the one-to-one chat for the pair', async () => {
      const pending = makeContactRequest(ctx.store, alice, bob, 'pending')

      const res = await respond(bobToken, pending.id as string, 'accepted')

      expect(res.status).toBe(200)
      expect(res.body.data).toMatchObject({
        id: pending.id,
        status: 'accepted',
        senderId: alice.id,
        receiverId: bob.id,
      })
      expect(ctx.store.contactRequests.get(pending.id as string)?.status).toBe('accepted')
      // Chat creation happens inside the same transaction as the status write.
      const chats = [...ctx.store.chats.values()]
      expect(chats).toHaveLength(1)
      expect([chats[0].userAId, chats[0].userBId].sort()).toEqual([alice.id, bob.id].sort())
    })

    it('normalizes the participant pair, so the chat is the same in either direction', async () => {
      // Deterministic: the lower id is always userA, so both accept paths
      // produce one identical row and the unique constraint is never hit.
      const [low, high] = [alice.id, bob.id].sort()
      const pending = makeContactRequest(ctx.store, bob, alice, 'pending')

      await respond(aliceToken, pending.id as string, 'accepted')

      const chat = [...ctx.store.chats.values()][0]
      expect(chat.userAId).toBe(low)
      expect(chat.userBId).toBe(high)
    })

    it('does not create a second chat when one already exists for the pair', async () => {
      const existing = {
        id: '20000000-0000-4000-8000-00000000dead',
        userAId: alice.id,
        userBId: bob.id,
        createdAt: new Date(),
      }
      ctx.store.chats.set(existing.id, existing)
      const pending = makeContactRequest(ctx.store, alice, bob, 'pending')

      const res = await respond(bobToken, pending.id as string, 'accepted')

      expect(res.status).toBe(200)
      expect(ctx.store.chats.size).toBe(1)
      expect(ctx.store.chats.has(existing.id)).toBe(true)
    })

    it('declines a request without creating a chat', async () => {
      const pending = makeContactRequest(ctx.store, alice, bob, 'pending')

      const res = await respond(bobToken, pending.id as string, 'declined')

      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('declined')
      expect(ctx.store.chats.size).toBe(0)
    })

    it('refuses the sender of the request with 403', async () => {
      const pending = makeContactRequest(ctx.store, alice, bob, 'pending')

      const res = await respond(aliceToken, pending.id as string, 'accepted')

      expect(res.status).toBe(403)
      expect((res.body as unknown as ApiErrorEnvelope).error).toEqual({
        code: ERROR_CODES.FORBIDDEN,
        message: ERROR_MESSAGES.CONTACT_REQUEST_NOT_RECEIVER,
      })
      // Neither the status nor a chat was written.
      expect(ctx.store.contactRequests.get(pending.id as string)?.status).toBe('pending')
      expect(ctx.store.chats.size).toBe(0)
    })

    it('refuses an uninvolved user with 403', async () => {
      const mallory = makeUser(ctx.store, { email: 'mallory@example.com' })
      const malloryToken = await loginAs(ctx.baseUrl, mallory.email)
      const pending = makeContactRequest(ctx.store, alice, bob, 'pending')

      const res = await respond(malloryToken, pending.id as string, 'accepted')

      expect(res.status).toBe(403)
      expect(ctx.store.chats.size).toBe(0)
    })

    it('returns 404 for an unknown request id', async () => {
      const res = await respond(
        bobToken,
        '99999999-9999-4999-8999-999999999999',
        'accepted',
      )

      expect(res.status).toBe(404)
      expect((res.body as unknown as ApiErrorEnvelope).error.message).toBe(
        ERROR_MESSAGES.CONTACT_REQUEST_NOT_FOUND,
      )
    })

    it('returns 409 when the request was already responded to', async () => {
      const accepted = makeContactRequest(ctx.store, alice, bob, 'accepted')

      const res = await respond(bobToken, accepted.id as string, 'declined')

      expect(res.status).toBe(409)
      expect((res.body as unknown as ApiErrorEnvelope).error.message).toBe(
        ERROR_MESSAGES.CONTACT_REQUEST_ALREADY_RESPONDED,
      )
    })

    it('returns 409 rather than re-accepting the same request', async () => {
      const pending = makeContactRequest(ctx.store, alice, bob, 'pending')
      await respond(bobToken, pending.id as string, 'accepted')

      const res = await respond(bobToken, pending.id as string, 'accepted')

      expect(res.status).toBe(409)
      // The accept already created the chat; the second attempt adds nothing.
      expect(ctx.store.chats.size).toBe(1)
    })

    it('rejects a status outside accepted/declined with 400', async () => {
      const pending = makeContactRequest(ctx.store, alice, bob, 'pending')

      const res = await respond(bobToken, pending.id as string, 'pending')

      expect(res.status).toBe(400)
      expect(ctx.store.contactRequests.get(pending.id as string)?.status).toBe('pending')
    })

    it('rejects a non-UUID request id with 400', async () => {
      const res = await respond(bobToken, 'not-a-uuid', 'accepted')

      expect(res.status).toBe(400)
    })

    it('requires authentication', async () => {
      const pending = makeContactRequest(ctx.store, alice, bob, 'pending')

      const res = await request(ctx.baseUrl, `/contacts/requests/${pending.id}`, {
        method: 'PATCH',
        body: { status: 'accepted' },
      })

      expect(res.status).toBe(401)
      expect(ctx.store.contactRequests.get(pending.id as string)?.status).toBe('pending')
    })
  })

  // -------------------------------------------------------------------------
  describe('GET /contacts', () => {
    it('returns an empty list before any request is accepted', async () => {
      const res = await getContacts(aliceToken)

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
    })

    it('makes acceptance mutual — both sides see each other', async () => {
      makeContactRequest(ctx.store, alice, bob, 'accepted')

      const forReceiver = await getContacts(bobToken)
      const forSender = await getContacts(aliceToken)

      expect(forReceiver.body.data.map((u) => u.id)).toEqual([alice.id])
      expect(forSender.body.data.map((u) => u.id)).toEqual([bob.id])
    })

    it('returns the other participant’s full user contract without the hash', async () => {
      makeContactRequest(ctx.store, alice, bob, 'accepted')

      const res = await getContacts(aliceToken)

      expect(res.body.data[0]).toMatchObject({
        id: bob.id,
        email: 'bob@example.com',
        username: 'bob',
      })
      expect(JSON.stringify(res.body)).not.toContain('passwordHash')
    })

    it('deduplicates when a pair has accepted requests in both directions', async () => {
      makeContactRequest(ctx.store, alice, bob, 'accepted')
      makeContactRequest(ctx.store, bob, alice, 'accepted')

      const res = await getContacts(aliceToken)

      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].id).toBe(bob.id)
    })

    it('excludes pending and declined requests', async () => {
      const carol = makeUser(ctx.store, { email: 'carol@example.com', username: 'carol' })
      makeContactRequest(ctx.store, carol, alice, 'pending')
      makeContactRequest(ctx.store, carol, alice, 'declined')
      makeContactRequest(ctx.store, carol, alice, 'accepted')

      const res = await getContacts(aliceToken)

      expect(res.body.data.map((u) => u.id)).toEqual([carol.id])
    })

    it('sorts contacts by username', async () => {
      const zoe = makeUser(ctx.store, { email: 'zoe@example.com', username: 'zoe' })
      const carl = makeUser(ctx.store, { email: 'carl@example.com', username: 'carl' })
      makeContactRequest(ctx.store, zoe, alice, 'accepted')
      makeContactRequest(ctx.store, carl, alice, 'accepted')

      const res = await getContacts(aliceToken)

      expect(res.body.data.map((u) => u.username)).toEqual(['carl', 'zoe'])
    })

    it('never returns the caller in their own contact list', async () => {
      makeContactRequest(ctx.store, bob, alice, 'accepted')

      const res = await getContacts(aliceToken)

      expect(res.body.data.map((u) => u.id)).not.toContain(alice.id)
    })

    it('requires authentication', async () => {
      const res = await request(ctx.baseUrl, '/contacts')

      expect(res.status).toBe(401)
    })
  })
})
