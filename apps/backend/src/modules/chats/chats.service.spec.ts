import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ChatsService } from './chats.service'
import { Chat } from './entities/chat.entity'

describe('ChatsService', () => {
  let service: ChatsService

  const repository = {
    findOne: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      providers: [ChatsService, { provide: getRepositoryToken(Chat), useValue: repository }],
    }).compile()

    service = moduleRef.get(ChatsService)
  })

  describe('findByParticipants', () => {
    const chat: Chat = {
      id: 'chat-1',
      userAId: '11111111-1111-1111-1111-111111111111',
      userBId: '22222222-2222-2222-2222-222222222222',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    }

    it('normalizes the pair and queries with user_a < user_b ordering', async () => {
      repository.findOne.mockResolvedValue(chat)

      const result = await service.findByParticipants(
        '22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111',
      )

      expect(result).toBe(chat)
      expect(repository.findOne).toHaveBeenCalledWith({
        where: {
          userAId: '11111111-1111-1111-1111-111111111111',
          userBId: '22222222-2222-2222-2222-222222222222',
        },
      })
    })

    it('returns null when no chat exists between the pair', async () => {
      repository.findOne.mockResolvedValue(null)

      const result = await service.findByParticipants('a', 'b')

      expect(result).toBeNull()
    })

    it('resolves both (A,B) and (B,A) to the same normalized query', async () => {
      repository.findOne.mockResolvedValue(chat)

      await service.findByParticipants('a', 'b')
      const forwardCall = repository.findOne.mock.calls[0][0]

      repository.findOne.mockClear()

      await service.findByParticipants('b', 'a')
      const reverseCall = repository.findOne.mock.calls[0][0]

      expect(reverseCall).toEqual(forwardCall)
    })
  })
})
