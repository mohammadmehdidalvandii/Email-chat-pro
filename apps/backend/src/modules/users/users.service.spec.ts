import { ConflictException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { FindOperator } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  SEARCH_LIMIT_MAX,
  SEARCH_QUERY_MAX_LENGTH,
} from '@email-chat-pro/constants'
import { User } from '../auth/entities/user.entity'
import { UsersService } from './users.service'

describe('UsersService', () => {
  let service: UsersService

  /** The authenticated caller, who must never appear in their own results. */
  const CALLER_ID = 'uuid-caller'

  const repository = {
    findOne: jest.fn(),
    find: jest.fn(),
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

  describe('deleteAccount', () => {
    const activeUser: User = {
      ...baseUser,
      passwordHash: bcrypt.hashSync('SecurePass123!', 10),
      username: 'alice',
      fullName: 'Alice',
      bio: 'Hello',
      avatarUrl: 'https://example.com/avatar.png',
      isActive: true,
      deletedAt: null,
    }

    it('rejects a wrong password with a 401 unauthorized error', async () => {
      await expect(
        service.deleteAccount({ ...activeUser }, { password: 'WrongPass123!' }),
      ).rejects.toMatchObject({
        status: 401,
        response: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: ERROR_MESSAGES.PASSWORD_INCORRECT,
        },
      })
      expect(repository.save).not.toHaveBeenCalled()
    })

    it('anonymizes the account on a valid password and persists the changes', async () => {
      repository.save.mockImplementation((user: Partial<User>) => Promise.resolve(user))

      await service.deleteAccount({ ...activeUser }, { password: 'SecurePass123!' })

      expect(repository.save).toHaveBeenCalledTimes(1)
      const saved = repository.save.mock.calls[0][0] as User
      expect(saved.deletedAt).toBeInstanceOf(Date)
      expect(saved.isActive).toBe(false)
      expect(saved.username).toBe(`deleted#${activeUser.id}`)
      expect(saved.fullName).toBeNull()
      expect(saved.bio).toBeNull()
      expect(saved.avatarUrl).toBeNull()
      expect(saved.passwordHash).toBe('')
    })
  })

  describe('searchUsers', () => {
    it('rejects an empty, whitespace-only, or missing query with a validation error', async () => {
      await expect(service.searchUsers('', 10, CALLER_ID)).rejects.toMatchObject({
        status: 400,
        response: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: ERROR_MESSAGES.SEARCH_QUERY_REQUIRED,
        },
      })
      await expect(service.searchUsers('   ', 10, CALLER_ID)).rejects.toMatchObject({
        status: 400,
        response: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: ERROR_MESSAGES.SEARCH_QUERY_REQUIRED,
        },
      })
      await expect(service.searchUsers(undefined, 10, CALLER_ID)).rejects.toMatchObject({
        status: 400,
        response: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: ERROR_MESSAGES.SEARCH_QUERY_REQUIRED,
        },
      })
      expect(repository.find).not.toHaveBeenCalled()
    })

    it('queries active non-deleted users with OR username/email predicates and the default limit', async () => {
      repository.find.mockResolvedValue([])

      await service.searchUsers('ali', 10, CALLER_ID)

      expect(repository.find).toHaveBeenCalledTimes(1)
      const options = repository.find.mock.calls[0][0]
      expect(options.take).toBe(10)
      expect(options.order).toEqual({ username: 'ASC' })
      expect(options.where).toHaveLength(2)
      for (const branch of options.where) {
        expect(branch.isActive).toBe(true)
        expect(branch.deletedAt).toBeInstanceOf(FindOperator)
      }
      // First branch is the partial username match with the query as a literal
      // fragment; LIKE wildcards in the input are escaped so they match literally.
      const usernameOperator = options.where[0].username
      expect(usernameOperator).toBeInstanceOf(FindOperator)
      expect(usernameOperator.objectLiteralParameters).toEqual({ pattern: '%ali%' })
    })

    it('escapes LIKE wildcards in the query so they match literally', async () => {
      repository.find.mockResolvedValue([])

      await service.searchUsers('al%ice', 10, CALLER_ID)

      const options = repository.find.mock.calls[0][0]
      expect(options.where[0].username.objectLiteralParameters).toEqual({ pattern: '%al\\%ice%' })
    })

    it('clamps the limit to the configured maximum when it exceeds the cap', async () => {
      repository.find.mockResolvedValue([])

      await service.searchUsers('ali', 500, CALLER_ID)

      expect(repository.find.mock.calls[0][0].take).toBe(SEARCH_LIMIT_MAX)
    })

    it('clamps the limit to at least 1 when it is below the minimum', async () => {
      repository.find.mockResolvedValue([])

      await service.searchUsers('ali', 0, CALLER_ID)

      expect(repository.find.mock.calls[0][0].take).toBe(1)
    })

    it('returns the users found by the repository', async () => {
      const alice = { ...baseUser, id: 'uuid-alice', username: 'alice', fullName: 'Alice' }
      const bob = { ...baseUser, id: 'uuid-bob', username: 'bob', fullName: 'Bob' }
      repository.find.mockResolvedValue([alice, bob])

      const result = await service.searchUsers('ali', 10, CALLER_ID)

      expect(result).toEqual([alice, bob])
    })

    // P1-4: the caller was previously able to appear in their own results.
    describe('caller exclusion', () => {
      it('excludes the authenticated caller from both the username and email branches', async () => {
        repository.find.mockResolvedValue([])

        await service.searchUsers('ali', 10, CALLER_ID)

        const { where } = repository.find.mock.calls[0][0]
        expect(where).toHaveLength(2)
        for (const branch of where) {
          expect(branch.id).toBeInstanceOf(FindOperator)
          // Not() is applied to the caller id on every branch.
          expect(branch.id.type).toBe('not')
        }
      })

      it('excludes the caller without disturbing the existing predicates', async () => {
        repository.find.mockResolvedValue([])

        await service.searchUsers('ali', 10, CALLER_ID)

        const { where } = repository.find.mock.calls[0][0]
        for (const branch of where) {
          expect(branch.isActive).toBe(true)
          expect(branch.deletedAt).toBeInstanceOf(FindOperator)
          expect(branch.id).toBeInstanceOf(FindOperator)
        }
        expect(where[0].username.objectLiteralParameters).toEqual({ pattern: '%ali%' })
      })

      it('excludes a different id per caller, so one caller never filters another out', async () => {
        repository.find.mockResolvedValue([])

        await service.searchUsers('ali', 10, 'uuid-alice')
        await service.searchUsers('ali', 10, 'uuid-bob')

        const [aliceCall, bobCall] = repository.find.mock.calls
        expect(aliceCall[0].where[0].id).not.toBe(bobCall[0].where[0].id)
      })
    })

    // P1-4: the query length was previously unbounded.
    describe('query length bounds', () => {
      it('accepts a query of exactly the maximum length', async () => {
        repository.find.mockResolvedValue([])
        const q = 'a'.repeat(SEARCH_QUERY_MAX_LENGTH)

        await service.searchUsers(q, 10, CALLER_ID)

        expect(repository.find).toHaveBeenCalledTimes(1)
        expect(repository.find.mock.calls[0][0].where[0].username.objectLiteralParameters).toEqual({
          pattern: `%${q}%`,
        })
      })

      it('rejects a query longer than the maximum with a validation error', async () => {
        await expect(
          service.searchUsers('a'.repeat(SEARCH_QUERY_MAX_LENGTH + 1), 10, CALLER_ID),
        ).rejects.toMatchObject({
          status: 400,
          response: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: ERROR_MESSAGES.SEARCH_QUERY_TOO_LONG,
          },
        })
        expect(repository.find).not.toHaveBeenCalled()
      })

      it('measures length after trimming, so padding cannot push a query over the cap', async () => {
        repository.find.mockResolvedValue([])
        const padded = `  ${'a'.repeat(SEARCH_QUERY_MAX_LENGTH)}  `

        await service.searchUsers(padded, 10, CALLER_ID)

        expect(repository.find).toHaveBeenCalledTimes(1)
      })

      it('still rejects an empty query after the length check', async () => {
        await expect(service.searchUsers('', 10, CALLER_ID)).rejects.toMatchObject({
          status: 400,
          response: { message: ERROR_MESSAGES.SEARCH_QUERY_REQUIRED },
        })
      })
    })

    // Guard against a regression that would widen the response beyond the
    // already-minimal projection (no password hash, no verification state).
    it('does not select private columns in the search projection', async () => {
      repository.find.mockResolvedValue([])

      await service.searchUsers('ali', 10, CALLER_ID)

      const options = repository.find.mock.calls[0][0]
      const selected = (options.select ?? {}) as Record<string, boolean>
      expect(selected.passwordHash).not.toBe(true)
      expect(selected.verificationTokenHash).not.toBe(true)
    })
  })
})
