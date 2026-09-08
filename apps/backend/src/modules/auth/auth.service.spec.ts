import { ConflictException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { createHash } from 'node:crypto'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import * as bcrypt from 'bcryptjs'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  VERIFICATION_TOKEN_EXPIRATION_HOURS,
  VERIFICATION_TOKEN_LENGTH,
} from '@email-chat-pro/constants'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { User } from './entities/user.entity'

// @nestjs/jwt v12 ships ESM-only (type: module), which the CJS ts-jest pipeline
// cannot require. Unit tests mock the token issuer; the real module is
// exercised by live/integration verification.
jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}))

describe('AuthService', () => {
  let service: AuthService

  const repository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: repository },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
      ],
    }).compile()

    service = moduleRef.get(AuthService)
  })

  describe('register', () => {
    const dto: RegisterDto = {
      email: 'User@Example.com',
      password: 'SecurePass123!',
    }

    it('normalizes email to lowercase before storing', async () => {
      repository.findOne.mockResolvedValue(null)
      repository.create.mockImplementation((input: Partial<User>) => ({ ...input }))
      repository.save.mockImplementation((user: Partial<User>) =>
        Promise.resolve({ ...user, id: 'uuid-1' }),
      )

      const result = await service.register(dto)

      expect(repository.create.mock.calls[0][0].email).toBe('user@example.com')
      expect(result.email).toBe('user@example.com')
    })

    it('hashes the password with bcrypt and never stores plaintext', async () => {
      repository.findOne.mockResolvedValue(null)
      repository.create.mockImplementation((input: Partial<User>) => ({ ...input }))
      repository.save.mockImplementation((user: Partial<User>) =>
        Promise.resolve({ ...user, id: 'uuid-1' }),
      )

      await service.register(dto)

      const created = repository.create.mock.calls[0][0]
      const saved = repository.save.mock.calls[0][0]
      expect(created.password).toBeUndefined()
      expect(saved.password).toBeUndefined()
      expect(created.passwordHash).toBeTruthy()
      expect(created.passwordHash).not.toBe(dto.password)
      expect(bcrypt.compareSync(dto.password, created.passwordHash)).toBe(true)
    })

    it('creates the user in the unverified/pending state', async () => {
      repository.findOne.mockResolvedValue(null)
      repository.create.mockImplementation((input: Partial<User>) => ({ ...input }))
      repository.save.mockImplementation((user: Partial<User>) =>
        Promise.resolve({ ...user, id: 'uuid-1' }),
      )

      await service.register(dto)

      const created = repository.create.mock.calls[0][0]
      expect(created.isVerified).toBe(false)
    })

    it('generates a verification token and persists only its hash and an expiry', async () => {
      repository.findOne.mockResolvedValue(null)
      repository.create.mockImplementation((input: Partial<User>) => ({ ...input }))
      repository.save.mockImplementation((user: Partial<User>) =>
        Promise.resolve({ ...user, id: 'uuid-1' }),
      )

      await service.register(dto)

      const created = repository.create.mock.calls[0][0]
      expect(created.verificationTokenHash).toMatch(/^[a-f0-9]{64}$/)
      expect((created.verificationTokenHash as string).length).toBe(VERIFICATION_TOKEN_LENGTH)

      const expiresAt = (created.verificationTokenExpiresAt as Date).getTime()
      const expected = VERIFICATION_TOKEN_EXPIRATION_HOURS * 60 * 60 * 1000
      expect(expiresAt - Date.now()).toBeGreaterThan(expected - 60 * 1000)
      expect(expiresAt - Date.now()).toBeLessThanOrEqual(expected)

      // The plaintext token must never leak into the response shape.
      const result = await service.register(dto)
      expect(result).toEqual({
        id: 'uuid-1',
        email: 'user@example.com',
        message: 'Registration successful',
      })
    })

    it('returns the registered account id, email and success message', async () => {
      repository.findOne.mockResolvedValue(null)
      repository.create.mockImplementation((input: Partial<User>) => ({ ...input }))
      repository.save.mockImplementation((user: Partial<User>) =>
        Promise.resolve({ ...user, id: 'uuid-1' }),
      )

      const result = await service.register(dto)

      expect(result.id).toBe('uuid-1')
      expect(result.email).toBe('user@example.com')
      expect(result.message).toBe('Registration successful')
    })

    it('rejects a duplicate email with a conflict error', async () => {
      repository.findOne.mockResolvedValue({
        id: 'existing',
        email: 'user@example.com',
      })

      await expect(service.register(dto)).rejects.toBeInstanceOf(ConflictException)
      expect(repository.save).not.toHaveBeenCalled()
    })

    it('rejects a duplicate email when the database race hits the unique constraint', async () => {
      repository.findOne.mockResolvedValue(null)
      repository.create.mockImplementation((input: Partial<User>) => ({ ...input }))
      repository.save.mockRejectedValue({
        code: '23505',
        detail: 'Key (email)=(user@example.com) already exists.',
      })

      await expect(service.register(dto)).rejects.toMatchObject({
        status: 409,
        response: {
          code: ERROR_CODES.CONFLICT,
          message: ERROR_MESSAGES.EMAIL_ALREADY_REGISTERED,
        },
      })
    })

    it('rethrows unexpected persistence failures as a generic internal error', async () => {
      repository.findOne.mockResolvedValue(null)
      repository.create.mockImplementation((input: Partial<User>) => ({ ...input }))
      repository.save.mockRejectedValue(new Error('connection lost'))

      await expect(service.register(dto)).rejects.toMatchObject({
        status: 500,
        response: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: ERROR_MESSAGES.INTERNAL,
        },
      })
    })
  })

  describe('verifyEmail', () => {
    const token = 'a'.repeat(64)
    const expired = new Date(Date.now() - 60 * 1000)
    const notExpired = new Date(Date.now() + 60 * 60 * 1000)

    it('looks up the user by the SHA-256 hash of the presented token', async () => {
      const user: Partial<User> = {
        id: 'uuid-1',
        isVerified: false,
        verificationTokenHash: createHash('sha256').update(token).digest('hex'),
        verificationTokenExpiresAt: notExpired,
      }
      repository.findOne.mockResolvedValue(user)
      repository.save.mockImplementation((u: Partial<User>) => Promise.resolve(u))

      await service.verifyEmail({ token })

      expect(repository.findOne).toHaveBeenCalledWith({
        where: {
          verificationTokenHash: createHash('sha256').update(token).digest('hex'),
        },
      })
    })

    it('flips is_verified to true, records verified_at, clears the token, and returns success', async () => {
      const user: Partial<User> = {
        id: 'uuid-1',
        isVerified: false,
        verificationTokenHash: createHash('sha256').update(token).digest('hex'),
        verificationTokenExpiresAt: notExpired,
      }
      repository.findOne.mockResolvedValue(user)
      repository.save.mockImplementation((u: Partial<User>) => Promise.resolve(u))

      const result = await service.verifyEmail({ token })

      expect(user.isVerified).toBe(true)
      expect(user.verifiedAt).toBeInstanceOf(Date)
      expect(user.verificationTokenHash).toBeNull()
      expect(user.verificationTokenExpiresAt).toBeNull()
      expect(repository.save).toHaveBeenCalledWith(user)
      expect(result).toEqual({ message: 'Email verified successfully' })
    })

    it('rejects an unknown token with a 400 bad request error', async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.verifyEmail({ token })).rejects.toMatchObject({
        status: 400,
        response: {
          code: ERROR_CODES.VERIFICATION_TOKEN_INVALID,
          message: ERROR_MESSAGES.VERIFICATION_TOKEN_INVALID,
        },
      })
      expect(repository.save).not.toHaveBeenCalled()
    })

    it('rejects an already-used token because its hash has been cleared', async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.verifyEmail({ token })).rejects.toMatchObject({ status: 400 })
      expect(repository.save).not.toHaveBeenCalled()
    })

    it('rejects an expired token with a 400 bad request error', async () => {
      const user: Partial<User> = {
        id: 'uuid-1',
        isVerified: false,
        verificationTokenHash: createHash('sha256').update(token).digest('hex'),
        verificationTokenExpiresAt: expired,
      }
      repository.findOne.mockResolvedValue(user)

      await expect(service.verifyEmail({ token })).rejects.toMatchObject({
        status: 400,
        response: {
          code: ERROR_CODES.VERIFICATION_TOKEN_INVALID,
          message: ERROR_MESSAGES.VERIFICATION_TOKEN_INVALID,
        },
      })
      expect(repository.save).not.toHaveBeenCalled()
    })
  })

  describe('login', () => {
    const dto = { email: 'User@Example.com', password: 'SecurePass123!' }

    const verifiedUser = {
      id: 'uuid-1',
      email: 'user@example.com',
      passwordHash: bcrypt.hashSync('SecurePass123!', 10),
      isVerified: true,
      isActive: true,
      deletedAt: null,
      profileCompleted: false,
      lastSeenAt: new Date('2026-01-01T00:00:00Z'),
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }

    it('normalizes the email and signs a JWT for a verified active user', async () => {
      repository.findOne.mockResolvedValue(verifiedUser)
      const jwtService = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') }
      const moduleRef = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: getRepositoryToken(User), useValue: repository },
          { provide: JwtService, useValue: jwtService },
        ],
      }).compile()
      const svc = moduleRef.get(AuthService)

      const result = await svc.login(dto)

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      })
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'uuid-1',
        email: 'user@example.com',
      })
      expect(result).toEqual({
        token: 'signed.jwt.token',
        user: {
          id: 'uuid-1',
          email: 'user@example.com',
          isVerified: true,
          isActive: true,
          username: undefined,
          fullName: undefined,
          bio: undefined,
          avatarUrl: undefined,
          profileCompleted: false,
          lastSeenAt: '2026-01-01T00:00:00.000Z',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      })
    })

    it('rejects an unknown account with a generic 401', async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.login(dto)).rejects.toBeInstanceOf(UnauthorizedException)
      await expect(service.login(dto)).rejects.toMatchObject({
        status: 401,
        response: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: ERROR_MESSAGES.INVALID_CREDENTIALS,
        },
      })
    })

    it('rejects a soft-deleted account with a generic 401', async () => {
      repository.findOne.mockResolvedValue({ ...verifiedUser, deletedAt: new Date() })

      await expect(service.login(dto)).rejects.toMatchObject({ status: 401 })
    })

    it('rejects an inactive account with a generic 401', async () => {
      repository.findOne.mockResolvedValue({ ...verifiedUser, isActive: false })

      await expect(service.login(dto)).rejects.toMatchObject({ status: 401 })
    })

    it('rejects a wrong password with a generic 401', async () => {
      repository.findOne.mockResolvedValue(verifiedUser)
      const wrongPassword = {
        email: 'user@example.com',
        password: 'WrongPass123!',
      }

      await expect(service.login(wrongPassword)).rejects.toMatchObject({
        status: 401,
        response: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: ERROR_MESSAGES.INVALID_CREDENTIALS,
        },
      })
    })

    it('rejects an unverified account with a distinct 401', async () => {
      repository.findOne.mockResolvedValue({ ...verifiedUser, isVerified: false })

      await expect(service.login(dto)).rejects.toMatchObject({
        status: 401,
        response: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: ERROR_MESSAGES.EMAIL_NOT_VERIFIED,
        },
      })
    })
  })

  describe('logout', () => {
    it('returns a logged out message', async () => {
      const result = await service.logout()

      expect(result).toEqual({ message: ERROR_MESSAGES.LOGGED_OUT })
    })
  })
})
