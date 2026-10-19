import { BadRequestException, ConflictException } from '@nestjs/common'
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
import { Attachment } from '../files/entities/attachment.entity'
import { FilesService } from '../files/files.service'
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

  const attachmentRepository = {
    delete: jest.fn(),
  }

  const filesService = {
    uploadImage: jest.fn(),
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
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repository },
        { provide: getRepositoryToken(Attachment), useValue: attachmentRepository },
        { provide: FilesService, useValue: filesService },
      ],
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
          code: ERROR_CODES.USERNAME_TAKEN,
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
          code: ERROR_CODES.USERNAME_TAKEN,
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
          code: ERROR_CODES.PASSWORD_INCORRECT,
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

    // P2: the anonymized username must be one that re-registration can never
    // produce, otherwise deleting an account would collide with the next user
    // who picks the freed handle, and a unique-index violation would surface
    // as a 500 instead of the intended 409.
    it('renames the account to a username that lies outside the valid alphabet', async () => {
      repository.save.mockImplementation((user: Partial<User>) => Promise.resolve(user))

      await service.deleteAccount({ ...activeUser }, { password: 'SecurePass123!' })

      const saved = repository.save.mock.calls[0][0] as User
      // A '#' is accepted by the update-profile username pattern, so assert
      // against the full composed value: the 'deleted#' prefix is the part
      // that puts it out of reach of a future registration.
      expect(saved.username).toBe(`deleted#${activeUser.id}`)
      expect(saved.username).not.toBe(activeUser.username)
      expect(saved.username?.startsWith('deleted#')).toBe(true)
    })

    it('clears every identifying column so the row cannot be re-identified', async () => {
      repository.save.mockImplementation((user: Partial<User>) => Promise.resolve(user))

      await service.deleteAccount({ ...activeUser }, { password: 'SecurePass123!' })

      const saved = repository.save.mock.calls[0][0] as User
      // The email is deliberately NOT cleared: it is the unique login key and
      // the audit trail, and the account is already barred from authenticating
      // by isActive=false plus the empty password hash.
      expect(saved.email).toBe(activeUser.email)
      expect(saved.passwordHash).toBe('')
      expect(saved.isActive).toBe(false)
      expect(saved.deletedAt).toBeInstanceOf(Date)
    })
  })

  describe('setAvatar', () => {
    /** A valid uploaded image as Multer would hand it to the route handler. */
    const validFile = () =>
      ({ buffer: Buffer.from('png'), originalname: 'avatar.png', mimetype: 'image/png' }) as Express.Multer.File

    const avatarUrl = '/api/v1/attachments/avatar-attachment-uuid'

    beforeEach(() => {
      filesService.uploadImage.mockResolvedValue({ url: avatarUrl })
      repository.save.mockImplementation((user: Partial<User>) => Promise.resolve(user))
      attachmentRepository.delete.mockResolvedValue({ affected: 1 })
    })

    it('stores the uploaded image, persists the returned URL, and returns the user', async () => {
      const user = { ...baseUser }

      const result = await service.setAvatar(user, validFile())

      expect(filesService.uploadImage).toHaveBeenCalledWith(validFile(), user)
      expect(repository.save).toHaveBeenCalledTimes(1)
      const saved = repository.save.mock.calls[0][0] as User
      expect(saved.avatarUrl).toBe(avatarUrl)
      expect(result).toBe(user)
      // A fresh avatar has no prior attachment to clean up.
      expect(attachmentRepository.delete).not.toHaveBeenCalled()
    })

    it('replaces an existing avatar: persists the new URL, then deletes the old attachment', async () => {
      const oldUrl = '/api/v1/attachments/old-attachment-uuid'
      const user = { ...baseUser, avatarUrl: oldUrl }

      const result = await service.setAvatar(user, validFile())

      const saved = repository.save.mock.calls[0][0] as User
      expect(saved.avatarUrl).toBe(avatarUrl)
      expect(attachmentRepository.delete).toHaveBeenCalledWith({ id: 'old-attachment-uuid' })
      expect(result.avatarUrl).toBe(avatarUrl)
    })

    it('propagates a validation error from the file service without saving or deleting', async () => {
      filesService.uploadImage.mockRejectedValue(
        new BadRequestException({
          code: ERROR_CODES.FILE_REQUIRED,
          message: ERROR_MESSAGES.FILE_REQUIRED,
        }),
      )
      const user = { ...baseUser, avatarUrl: '/api/v1/attachments/existing' }

      await expect(service.setAvatar(user, validFile())).rejects.toMatchObject({
        status: 400,
        response: { code: ERROR_CODES.FILE_REQUIRED, message: ERROR_MESSAGES.FILE_REQUIRED },
      })

      expect(repository.save).not.toHaveBeenCalled()
      expect(attachmentRepository.delete).not.toHaveBeenCalled()
      // The user's avatar is untouched when validation rejects the upload.
      expect(user.avatarUrl).toBe('/api/v1/attachments/existing')
    })

    it('restores the previous avatar and cleans up the new blob when the profile save fails', async () => {
      const previousUrl = '/api/v1/attachments/previous'
      const user = { ...baseUser, avatarUrl: previousUrl }
      repository.save.mockRejectedValue(new Error('db unavailable'))

      await expect(service.setAvatar(user, validFile())).rejects.toThrow('db unavailable')

      // The just-created attachment is deleted best-effort so it is not orphaned,
      // and the profile rolls back to the previous avatar.
      expect(attachmentRepository.delete).toHaveBeenCalledWith({ id: 'avatar-attachment-uuid' })
      expect(user.avatarUrl).toBe(previousUrl)
    })

    it('does not delete the old attachment when the profile save fails (rollback only touches the new blob)', async () => {
      const user = { ...baseUser, avatarUrl: '/api/v1/attachments/previous' }
      repository.save.mockRejectedValue(new Error('db unavailable'))

      await expect(service.setAvatar(user, validFile())).rejects.toThrow('db unavailable')

      // Cleanup targets only the new attachment; the previous one is left intact
      // because the user still points at it.
      expect(attachmentRepository.delete).toHaveBeenCalledTimes(1)
      expect(attachmentRepository.delete).toHaveBeenCalledWith({ id: 'avatar-attachment-uuid' })
    })
  })

  describe('removeAvatar', () => {
    const avatarUrl = '/api/v1/attachments/avatar-attachment-uuid'

    beforeEach(() => {
      repository.save.mockImplementation((user: Partial<User>) => Promise.resolve(user))
      attachmentRepository.delete.mockResolvedValue({ affected: 1 })
    })

    it('clears the avatar URL, saves, and deletes the old attachment', async () => {
      const user = { ...baseUser, avatarUrl: avatarUrl }

      const result = await service.removeAvatar(user)

      const saved = repository.save.mock.calls[0][0] as User
      expect(saved.avatarUrl).toBeNull()
      expect(attachmentRepository.delete).toHaveBeenCalledWith({ id: 'avatar-attachment-uuid' })
      expect(result.avatarUrl).toBeNull()
    })

    it('is a no-op for cleanup when there is no avatar yet', async () => {
      const user = { ...baseUser, avatarUrl: null }

      const result = await service.removeAvatar(user)

      expect(repository.save).toHaveBeenCalledTimes(1)
      expect(attachmentRepository.delete).not.toHaveBeenCalled()
      expect(result.avatarUrl).toBeNull()
    })

    it('swallows a storage cleanup failure so the request still succeeds', async () => {
      // Best-effort: a failed attachment deletion must not fail the request or
      // leave the profile inconsistent (avatar_url is already cleared).
      attachmentRepository.delete.mockRejectedValue(new Error('storage unavailable'))
      const user = { ...baseUser, avatarUrl: avatarUrl }

      const result = await service.removeAvatar(user)

      expect(repository.save).toHaveBeenCalledTimes(1)
      expect(attachmentRepository.delete).toHaveBeenCalledWith({ id: 'avatar-attachment-uuid' })
      expect(result.avatarUrl).toBeNull()
    })

    it('restores the previous avatar URL when the profile save fails', async () => {
      const user = { ...baseUser, avatarUrl: avatarUrl }
      repository.save.mockRejectedValue(new Error('db unavailable'))

      await expect(service.removeAvatar(user)).rejects.toThrow('db unavailable')

      expect(user.avatarUrl).toBe(avatarUrl)
      expect(attachmentRepository.delete).not.toHaveBeenCalled()
    })
  })

  describe('searchUsers', () => {
    it('rejects an empty, whitespace-only, or missing query with a validation error', async () => {
      await expect(service.searchUsers('', 10, CALLER_ID)).rejects.toMatchObject({
        status: 400,
        response: {
          code: ERROR_CODES.SEARCH_QUERY_REQUIRED,
          message: ERROR_MESSAGES.SEARCH_QUERY_REQUIRED,
        },
      })
      await expect(service.searchUsers('   ', 10, CALLER_ID)).rejects.toMatchObject({
        status: 400,
        response: {
          code: ERROR_CODES.SEARCH_QUERY_REQUIRED,
          message: ERROR_MESSAGES.SEARCH_QUERY_REQUIRED,
        },
      })
      await expect(service.searchUsers(undefined, 10, CALLER_ID)).rejects.toMatchObject({
        status: 400,
        response: {
          code: ERROR_CODES.SEARCH_QUERY_REQUIRED,
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
            code: ERROR_CODES.SEARCH_QUERY_TOO_LONG,
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
