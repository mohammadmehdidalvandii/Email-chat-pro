import { ConflictException, HttpException, UnauthorizedException } from '@nestjs/common'
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
import { ResendVerificationDto } from './dto/resend-verification.dto'
import { User } from './entities/user.entity'
import { EmailService } from '../email/email.service'

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

  const emailService = {
    sendVerificationEmail: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: repository },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile()

    service = moduleRef.get(AuthService)
  })

  describe('register', () => {
    const dto: RegisterDto = {
      email: 'User@Example.com',
      password: 'SecurePass123!',
    }

    it('sends the verification email with the plaintext token', async () => {
      repository.findOne.mockResolvedValue(null)
      repository.create.mockImplementation((input: Partial<User>) => ({ ...input }))
      repository.save.mockImplementation((user: Partial<User>) =>
        Promise.resolve({ ...user, id: 'uuid-1' }),
      )

      await service.register(dto)

      expect(emailService.sendVerificationEmail).toHaveBeenCalledTimes(1)
      const [recipient, token] = emailService.sendVerificationEmail.mock.calls[0]
      expect(recipient).toBe('user@example.com')
      // The plaintext token is delivered by email; only its hash is persisted.
      expect(token).toHaveLength(VERIFICATION_TOKEN_LENGTH)
      const storedHash = repository.create.mock.calls[0][0].verificationTokenHash
      expect(storedHash).not.toBe(token)
      expect(createHash('sha256').update(token).digest('hex')).toBe(storedHash)
    })

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
          { provide: EmailService, useValue: emailService },
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

  describe('resendVerification', () => {
    const dto: ResendVerificationDto = { email: 'User@Example.com' }
    const generic = { message: ERROR_MESSAGES.RESEND_VERIFICATION_SENT }

    /** An unverified, active, non-deleted account awaiting verification. */
    const pendingUser = (): Partial<User> => ({
      id: 'uuid-1',
      email: 'user@example.com',
      isVerified: false,
      isActive: true,
      deletedAt: null,
      verificationTokenHash: null,
      verificationTokenExpiresAt: null,
    })

    it('lowercases the address before looking the account up', async () => {
      repository.findOne.mockResolvedValue(null)

      await service.resendVerification(dto)

      expect(repository.findOne).toHaveBeenCalledWith({ where: { email: 'user@example.com' } })
    })

    it('rotates the stored token and sends the plaintext token by email', async () => {
      const user = pendingUser()
      repository.findOne.mockResolvedValue(user)
      repository.save.mockImplementation((input: Partial<User>) => Promise.resolve(input))

      const result = await service.resendVerification(dto)

      expect(result).toEqual(generic)
      expect(emailService.sendVerificationEmail).toHaveBeenCalledTimes(1)
      const [recipient, token] = emailService.sendVerificationEmail.mock.calls[0]
      expect(recipient).toBe('user@example.com')
      expect(token).toHaveLength(VERIFICATION_TOKEN_LENGTH)
      // Only the hash is persisted; the plaintext is delivered by email.
      expect(user.verificationTokenHash).toMatch(/^[a-f0-9]{64}$/)
      expect(user.verificationTokenHash).not.toBe(token)
      expect(createHash('sha256').update(token).digest('hex')).toBe(user.verificationTokenHash)
    })

    it('persists an expiry for the rotated token', async () => {
      const user = pendingUser()
      repository.findOne.mockResolvedValue(user)
      repository.save.mockImplementation((input: Partial<User>) => Promise.resolve(input))

      await service.resendVerification(dto)

      const expiresAt = (user.verificationTokenExpiresAt as Date).getTime()
      const expected = VERIFICATION_TOKEN_EXPIRATION_HOURS * 60 * 60 * 1000
      expect(expiresAt - Date.now()).toBeGreaterThan(expected - 60 * 1000)
      expect(expiresAt - Date.now()).toBeLessThanOrEqual(expected)
    })

    it('invalidates a previously issued token on a repeated resend', async () => {
      const user: Partial<User> = { ...pendingUser(), verificationTokenHash: 'a'.repeat(64) }
      repository.findOne.mockResolvedValue(user)
      repository.save.mockImplementation((input: Partial<User>) => Promise.resolve(input))

      await service.resendVerification(dto)

      // The old hash is overwritten, so the earlier token can no longer verify.
      expect(user.verificationTokenHash).not.toBe('a'.repeat(64))
    })

    // Account enumeration: every non-eligible case must be indistinguishable
    // from a genuine resend, both in payload and in side effects.
    const ineligible = (): [string, Partial<User> | null][] => [
      ['an unknown address', null],
      ['an already-verified account', { ...pendingUser(), isVerified: true }],
      ['a soft-deleted account', { ...pendingUser(), deletedAt: new Date() }],
      ['a deactivated account', { ...pendingUser(), isActive: false }],
    ]

    it.each(ineligible([]))('returns the generic response for %s', async (_label, user) => {
      repository.findOne.mockResolvedValue(user)

      const result = await service.resendVerification(dto)

      expect(result).toEqual(generic)
    })

    it.each(ineligible([]))(
      'performs no email send and no token write for %s',
      async (_label, user) => {
        repository.findOne.mockResolvedValue(user)

        await service.resendVerification(dto)

        expect(emailService.sendVerificationEmail).not.toHaveBeenCalled()
        expect(repository.save).not.toHaveBeenCalled()
      },
    )

    it('returns a byte-identical payload for eligible and ineligible accounts', async () => {
      repository.findOne.mockResolvedValue(pendingUser())
      repository.save.mockImplementation((input: Partial<User>) => Promise.resolve(input))
      const eligible = await service.resendVerification(dto)

      repository.findOne.mockResolvedValue(null)
      const unknown = await service.resendVerification(dto)

      expect(eligible).toEqual(unknown)
    })

    it('reports a delivery failure with the fixed message and no provider detail', async () => {
      const user = pendingUser()
      repository.findOne.mockResolvedValue(user)
      repository.save.mockImplementation((input: Partial<User>) => Promise.resolve(input))
      emailService.sendVerificationEmail.mockRejectedValue(
        new Error('Resend API error: recipient rejected, smtp 550'),
      )

      await expect(service.resendVerification(dto)).rejects.toMatchObject({
        status: 500,
        response: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: ERROR_MESSAGES.EMAIL_SEND_FAILED,
        },
      })
    })

    it('clears the rotated token when delivery fails so the account stays recoverable', async () => {
      const user = pendingUser()
      repository.findOne.mockResolvedValue(user)
      repository.save.mockImplementation((input: Partial<User>) => Promise.resolve(input))
      emailService.sendVerificationEmail.mockRejectedValue(new Error('smtp 550'))

      await expect(service.resendVerification(dto)).rejects.toBeInstanceOf(HttpException)

      // Cleared and persisted: the user never received this token, so keeping it
      // would strand the account with no valid token and a 409 on re-register.
      expect(user.verificationTokenHash).toBeNull()
      expect(user.verificationTokenExpiresAt).toBeNull()
      expect(repository.save).toHaveBeenLastCalledWith(
        expect.objectContaining({ verificationTokenHash: null, verificationTokenExpiresAt: null }),
      )
    })
  })

  describe('register — verification email delivery failure', () => {
    const dto: RegisterDto = { email: 'user@example.com', password: 'SecurePass123!' }

    beforeEach(() => {
      repository.findOne.mockResolvedValue(null)
      repository.create.mockImplementation((input: Partial<User>) => ({ ...input }))
      repository.save.mockImplementation((input: Partial<User>) =>
        Promise.resolve({ ...input, id: 'uuid-1' }),
      )
    })

    it('clears the verification token and keeps the account', async () => {
      emailService.sendVerificationEmail.mockRejectedValue(new Error('smtp 550'))

      await expect(service.register(dto)).rejects.toMatchObject({
        status: 500,
        response: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: ERROR_MESSAGES.EMAIL_SEND_FAILED,
        },
      })

      // The account survives (recoverable via resend) but holds no usable token.
      const lastSaved = repository.save.mock.calls.at(-1)?.[0] as Partial<User>
      expect(lastSaved.id).toBe('uuid-1')
      expect(lastSaved.verificationTokenHash).toBeNull()
      expect(lastSaved.verificationTokenExpiresAt).toBeNull()
    })

    it('never leaks the provider error or the address into the response', async () => {
      emailService.sendVerificationEmail.mockRejectedValue(
        new Error('Resend API error: user@example.com smtp 550 token=secret'),
      )

      const error = await service.register(dto).catch((e: unknown) => e)

      expect(JSON.stringify((error as { response: unknown }).response)).not.toContain('550')
      expect(JSON.stringify((error as { response: unknown }).response)).not.toContain('secret')
    })
  })
})
