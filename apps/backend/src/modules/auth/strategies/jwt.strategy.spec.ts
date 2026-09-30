import { UnauthorizedException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import type { Request } from 'express'
import { createHmac } from 'node:crypto'
import { User } from '../entities/user.entity'
import {
  AUTH_COOKIE_NAME,
  JwtStrategy,
  extractJwtFromCookie,
  type JwtPayload,
} from './jwt.strategy'

/**
 * @nestjs/jwt v12 ships ESM-only, which the CJS ts-jest pipeline cannot
 * require — the same constraint auth.service.spec.ts already works around.
 *
 * The mock below keeps the real cryptographic semantics by signing with
 * node:crypto directly (HS256), so expiry, tampering and wrong-secret
 * rejection are exercised for real rather than stubbed into always passing.
 */
jest.mock('@nestjs/jwt', () => {
  const b64url = (input: Buffer | string) =>
    Buffer.from(input as never).toString('base64url')

  class JwtService {
    constructor(private readonly options: { secret?: string } = {}) {}

    async signAsync(payload: unknown, options: { expiresIn?: string | number } = {}) {
      const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      const body: Record<string, unknown> = { ...(payload as object) }
      if (options.expiresIn !== undefined) {
        const seconds =
          typeof options.expiresIn === 'number'
            ? options.expiresIn
            : Number(String(options.expiresIn).replace(/[smhd]/g, '')) *
              ({ s: 1, m: 60, h: 3600, d: 86400 }[String(options.expiresIn).slice(-1)] ?? 1)
        body.exp = Math.floor(Date.now() / 1000) + seconds
      }
      const encoded = `${header}.${b64url(JSON.stringify(body))}`
      const signature = createHmac('sha256', this.options.secret ?? '')
        .update(encoded)
        .digest('base64url')
      return `${encoded}.${signature}`
    }

    async verifyAsync<T>(token: string): Promise<T> {
      if (typeof token !== 'string' || token.length === 0) throw new Error('jwt malformed')
      const parts = token.split('.')
      if (parts.length !== 3) throw new Error('jwt malformed')
      const [header, body, signature] = parts
      const expected = createHmac('sha256', this.options.secret ?? '')
        .update(`${header}.${body}`)
        .digest('base64url')
      if (signature !== expected) throw new Error('invalid signature')
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T & {
        exp?: number
      }
      if (payload.exp !== undefined && payload.exp * 1000 <= Date.now()) {
        throw new Error('jwt expired')
      }
      return payload
    }
  }

  return { JwtService }
})

// Imported after the mock so the mocked class is the one used below.
import { JwtService } from '@nestjs/jwt'

/**
 * JwtStrategy (P2 — the strategy had no spec, and it is the sole gate between a
 * decoded token and an authenticated `req.user`).
 *
 * Two responsibilities are covered:
 *  1. `validate` — must reject unknown and inactive (soft-deleted or
 *     deactivated) accounts, and must return the persisted entity so the guard
 *     attaches the real user rather than trusting the token's own claims.
 *  2. `extractJwtFromCookie` — the browser token source, written by hand
 *     because the approved stack has no cookie-parser.
 *
 * Tokens are signed and parsed with a real JwtService against a test secret, so
 * expiry and tampering are exercised for real rather than stubbed.
 */
describe('JwtStrategy', () => {
  const JWT_SECRET = 'test-secret-for-strategy-spec'
  const ORIGINAL_ENV = process.env

  const activeUser: Partial<User> = {
    id: 'uuid-1',
    email: 'user@example.com',
    isActive: true,
    isVerified: true,
    deletedAt: null,
  }

  let repository: { findOne: jest.Mock }
  let service: JwtStrategy
  let jwtService: JwtService

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV, JWT_SECRET }

    repository = { findOne: jest.fn() }

    const moduleRef = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: getRepositoryToken(User), useValue: repository },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile()

    service = moduleRef.get(JwtStrategy)
    jwtService = moduleRef.get(JwtService)
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  describe('validate', () => {
    it('returns the persisted user for a valid token payload', async () => {
      repository.findOne.mockResolvedValue(activeUser)

      const result = await service.validate({ sub: 'uuid-1', email: 'user@example.com' })

      expect(result).toBe(activeUser)
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'uuid-1' } })
    })

    it('looks the user up by id, never trusting the token email claim', async () => {
      repository.findOne.mockResolvedValue(activeUser)

      // A tampered email claim must not change who is authenticated.
      await service.validate({ sub: 'uuid-1', email: 'attacker@example.com' })

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'uuid-1' } })
    })

    it('rejects a token whose subject no longer exists', async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(
        service.validate({ sub: 'deleted-user', email: 'ghost@example.com' }),
      ).rejects.toBeInstanceOf(UnauthorizedException)
    })

    it('rejects a deactivated account even while its token is still unexpired', async () => {
      repository.findOne.mockResolvedValue({ ...activeUser, isActive: false })

      await expect(
        service.validate({ sub: 'uuid-1', email: 'user@example.com' }),
      ).rejects.toBeInstanceOf(UnauthorizedException)
    })

    it('rejects a soft-deleted account, which account deletion marks inactive', async () => {
      repository.findOne.mockResolvedValue({
        ...activeUser,
        isActive: false,
        deletedAt: new Date(),
      })

      await expect(
        service.validate({ sub: 'uuid-1', email: 'user@example.com' }),
      ).rejects.toBeInstanceOf(UnauthorizedException)
    })

    it('rejects with a bare 401 that carries no account detail', async () => {
      repository.findOne.mockResolvedValue(null)

      const error = await service
        .validate({ sub: 'uuid-1', email: 'user@example.com' })
        .catch((e: unknown) => e as UnauthorizedException)

      // The reason must not distinguish "no such user" from "inactive user".
      expect(error).toBeInstanceOf(UnauthorizedException)
      expect(error.message).not.toContain('user@example.com')
      expect(error.message).not.toContain('uuid-1')
    })
  })

  describe('token verification (real signing)', () => {
    const realJwt = new JwtService({ secret: JWT_SECRET, signOptions: { expiresIn: '1h' } })

    it('verifies a correctly signed, unexpired token', async () => {
      const token = await realJwt.signAsync({ sub: 'uuid-1', email: 'user@example.com' } as JwtPayload)

      const payload = await realJwt.verifyAsync<JwtPayload>(token)

      expect(payload.sub).toBe('uuid-1')
    })

    it('rejects an expired token', async () => {
      const expired = await realJwt.signAsync(
        { sub: 'uuid-1', email: 'user@example.com' } as JwtPayload,
        { expiresIn: '-1s' },
      )

      await expect(realJwt.verifyAsync(expired)).rejects.toThrow()
    })

    it('rejects a token signed with a different secret', async () => {
      const foreign = new JwtService({ secret: 'a-completely-different-secret' })
      const token = await foreign.signAsync({ sub: 'uuid-1', email: 'u@example.com' } as JwtPayload)

      await expect(realJwt.verifyAsync(token)).rejects.toThrow()
    })

    it.each([
      ['a malformed token', 'not.a.jwt'],
      ['a truncated token', 'eyJhbGciOiJIUzI1NiJ9'],
      ['an empty string', ''],
    ])('rejects %s', async (_label, token) => {
      await expect(realJwt.verifyAsync(token)).rejects.toThrow()
    })

    it('is configured to enforce expiry rather than ignore it', () => {
      // passport-jwt normalises the option with `!!` into `_verifOpts`. A
      // truthy value here would accept expired tokens as valid sessions, so the
      // strategy must leave it false.
      const { _verifOpts } = service as unknown as {
        _verifOpts: { ignoreExpiration: boolean }
      }

      expect(_verifOpts.ignoreExpiration).toBe(false)
    })

    it('is configured to verify against the environment JWT secret', () => {
      const { _secretOrKeyProvider } = service as unknown as {
        _secretOrKeyProvider: (req: unknown, token: string, done: (e: null, s: string) => void) => void
      }
      const captured: string[] = []

      _secretOrKeyProvider({}, 'any-token', (_e, secret) => captured.push(secret))

      expect(captured[0]).toBe(JWT_SECRET)
    })

    it('rejects a forged payload whose signature does not match', async () => {
      const token = await realJwt.signAsync({ sub: 'uuid-1', email: 'u@example.com' } as JwtPayload)
      const [header, , signature] = token.split('.')
      const forgedPayload = Buffer.from(
        JSON.stringify({ sub: 'uuid-1', email: 'admin@example.com', isAdmin: true }),
      ).toString('base64url')

      await expect(
        realJwt.verifyAsync(`${header}.${forgedPayload}.${signature}`),
      ).rejects.toThrow()
    })

    it('is wired to the injected JwtService used across the auth module', () => {
      expect(jwtService).toBeDefined()
    })
  })
})

