import { Test } from '@nestjs/testing'
import { User } from '../auth/entities/user.entity'
import { ChatsController } from './chats.controller'
import { ChatsService } from './chats.service'

// @nestjs/jwt v12 ships ESM-only (type: module); the CJS jest transformer
// cannot handle it. This mock short-circuits the ESM import chain.
jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}))

describe('ChatsController', () => {
  let controller: ChatsController

  const chatsService = {
    findUserConversations: jest.fn(),
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

  beforeEach(async () => {
    jest.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      controllers: [ChatsController],
      providers: [{ provide: ChatsService, useValue: chatsService }],
    }).compile()

    controller = moduleRef.get(ChatsController)
  })

  it('delegates to the service and wraps the result in the ApiResponse envelope', async () => {
    const conversations = [
      {
        id: 'chat-1',
        contact: { id: baseUser.id },
        lastMessage: null,
        lastActivityAt: '2026-01-01T00:00:00.000Z',
      },
    ]
    chatsService.findUserConversations.mockResolvedValue(conversations)

    const req = { user: baseUser } as never

    const result = await controller.getConversations(req)

    expect(chatsService.findUserConversations).toHaveBeenCalledWith(baseUser.id)
    expect(result.success).toBe(true)
    expect(result.data).toEqual(conversations)
    expect(typeof result.timestamp).toBe('string')
  })

  it('returns an empty array when the user has no conversations', async () => {
    chatsService.findUserConversations.mockResolvedValue([])

    const result = await controller.getConversations({ user: baseUser } as never)

    expect(result.data).toEqual([])
  })
})
