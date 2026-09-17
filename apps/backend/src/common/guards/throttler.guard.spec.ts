import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import type { ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler'
import { AppThrottlerGuard } from './throttler.guard'

// @nestjs/jwt v12 ships ESM-only (type: module), which the CJS ts-jest pipeline
// cannot require. JwtService is mocked here; the real module is exercised by
// live verification.
jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}))

type TrackerAccess = {
  getTracker: (req: Record<string, unknown>) => Promise<string>
}

describe('AppThrottlerGuard', () => {
  const baseOptions: ThrottlerModuleOptions = {
    throttlers: [{ name: 'default', limit: 100, ttl: 900000 }],
    errorMessage: 'Too many requests. Try again later.',
  }

  let jwtService: { verify: jest.Mock }
  let guard: TrackerAccess

  beforeEach(() => {
    jwtService = { verify: jest.fn() }
    const instance = new AppThrottlerGuard(
      baseOptions,
      {} as ThrottlerStorage,
      new Reflector(),
      jwtService as unknown as JwtService,
    )
    guard = instance as unknown as TrackerAccess
  })

  describe('getTracker', () => {
    it('returns the authenticated user id when req.user is already populated', async () => {
      const tracker = await guard.getTracker({
        user: { id: 'user-42' },
        ip: '127.0.0.1',
        headers: {},
      })

      expect(tracker).toBe('user:user-42')
      expect(jwtService.verify).not.toHaveBeenCalled()
    })

    it('resolves the user id from a valid Bearer token when req.user is absent', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-7', email: 'a@b.c' })

      const tracker = await guard.getTracker({
        ip: '203.0.113.9',
        headers: { authorization: 'Bearer abc.def.ghi' },
      })

      expect(tracker).toBe('user:user-7')
      expect(jwtService.verify).toHaveBeenCalledWith('abc.def.ghi')
    })

    it('resolves the user id from the auth_token cookie', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-9', email: 'a@b.c' })

      const tracker = await guard.getTracker({
        ip: '203.0.113.9',
        headers: { cookie: 'x=1; auth_token=hello%20world' },
      })

      expect(tracker).toBe('user:user-9')
      expect(jwtService.verify).toHaveBeenCalledWith('hello world')
    })

    it('falls back to the client IP when no token is present', async () => {
      const tracker = await guard.getTracker({
        ip: '198.51.100.7',
        headers: {},
      })

      expect(tracker).toBe('ip:198.51.100.7')
      expect(jwtService.verify).not.toHaveBeenCalled()
    })

    it('falls back to the client IP when the token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid token')
      })

      const tracker = await guard.getTracker({
        ip: '198.51.100.7',
        headers: { authorization: 'Bearer bad-token' },
      })

      expect(tracker).toBe('ip:198.51.100.7')
    })

    it('falls back to "ip:unknown" when the request has no ip', async () => {
      const tracker = await guard.getTracker({ headers: {} })

      expect(tracker).toBe('ip:unknown')
    })
  })
})
