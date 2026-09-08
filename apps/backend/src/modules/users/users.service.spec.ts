import { ConflictException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ERROR_CODES, ERROR_MESSAGES } from '@email-chat-pro/constants'
import { User } from '../auth/entities/user.entity'
import { UsersService } from './users.service'

describe('UsersService', () => {
  let service: UsersService

  const repository = {
    findOne: jest.fn(),
    save: jest.fn(),
  }

  const baseUser: User = {
    id: 'uuid-1',
    email: 'user@example.com',
    passwordHash: 'hashed',
    isVerified: true,
    verificationTokenHash: null,
    verificationTokenExpiresAt: null,
    verifiedAt: null,
    username: null,
    fullName: null,
    bio: null,
    avatarUrl: null,
    profileCompleted: false,
    lastSeenAt: new Date('2026-01-01T00:00:00Z'),
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: getRepositoryToken(User), useValue: repository }],
    }).compile()

    service = moduleRef.get(UsersService)
  })

  describe('updateProfile', () => {
    it('sets the provided fields and persists the changes', async () => {
      repository.findOne.mockResolvedValue(null)
      repository.save.mockImplementation((user: Partial<User>) => Promise.resolve(user))

      const result = await service.updateProfile(
        { ...baseUser },
        {
          username: 'alice',
          fullName: 'Alice',
          bio: 'Hello there',
          avatarUrl: 'https://example.com/avatar.png',
        },
      )

      expect(result.username).toBe('alice')
      expect(result.fullName).toBe('Alice')
      expect(result.bio).toBe('Hello there')
      expect(result.avatarUrl).toBe('https://example.com/avatar.png')
      expect(repository.save).toHaveBeenCalled()
    })

    it('marks the profile completed only when username and full name are present', async () => {
      repository.findOne.mockResolvedValue(null)
      repository.save.mockImplementation((user: Partial<User>) => Promise.resolve(user))

      const withUsername = await service.updateProfile({ ...baseUser }, { username: 'alice' })
      expect(withUsername.profileCompleted).toBe(false)

      const complete = await service.updateProfile(
        { ...baseUser },
        { username: 'alice', fullName: 'Alice' },
      )
      expect(complete.profileCompleted).toBe(true)
    })

    it("allows re-submitting the user's own username regardless of casing", async () => {
      const user = { ...baseUser, username: 'Alice' }
      repository.save.mockImplementation((u: Partial<User>) => Promise.resolve(u))

      const result = await service.updateProfile(user, { username: 'alice' })

      expect(repository.findOne).not.toHaveBeenCalled()
      expect(result.username).toBe('alice')
    })

    it('rejects a username already taken by another account (case-insensitive)', async () => {
      repository.findOne.mockResolvedValue({ id: 'other', username: 'Alice' })

      await expect(
        service.updateProfile({ ...baseUser }, { username: 'alice' }),
      ).rejects.toMatchObject({
        status: 409,
        response: {
          code: ERROR_CODES.CONFLICT,
          message: ERROR_MESSAGES.USERNAME_TAKEN,
        },
      })
      expect(repository.save).not.toHaveBeenCalled()
    })

    it('rejects a taken username when the database unique-index race is hit', async () => {
      repository.findOne.mockResolvedValue(null)
      repository.save.mockRejectedValue({ code: '23505' })

      await expect(
        service.updateProfile({ ...baseUser }, { username: 'alice' }),
      ).rejects.toMatchObject({
        status: 409,
        response: {
          code: ERROR_CODES.CONFLICT,
          message: ERROR_MESSAGES.USERNAME_TAKEN,
        },
      })
    })

    it('normalizes empty optional text fields to null', async () => {
      const user = {
        ...baseUser,
        fullName: 'Old Name',
        bio: 'Old bio',
        avatarUrl: 'https://old.example.com/a.png',
      }
      repository.findOne.mockResolvedValue(null)
      repository.save.mockImplementation((u: Partial<User>) => Promise.resolve(u))

      const result = await service.updateProfile(user, {
        fullName: '   ',
        bio: '',
        avatarUrl: '   ',
      })

      expect(result.fullName).toBeNull()
      expect(result.bio).toBeNull()
      expect(result.avatarUrl).toBeNull()
    })

    it('rethrows persistence failures that are not username unique violations', async () => {
      repository.findOne.mockResolvedValue(null)
      repository.save.mockRejectedValue(new ConflictException())

      await expect(
        service.updateProfile({ ...baseUser }, { username: 'alice' }),
      ).rejects.toBeInstanceOf(ConflictException)
    })
  })
})
