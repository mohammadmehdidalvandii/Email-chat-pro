import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ERROR_CODES, ERROR_MESSAGES } from '@email-chat-pro/constants'
import { AuthService } from '../auth/auth.service'
import { User } from '../auth/entities/user.entity'
import { ChatsService } from '../chats/chats.service'
import { Chat } from '../chats/entities/chat.entity'
import { ChatGateway } from '../websocket/websocket.gateway'
import { CreateMessageDto } from './dto/create-message.dto'
import { Message } from './entities/message.entity'
import { MessagesService } from './messages.service'

// @nestjs/jwt v12 ships ESM-only (type: module), which the CJS ts-jest pipeline
// cannot require. AuthService is imported at runtime by the service, so the
// issuer is mocked here; the real module is exercised by live verification.
jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}))

describe('MessagesService', () => {
  let service: MessagesService

  const repository = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
  }

  const authService = {
    toUserDto: jest.fn(),
  }

  const chatGateway = {
    broadcastToChat: jest.fn(),
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

  beforeEach(async () => {
    jest.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: getRepositoryToken(Message), useValue: repository },
        {
          provide: ChatsService,
          useValue: { findById: jest.fn() },
        },
        { provide: AuthService, useValue: authService },
        { provide: ChatGateway, useValue: chatGateway },
      ],
    }).compile()

    service = moduleRef.get(MessagesService)
  })

  /** Helper to get the mocked ChatsService from the module. */
  const chatsService = () => service['chatsService'] as unknown as { findById: jest.Mock }

  describe('sendMessage', () => {
    const dto: CreateMessageDto = {
      content: 'Hello!',
      messageType: 'text',
    }

    it('throws NotFoundException when the chat does not exist', async () => {
      chatsService().findById.mockResolvedValue(null)

      await expect(service.sendMessage(baseUser, 'chat-1', dto)).rejects.toMatchObject({
        status: 404,
        response: {
          code: ERROR_CODES.NOT_FOUND,
          message: ERROR_MESSAGES.CHAT_NOT_FOUND,
        },
      })
      expect(repository.create).not.toHaveBeenCalled()
    })

    it('throws ForbiddenException when the user is not a participant', async () => {
      chatsService().findById.mockResolvedValue(baseChat)

      await expect(
        service.sendMessage({ ...baseUser, id: 'not-a-participant' } as User, 'chat-1', dto),
      ).rejects.toMatchObject({
        status: 403,
        response: {
          code: ERROR_CODES.FORBIDDEN,
          message: ERROR_MESSAGES.NOT_CHAT_PARTICIPANT,
        },
      })
      expect(repository.create).not.toHaveBeenCalled()
    })

    it('allows the second participant (userB) to send a message', async () => {
      chatsService().findById.mockResolvedValue(baseChat)
      const userB = { ...baseUser, id: '22222222-2222-2222-2222-222222222222' }
      const messageEntity = {
        id: 'msg-1',
        chatId: 'chat-1',
        sender: userB,
        content: 'Hi there!',
        messageType: 'text',
        mediaUrl: null,
        createdAt: new Date('2026-06-01T00:00:00Z'),
      }
      repository.create.mockReturnValue(messageEntity)
      repository.save.mockResolvedValue(messageEntity)
      authService.toUserDto.mockReturnValue({
        id: userB.id,
        email: userB.email,
        isVerified: true,
        isActive: true,
        profileCompleted: true,
        createdAt: userB.createdAt.toISOString(),
      })

      const result = await service.sendMessage(userB, 'chat-1', dto)

      expect(result.senderId).toBe('22222222-2222-2222-2222-222222222222')
      expect(repository.save).toHaveBeenCalled()
    })

    it('throws BadRequestException when a text message includes a mediaUrl', async () => {
      chatsService().findById.mockResolvedValue(baseChat)

      await expect(
        service.sendMessage(baseUser, 'chat-1', {
          ...dto,
          mediaUrl: 'https://example.com/img.png',
        }),
      ).rejects.toMatchObject({
        status: 400,
        response: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: ERROR_MESSAGES.MESSAGE_MEDIA_NOT_ALLOWED,
        },
      })
      expect(repository.create).not.toHaveBeenCalled()
    })

    it('persists and returns the message with sender DTO mapping', async () => {
      chatsService().findById.mockResolvedValue(baseChat)
      const messageEntity = {
        id: 'msg-1',
        chatId: 'chat-1',
        sender: baseUser,
        content: 'Hello!',
        messageType: 'text',
        mediaUrl: null,
        createdAt: new Date('2026-06-01T00:00:00Z'),
      }
      repository.create.mockReturnValue(messageEntity)
      repository.save.mockResolvedValue(messageEntity)
      const senderDto = {
        id: baseUser.id,
        email: baseUser.email,
        isVerified: true,
        isActive: true,
        profileCompleted: true,
        createdAt: baseUser.createdAt.toISOString(),
      }
      authService.toUserDto.mockReturnValue(senderDto)

      const result = await service.sendMessage(baseUser, 'chat-1', dto)

      expect(repository.create).toHaveBeenCalledWith({
        chatId: 'chat-1',
        sender: baseUser,
        content: 'Hello!',
        messageType: 'text',
        mediaUrl: null,
      })
      expect(repository.save).toHaveBeenCalledWith(messageEntity)
      expect(result.id).toBe('msg-1')
      expect(result.chatId).toBe('chat-1')
      expect(result.senderId).toBe(baseUser.id)
      expect(result.sender).toEqual(senderDto)
      expect(result.content).toBe('Hello!')
      expect(result.messageType).toBe('text')
      expect(result.mediaUrl).toBeNull()
      expect(result.createdAt).toBe(messageEntity.createdAt.toISOString())
    })

    it('broadcasts the persisted message to the chat room via ChatGateway', async () => {
      chatsService().findById.mockResolvedValue(baseChat)
      const messageEntity = {
        id: 'msg-1',
        chatId: 'chat-1',
        sender: baseUser,
        content: 'Hello!',
        messageType: 'text',
        mediaUrl: null,
        createdAt: new Date('2026-06-01T00:00:00Z'),
      }
      repository.create.mockReturnValue(messageEntity)
      repository.save.mockResolvedValue(messageEntity)
      authService.toUserDto.mockReturnValue({ id: baseUser.id })

      const result = await service.sendMessage(baseUser, 'chat-1', dto)

      expect(chatGateway.broadcastToChat).toHaveBeenCalledTimes(1)
      expect(chatGateway.broadcastToChat).toHaveBeenCalledWith('chat-1', {
        message: result,
        chatId: 'chat-1',
      })
    })

    it('does not broadcast when the chat does not exist', async () => {
      chatsService().findById.mockResolvedValue(null)

      await expect(service.sendMessage(baseUser, 'chat-1', dto)).rejects.toMatchObject({
        status: 404,
      })
      expect(chatGateway.broadcastToChat).not.toHaveBeenCalled()
    })

    it('does not broadcast when the user is not a participant', async () => {
      chatsService().findById.mockResolvedValue(baseChat)

      await expect(
        service.sendMessage({ ...baseUser, id: 'not-a-participant' } as User, 'chat-1', dto),
      ).rejects.toMatchObject({ status: 403 })
      expect(chatGateway.broadcastToChat).not.toHaveBeenCalled()
    })
  })

  describe('getHistory', () => {
    const chatId = 'chat-1'

    it('throws NotFoundException when the chat does not exist', async () => {
      chatsService().findById.mockResolvedValue(null)

      await expect(service.getHistory(baseUser.id, chatId, 1, 50)).rejects.toMatchObject({
        status: 404,
        response: {
          code: ERROR_CODES.NOT_FOUND,
          message: ERROR_MESSAGES.CHAT_NOT_FOUND,
        },
      })
    })

    it('throws ForbiddenException when the user is not a participant', async () => {
      chatsService().findById.mockResolvedValue(baseChat)

      await expect(service.getHistory('not-a-participant', chatId, 1, 50)).rejects.toMatchObject({
        status: 403,
        response: {
          code: ERROR_CODES.FORBIDDEN,
          message: ERROR_MESSAGES.NOT_CHAT_PARTICIPANT,
        },
      })
    })

    it('returns paginated messages with total count', async () => {
      chatsService().findById.mockResolvedValue(baseChat)
      const senderDto = {
        id: baseUser.id,
        email: baseUser.email,
        isVerified: true,
        isActive: true,
        profileCompleted: true,
        createdAt: baseUser.createdAt.toISOString(),
      }
      authService.toUserDto.mockReturnValue(senderDto)
      const messageEntities = [
        {
          id: 'msg-2',
          chatId,
          sender: baseUser,
          content: 'Second',
          messageType: 'text',
          mediaUrl: null,
          createdAt: new Date('2026-06-01T01:00:00Z'),
        },
        {
          id: 'msg-1',
          chatId,
          sender: baseUser,
          content: 'First',
          messageType: 'text',
          mediaUrl: null,
          createdAt: new Date('2026-06-01T00:00:00Z'),
        },
      ]
      repository.findAndCount.mockResolvedValue([messageEntities, 2])

      const result = await service.getHistory(baseUser.id, chatId, 1, 50)

      expect(result.total).toBe(2)
      expect(result.data).toHaveLength(2)
      expect(result.data[0].id).toBe('msg-2')
      expect(result.data[1].id).toBe('msg-1')
      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: { chatId },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 50,
        relations: ['sender'],
      })
    })

    it('paginates correctly on page 2', async () => {
      chatsService().findById.mockResolvedValue(baseChat)
      authService.toUserDto.mockReturnValue({ id: baseUser.id })
      repository.findAndCount.mockResolvedValue([[], 12])

      await service.getHistory(baseUser.id, chatId, 2, 5)

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      )
    })

    it('returns empty data when no messages exist', async () => {
      chatsService().findById.mockResolvedValue(baseChat)
      repository.findAndCount.mockResolvedValue([[], 0])

      const result = await service.getHistory(baseUser.id, chatId, 1, 50)

      expect(result.data).toEqual([])
      expect(result.total).toBe(0)
    })
  })
})
