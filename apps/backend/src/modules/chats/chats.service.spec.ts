import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { AuthService } from '../auth/auth.service'
import { User } from '../auth/entities/user.entity'
import { Message } from '../messages/entities/message.entity'
import { ChatsService } from './chats.service'
import { Chat } from './entities/chat.entity'

// @nestjs/jwt v12 ships ESM-only (type: module), which the CJS ts-jest pipeline
// cannot require. AuthService is imported at runtime by the service, so the
// issuer is mocked here; the real module is exercised by live verification.
jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}))

describe('ChatsService', () => {
  let service: ChatsService

  const chatsRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  }

  const usersRepository = {
    find: jest.fn(),
  }

  const messagesRepository = {
    createQueryBuilder: jest.fn(),
  }

  const authService = {
    toUserDto: jest.fn(),
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

  const userB: User = {
    ...baseUser,
    id: '22222222-2222-2222-2222-222222222222',
    email: 'bob@example.com',
    username: 'bob',
    fullName: 'Bob',
  }

  const baseChat: Chat = {
    id: 'chat-1',
    userAId: baseUser.id,
    userBId: userB.id,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      providers: [
        ChatsService,
        { provide: getRepositoryToken(Chat), useValue: chatsRepository },
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: getRepositoryToken(Message), useValue: messagesRepository },
        { provide: AuthService, useValue: authService },
      ],
    }).compile()

    service = moduleRef.get(ChatsService)
  })

  describe('findByParticipants', () => {
    it('normalizes the pair and queries with user_a < user_b ordering', async () => {
      chatsRepository.findOne.mockResolvedValue(baseChat)

      const result = await service.findByParticipants(
        '22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111',
      )

      expect(result).toBe(baseChat)
      expect(chatsRepository.findOne).toHaveBeenCalledWith({
        where: {
          userAId: '11111111-1111-1111-1111-111111111111',
          userBId: '22222222-2222-2222-2222-222222222222',
        },
      })
    })

    it('returns null when no chat exists between the pair', async () => {
      chatsRepository.findOne.mockResolvedValue(null)

      const result = await service.findByParticipants('a', 'b')

      expect(result).toBeNull()
    })

    it('resolves both (A,B) and (B,A) to the same normalized query', async () => {
      chatsRepository.findOne.mockResolvedValue(baseChat)

      await service.findByParticipants('a', 'b')
      const forwardCall = chatsRepository.findOne.mock.calls[0][0]

      chatsRepository.findOne.mockClear()

      await service.findByParticipants('b', 'a')
      const reverseCall = chatsRepository.findOne.mock.calls[0][0]

      expect(reverseCall).toEqual(forwardCall)
    })
  })

  describe('findById', () => {
    it('returns the chat when found', async () => {
      chatsRepository.findOne.mockResolvedValue(baseChat)

      const result = await service.findById('chat-1')

      expect(result).toBe(baseChat)
      expect(chatsRepository.findOne).toHaveBeenCalledWith({ where: { id: 'chat-1' } })
    })

    it('returns null when no chat exists with the given id', async () => {
      chatsRepository.findOne.mockResolvedValue(null)

      const result = await service.findById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('findUserConversations', () => {
    /**
     * Builds a chainable mock of the messages QueryBuilder ending in getMany().
     * The service builds the latest-message query with leftJoinAndSelect,
     * where, orderBy, addOrderBy, distinctOn, then getMany.
     */
    function mockLatestMessagesQuery(rows: unknown[]) {
      const builder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        distinctOn: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(rows),
      }
      messagesRepository.createQueryBuilder.mockReturnValue(builder)
      return builder
    }

    it('returns an empty list when the user has no chats', async () => {
      chatsRepository.find.mockResolvedValue([])

      const result = await service.findUserConversations(baseUser.id)

      expect(result).toEqual([])
      expect(usersRepository.find).not.toHaveBeenCalled()
      expect(messagesRepository.createQueryBuilder).not.toHaveBeenCalled()
    })

    it('resolves the other participant, latest message, and activity time', async () => {
      const messageEntity = {
        id: 'msg-2',
        chatId: 'chat-1',
        sender: userB,
        content: 'Hello!',
        messageType: 'text',
        mediaUrl: null,
        createdAt: new Date('2026-06-02T00:00:00Z'),
      }
      chatsRepository.find.mockResolvedValue([baseChat])
      usersRepository.find.mockResolvedValue([userB])
      mockLatestMessagesQuery([messageEntity])
      authService.toUserDto.mockImplementation((u: User) => ({ id: u.id, username: u.username }))

      const result = await service.findUserConversations(baseUser.id)

      expect(chatsRepository.find).toHaveBeenCalledWith({
        where: [{ userAId: baseUser.id }, { userBId: baseUser.id }],
      })
      const findCall = usersRepository.find.mock.calls[0][0] as {
        where: { id: { _value: string[] } }
      }
      expect(findCall.where.id._value).toContain(userB.id)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('chat-1')
      expect(result[0].contact).toEqual({ id: userB.id, username: 'bob' })
      expect(result[0].lastMessage).toMatchObject({
        id: 'msg-2',
        chatId: 'chat-1',
        content: 'Hello!',
      })
      expect(result[0].lastActivityAt).toBe('2026-06-02T00:00:00.000Z')
    })

    it('picks the other participant based on which side the user is on', async () => {
      // The user is userB in this chat, so the "other" participant is userA.
      const chat = {
        ...baseChat,
        userAId: '33333333-3333-3333-3333-333333333333',
        userBId: baseUser.id,
      }
      const userA: User = { ...baseUser, id: '33333333-3333-3333-3333-333333333333' }
      chatsRepository.find.mockResolvedValue([chat])
      usersRepository.find.mockResolvedValue([userA])
      mockLatestMessagesQuery([])
      authService.toUserDto.mockImplementation((u: User) => ({ id: u.id }))

      const result = await service.findUserConversations(baseUser.id)

      expect(result[0].contact).toEqual({ id: userA.id })
      expect(result[0].lastMessage).toBeNull()
    })

    it('uses chat creation time as the activity key when there are no messages', async () => {
      chatsRepository.find.mockResolvedValue([baseChat])
      usersRepository.find.mockResolvedValue([userB])
      mockLatestMessagesQuery([])
      authService.toUserDto.mockImplementation((u: User) => ({ id: u.id }))

      const result = await service.findUserConversations(baseUser.id)

      expect(result[0].lastMessage).toBeNull()
      expect(result[0].lastActivityAt).toBe(baseChat.createdAt.toISOString())
    })

    it('sorts conversations by recent activity (most recent first)', async () => {
      const olderChat: Chat = {
        ...baseChat,
        id: 'chat-old',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      }
      const newerChat: Chat = {
        ...baseChat,
        id: 'chat-new',
        userBId: '44444444-4444-4444-4444-444444444444',
        createdAt: new Date('2026-03-01T00:00:00Z'),
      }
      const olderUser: User = { ...userB }
      const newerUser: User = { ...userB, id: '44444444-4444-4444-4444-444444444444' }
      chatsRepository.find.mockResolvedValue([olderChat, newerChat])
      usersRepository.find.mockResolvedValue([olderUser, newerUser])
      mockLatestMessagesQuery([])
      authService.toUserDto.mockImplementation((u: User) => ({ id: u.id }))

      const result = await service.findUserConversations(baseUser.id)

      expect(result.map((c) => c.id)).toEqual(['chat-new', 'chat-old'])
    })
  })
})