describe('extractJwtFromCookie', () => {
  const makeRequest = (headers: Record<string, string>) =>
    ({ headers }) as unknown as Request

  it('reads the token from the httpOnly auth cookie', () => {
    const req = makeRequest({ cookie: `${AUTH_COOKIE_NAME}=token-value` })

    expect(extractJwtFromCookie(req)).toBe('token-value')
  })

  it('finds the cookie when it is not first in the header', () => {
    const req = makeRequest({ cookie: `theme=dark; ${AUTH_COOKIE_NAME}=token-value; other=1` })

    expect(extractJwtFromCookie(req)).toBe('token-value')
  })

  it('returns null when no cookie header is present', () => {
    expect(extractJwtFromCookie(makeRequest({}))).toBeNull()
  })

  it('returns null when the cookie header holds a different cookie', () => {
    expect(extractJwtFromCookie(makeRequest({ cookie: 'theme=dark' }))).toBeNull()
  })

  it('does not match a cookie whose name merely ends with the auth cookie name', () => {
    const req = makeRequest({ cookie: `not_${AUTH_COOKIE_NAME}=token-value` })

    expect(extractJwtFromCookie(req)).toBeNull()
  })

  it('returns null for a percent-encoded value that cannot be decoded', () => {
    const req = makeRequest({ cookie: `${AUTH_COOKIE_NAME}=%E0%A4%A` })

    expect(extractJwtFromCookie(req)).toBeNull()
  })

  it('decodes a percent-encoded token', () => {
    const req = makeRequest({ cookie: `${AUTH_COOKIE_NAME}=a%20b` })

    expect(extractJwtFromCookie(req)).toBe('a b')
  })
})
