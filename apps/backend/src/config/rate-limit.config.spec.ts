import { ERROR_MESSAGES } from '@email-chat-pro/constants'
import { GLOBAL_THROTTLE, endpointThrottles, throttlerModuleOptions } from './rate-limit.config'

/**
 * Pins the rate-limit values to the exact figures in architecture.md
 * (§Rate Limiting Strategy — Global and Endpoint-Specific Limits). These are
 * configuration constants, not invented here, so any drift from the approved
 * numbers fails the suite.
 */
describe('rate-limit.config', () => {
  describe('GLOBAL_THROTTLE', () => {
    it('enforces the architecture global default of 100 requests per 15 minutes (900000 ms)', () => {
      expect(GLOBAL_THROTTLE).toEqual({ name: 'default', limit: 100, ttl: 900000 })
    })
  })

  describe('endpointThrottles', () => {
    it('limits login to 5 attempts per 15 minutes (900000 ms)', () => {
      expect(endpointThrottles.LOGIN).toEqual({ default: { limit: 5, ttl: 900000 } })
    })

    it('limits registration to 3 attempts per hour (3600000 ms)', () => {
      expect(endpointThrottles.REGISTER).toEqual({ default: { limit: 3, ttl: 3600000 } })
    })

    it('limits message sending to 100 messages per hour (3600000 ms)', () => {
      expect(endpointThrottles.SEND_MESSAGE).toEqual({
        default: { limit: 100, ttl: 3600000 },
      })
    })

    it('limits user search to 50 requests per hour (3600000 ms)', () => {
      expect(endpointThrottles.SEARCH_USERS).toEqual({ default: { limit: 50, ttl: 3600000 } })
    })

    it('limits file uploads to 5 per hour (3600000 ms)', () => {
      expect(endpointThrottles.UPLOAD_FILE).toEqual({ default: { limit: 5, ttl: 3600000 } })
    })

    // P1-5: these two endpoints previously had no per-endpoint limit and were
    // only covered by the 100/15min global default. architecture.md lists no
    // value for either, so these are the agreed project-convention values.
    it('limits contact requests to 10 per hour (3600000 ms)', () => {
      expect(endpointThrottles.CONTACT_REQUEST).toEqual({ default: { limit: 10, ttl: 3600000 } })
    })

    it('limits email verification to 10 attempts per 15 minutes (900000 ms)', () => {
      expect(endpointThrottles.VERIFY_EMAIL).toEqual({ default: { limit: 10, ttl: 900000 } })
    })
  })

  describe('coverage', () => {
    // Every @Throttle(...) must reference a real key: a typo would silently
    // fall back to the global default.
    it('exposes only the documented endpoint keys', () => {
      expect(Object.keys(endpointThrottles).sort()).toEqual([
        'CONTACT_REQUEST',
        'LOGIN',
        'REGISTER',
        'SEARCH_USERS',
        'SEND_MESSAGE',
        'UPLOAD_FILE',
        'VERIFY_EMAIL',
      ])
    })

    it('keeps every endpoint limit tighter than or equal to a day', () => {
      for (const [key, value] of Object.entries(endpointThrottles)) {
        expect(`${key}:${value.default.limit}`).toMatch(/^[A-Z_]+:\d+$/)
        expect(value.default.limit).toBeGreaterThan(0)
        expect(value.default.ttl).toBeGreaterThan(0)
        expect(value.default.ttl).toBeLessThanOrEqual(24 * 60 * 60 * 1000)
      }
    })
  })

  describe('throttlerModuleOptions', () => {
    it('applies the global throttle and the documented 429 message', () => {
      expect(throttlerModuleOptions()).toEqual({
        throttlers: [GLOBAL_THROTTLE],
        errorMessage: ERROR_MESSAGES.TOO_MANY_REQUESTS,
      })
    })
  })
})
