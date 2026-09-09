import type { Request } from 'express'
import { Test } from '@nestjs/testing'
import { AuthService } from '../auth/auth.service'
import { User } from '../auth/entities/user.entity'
import { MessagesController } from './messages.controller'
import { MessagesService } from './messages.service'

// @nestjs/jwt v12 ships ESM-only (type: module), which the CJS ts-jest pipeline
// cannot require. AuthService is imported at runtime by the controller, so the
// issuer is mocked here; the real module is exercised by live verification.
jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}))

/** Minimal authenticated request shaped like the route handler's req. */
const makeRequest = (user: unknown): Request & { user: User } =>
  ({ user }) as unknown as Request & { user: User }

describe('MessagesController', () => {
  let controller: MessagesController

  const messagesService = {
    sendMessage: jest.fn(),
    getHistory: jest.fn(),
  }
  const authService = {
    toUserDto: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [
        { provide: MessagesService, useValue: messagesService },
        { provide: AuthService, useValue: authService },
      ],
    }).compile()

    controller = moduleRef.get(MessagesController)
  })

  describe('sendMessage', () => {
    it('returns the created message in the ApiResponse envelope', async () => {
      const authenticatedUser = { id: 'uuid-1', email: 'user@example.com' }
      const messageDto = { chatId: 'chat-1', content: 'Hello!', messageType: 'text' as const }
      const messageContract = {
        id: 'msg-1',
        chatId: 'chat-1',
        senderId: 'uuid-1',
        sender: authenticatedUser,
        content: 'Hello!',
        messageType: 'text' as const,
        mediaUrl: null,
        createdAt: '2026-06-01T00:00:00.000Z',
      }

      messagesService.sendMessage.mockResolvedValue(messageContract)

      const response = await controller.sendMessage(
        makeRequest(authenticatedUser),
        'chat-1',
        messageDto,
      )

      expect(messagesService.sendMessage).toHaveBeenCalledWith(
        authenticatedUser,
        'chat-1',
        messageDto,
      )
      expect(response.success).toBe(true)
      expect(response.data).toEqual(messageContract)
      expect(response.timestamp).toEqual(expect.any(String))
      expect(response.error).toBeUndefined()
    })
  })

  describe('getHistory', () => {
    it('returns paginated messages in the PaginatedResponse envelope', async () => {
      const authenticatedUser = { id: 'uuid-1', email: 'user@example.com' }
      const messages = [
        {
          id: 'msg-2',
          chatId: 'chat-1',
          senderId: 'uuid-1',
          sender: authenticatedUser,
          content: 'Second',
          messageType: 'text' as const,
          mediaUrl: null,
          createdAt: '2026-06-01T01:00:00.000Z',
        },
        {
          id: 'msg-1',
          chatId: 'chat-1',
          senderId: 'uuid-1',
          sender: authenticatedUser,
          content: 'First',
          messageType: 'text' as const,
          mediaUrl: null,
          createdAt: '2026-06-01T00:00:00.000Z',
        },
      ]

      messagesService.getHistory.mockResolvedValue({ data: messages, total: 2 })

      const response = await controller.getHistory(makeRequest(authenticatedUser), 'chat-1', 1, 50)

      expect(messagesService.getHistory).toHaveBeenCalledWith('uuid-1', 'chat-1', 1, 50)
      expect(response.success).toBe(true)
      expect(response.data).toEqual(messages)
      expect(response.pagination).toEqual({ total: 2, page: 1, limit: 50, pages: 1 })
      expect(response.timestamp).toEqual(expect.any(String))
    })

    it('calculates pages correctly for multiple pages', async () => {
      const authenticatedUser = { id: 'uuid-1', email: 'user@example.com' }

      messagesService.getHistory.mockResolvedValue({ data: [], total: 12 })

      const response = await controller.getHistory(makeRequest(authenticatedUser), 'chat-1', 1, 5)

      expect(response.pagination).toEqual({ total: 12, page: 1, limit: 5, pages: 3 })
    })

    it('returns pages=0 when total is 0', async () => {
      const authenticatedUser = { id: 'uuid-1', email: 'user@example.com' }

      messagesService.getHistory.mockResolvedValue({ data: [], total: 0 })

      const response = await controller.getHistory(makeRequest(authenticatedUser), 'chat-1', 1, 50)

      expect(response.pagination).toEqual({ total: 0, page: 1, limit: 50, pages: 0 })
    })
  })
})
