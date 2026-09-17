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
