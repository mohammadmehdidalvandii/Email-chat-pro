import { Test } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ERROR_CODES, ERROR_MESSAGES } from '@email-chat-pro/constants'
import { WS_SERVER_EVENTS } from '@email-chat-pro/types'
import type { MessageSentEvent } from '@email-chat-pro/types'
import type { Server, Socket } from 'socket.io'
import { User } from '../auth/entities/user.entity'
import { ChatsService } from '../chats/chats.service'
import { Chat } from '../chats/entities/chat.entity'
import { ChatGateway } from './websocket.gateway'

// @nestjs/jwt v12 ships ESM-only (type: module), which the CJS ts-jest pipeline
// cannot require. JwtService is mocked here; the real module is exercised by
// live verification.
jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}))

describe('ChatGateway', () => {
  let gateway: ChatGateway

  const jwtService = {
    verify: jest.fn(),
  }

  const usersRepository = {
    findOne: jest.fn(),
  }

  const chatsService = {
    findById: jest.fn(),
  }

  const server = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  }

  const baseUser: User = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'alice@example.com',
    passwordHash: 'hashed',
    isVerified: true,
    verificationTokenHash: null,
    verificationTokenExpiresAt: null,
    verifiedAt: null,
    username: 'alice',
    fullName: 'Alice',
    bio: null,
    avatarUrl: null,
    profileCompleted: true,
    lastSeenAt: new Date('2026-01-01T00:00:00Z'),
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  }

  const baseChat: Chat = {
    id: 'chat-1',
    userAId: '11111111-1111-1111-1111-111111111111',
    userBId: '22222222-2222-2222-2222-222222222222',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  }

  /**
   * Builds a minimal mock Socket with jest.spyOn-backed emit/join/leave.
   * The loose override type sidesteps the full Handshake shape (only the
   * handshake.auth.token field is read by the gateway).
   */
  function makeClient(
    overrides: { id?: string; handshake?: { auth?: { token?: string } } } = {},
  ): Socket {
    const client = {
      id: 'socket-1',
      handshake: { auth: {} },
      emit: jest.fn(),
      disconnect: jest.fn(),
      join: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn().mockResolvedValue(undefined),
    }
    return Object.assign(client, overrides) as unknown as Socket
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: JwtService, useValue: jwtService },
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: ChatsService, useValue: chatsService },
      ],
    }).compile()

    gateway = moduleRef.get(ChatGateway)
    gateway.server = server as unknown as Server
  })

  describe('handleConnection', () => {
    it('rejects a connection with no token', async () => {
      const client = makeClient()

      await gateway.handleConnection(client)

      expect(client.emit).toHaveBeenCalledWith(WS_SERVER_EVENTS.ERROR, {
        code: ERROR_CODES.UNAUTHORIZED,
        message: ERROR_MESSAGES.WS_UNAUTHORIZED,
      })
      expect(client.disconnect).toHaveBeenCalledWith(true)
      expect(jwtService.verify).not.toHaveBeenCalled()
    })

    it('rejects a connection with an invalid token', async () => {
      const client = makeClient()
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid')
      })

      await gateway.handleConnection(client)

      expect(client.emit).toHaveBeenCalledWith(WS_SERVER_EVENTS.ERROR, {
        code: ERROR_CODES.UNAUTHORIZED,
        message: ERROR_MESSAGES.WS_UNAUTHORIZED,
      })
      expect(client.disconnect).toHaveBeenCalledWith(true)
    })

    it('rejects a connection whose user does not exist', async () => {
      const client = makeClient({ handshake: { auth: { token: 'valid-token' } } })
      jwtService.verify.mockReturnValue({ sub: baseUser.id, email: baseUser.email })
      usersRepository.findOne.mockResolvedValue(null)

      await gateway.handleConnection(client)

      expect(client.emit).toHaveBeenCalledWith(WS_SERVER_EVENTS.ERROR, {
        code: ERROR_CODES.UNAUTHORIZED,
        message: ERROR_MESSAGES.WS_UNAUTHORIZED,
      })
      expect(client.disconnect).toHaveBeenCalledWith(true)
    })

    it('rejects a connection for an inactive user', async () => {
      const client = makeClient({ handshake: { auth: { token: 'valid-token' } } })
      jwtService.verify.mockReturnValue({ sub: baseUser.id, email: baseUser.email })
      usersRepository.findOne.mockResolvedValue({ ...baseUser, isActive: false })

      await gateway.handleConnection(client)

      expect(client.emit).toHaveBeenCalledWith(WS_SERVER_EVENTS.ERROR, {
        code: ERROR_CODES.UNAUTHORIZED,
        message: ERROR_MESSAGES.WS_UNAUTHORIZED,
      })
      expect(client.disconnect).toHaveBeenCalledWith(true)
    })

    it('accepts a valid authenticated connection', async () => {
      const client = makeClient({ handshake: { auth: { token: 'valid-token' } } })
      jwtService.verify.mockReturnValue({ sub: baseUser.id, email: baseUser.email })
      usersRepository.findOne.mockResolvedValue(baseUser)

      await gateway.handleConnection(client)

      expect(client.disconnect).not.toHaveBeenCalled()
      // The user must be stored in the internal connected-users map.
      expect(gateway['connectedUsers'].get('socket-1')).toEqual(baseUser)
    })
  })

  describe('handleDisconnect', () => {
    it('removes the client from the connected-users map', async () => {
      const client = makeClient({ handshake: { auth: { token: 'valid-token' } } })
      jwtService.verify.mockReturnValue({ sub: baseUser.id, email: baseUser.email })
      usersRepository.findOne.mockResolvedValue(baseUser)
      await gateway.handleConnection(client)
      expect(gateway['connectedUsers'].has('socket-1')).toBe(true)

      gateway.handleDisconnect(client)

      expect(gateway['connectedUsers'].has('socket-1')).toBe(false)
    })
  })

  describe('handleJoinChat', () => {
    it('returns unauthorized when the client is not authenticated', async () => {
      const client = makeClient()
      gateway['connectedUsers'].clear()

      const result = await gateway.handleJoinChat(client, { chatId: 'chat-1' })

      expect(result).toEqual({
        event: WS_SERVER_EVENTS.ERROR,
        data: { code: ERROR_CODES.UNAUTHORIZED, message: ERROR_MESSAGES.WS_UNAUTHORIZED },
      })
      expect(client.join).not.toHaveBeenCalled()
    })

    it('authorizes via handshake token when the map entry is not yet populated (connect → join race)', async () => {
      // Simulate a client that emits chat:join before handleConnection's async
      // DB lookup has populated connectedUsers.
      const client = makeClient({ handshake: { auth: { token: 'valid-token' } } })
      gateway['connectedUsers'].clear()
      jwtService.verify.mockReturnValue({ sub: baseUser.id, email: baseUser.email })
      usersRepository.findOne.mockResolvedValue(baseUser)
      chatsService.findById.mockResolvedValue(baseChat)

      const result = await gateway.handleJoinChat(client, { chatId: 'chat-1' })

      expect(jwtService.verify).toHaveBeenCalledWith('valid-token')
      expect(usersRepository.findOne).toHaveBeenCalledWith({ where: { id: baseUser.id } })
      expect(client.join).toHaveBeenCalledWith('chat:chat-1')
      expect(result).toEqual({
        event: WS_SERVER_EVENTS.CHAT_JOINED,
        data: { chatId: 'chat-1' },
      })
      // The resolved user is cached for subsequent lookups.
      expect(gateway['connectedUsers'].get(client.id)).toEqual(baseUser)
    })

    it('returns not-found when the chat does not exist', async () => {
      const client = makeClient()
      gateway['connectedUsers'].set(client.id, baseUser)
      chatsService.findById.mockResolvedValue(null)

      const result = await gateway.handleJoinChat(client, { chatId: 'chat-1' })

      expect(result).toEqual({
        event: WS_SERVER_EVENTS.ERROR,
        data: { code: ERROR_CODES.NOT_FOUND, message: ERROR_MESSAGES.CHAT_NOT_FOUND },
      })
      expect(client.join).not.toHaveBeenCalled()
    })

    it('returns forbidden when the user is not a participant', async () => {
      const client = makeClient()
      gateway['connectedUsers'].set(client.id, baseUser)
      chatsService.findById.mockResolvedValue(baseChat)
      const nonParticipant = { ...baseUser, id: '00000000-0000-0000-0000-000000000000' }
      gateway['connectedUsers'].set(client.id, nonParticipant)

      const result = await gateway.handleJoinChat(client, { chatId: 'chat-1' })

      expect(result).toEqual({
        event: WS_SERVER_EVENTS.ERROR,
        data: { code: ERROR_CODES.FORBIDDEN, message: ERROR_MESSAGES.WS_CHAT_UNAUTHORIZED },
      })
      expect(client.join).not.toHaveBeenCalled()
    })

    it('joins the room for an authorized participant', async () => {
      const client = makeClient()
      gateway['connectedUsers'].set(client.id, baseUser)
      chatsService.findById.mockResolvedValue(baseChat)

      const result = await gateway.handleJoinChat(client, { chatId: 'chat-1' })

      expect(client.join).toHaveBeenCalledWith('chat:chat-1')
      expect(result).toEqual({
        event: WS_SERVER_EVENTS.CHAT_JOINED,
        data: { chatId: 'chat-1' },
      })
    })
  })

  describe('handleLeaveChat', () => {
    it('leaves the chat room', async () => {
      const client = makeClient()

      const result = await gateway.handleLeaveChat(client, { chatId: 'chat-1' })

      expect(client.leave).toHaveBeenCalledWith('chat:chat-1')
      expect(result).toEqual({
        event: WS_SERVER_EVENTS.CHAT_LEFT,
        data: { chatId: 'chat-1' },
      })
    })
  })

  describe('broadcastToChat', () => {
    it('emits message:received to the chat room with the persisted message', () => {
      const event: MessageSentEvent = {
        message: {
          id: 'msg-1',
          chatId: 'chat-1',
          senderId: baseUser.id,
          sender: {
            id: baseUser.id,
            email: baseUser.email,
            isVerified: true,
            isActive: true,
            profileCompleted: true,
            createdAt: baseUser.createdAt.toISOString(),
          },
          content: 'Hello!',
          messageType: 'text',
          mediaUrl: null,
          createdAt: '2026-06-01T00:00:00.000Z',
        },
        chatId: 'chat-1',
      }

      gateway.broadcastToChat('chat-1', event)

      expect(server.to).toHaveBeenCalledWith('chat:chat-1')
      expect(server.emit).toHaveBeenCalledWith(WS_SERVER_EVENTS.MESSAGE_RECEIVED, event)
    })
  })
})
