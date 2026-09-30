import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { ERROR_MESSAGES } from '@email-chat-pro/constants'
import { LoginDto } from './login.dto'
import { RegisterDto } from './register.dto'
import { ResendVerificationDto } from './resend-verification.dto'
import { VerifyEmailDto } from './verify-email.dto'

/**
 * Validation of the four public auth request bodies (P2 — none had a spec).
 *
 * These are the unauthenticated endpoints, so they are the widest attack
 * surface in the app: everything reaching them is untrusted. They also share
 * the same email/password/verification rules, so each rule is asserted on the
 * DTO that actually uses it and the shared-email equivalence between
 * `RegisterDto` and `ResendVerificationDto` is asserted explicitly.
 *
 * The same class-validator rules the global ValidationPipe applies in main.ts
 * are run directly, so a failure here is the failure a client would see as
 * VALIDATION_ERROR 400.
 */
describe('auth request DTOs', () => {
  const messagesFor = async (cls: new () => object, payload: Record<string, unknown>) => {
    const errors = await validate(plainToInstance(cls, payload))
    return errors.flatMap((e) => Object.values(e.constraints ?? {}))
  }

  /** A password satisfying PASSWORD_REGEX: upper, lower, digit, special, 8+ chars. */
  const STRONG_PASSWORD = 'Str0ng!Pass'

  describe('RegisterDto', () => {
    const check = (payload: Record<string, unknown>) => messagesFor(RegisterDto, payload)

    it('accepts a valid email and a compliant password', async () => {
      expect(await check({ email: 'user@example.com', password: STRONG_PASSWORD })).toEqual([])
    })

    it('rejects a missing email', async () => {
      expect(await check({ password: STRONG_PASSWORD })).toContain(ERROR_MESSAGES.EMAIL_REQUIRED)
    })

    it('rejects a missing password', async () => {
      const messages = await check({ email: 'user@example.com' })

      expect(messages).toContain(ERROR_MESSAGES.PASSWORD_REQUIRED)
      // A missing password also fails the strength rule, so the client is told
      // both that it is required and what it must look like.
      expect(messages).toContain(ERROR_MESSAGES.PASSWORD_WEAK)
    })

    it('rejects an empty body', async () => {
      const messages = await check({})

      expect(messages).toContain(ERROR_MESSAGES.EMAIL_REQUIRED)
      expect(messages).toContain(ERROR_MESSAGES.PASSWORD_REQUIRED)
    })

    it.each([
      ['a non-string email', 12345],
      ['a null email', null],
      ['an array email', ['user@example.com']],
    ])('rejects %s', async (_label, email) => {
      expect(await check({ email, password: STRONG_PASSWORD })).toContain(
        ERROR_MESSAGES.EMAIL_REQUIRED,
      )
    })

    it.each([
      ['a string with no @', 'userexample.com'],
      ['a string with no domain dot', 'user@example'],
      ['a string with a space', 'user @example.com'],
      ['a string with a trailing dot and no TLD', 'user@example.'],
      ['a header-injection attempt', 'user@example.com\r\nBcc: attacker@evil.com'],
    ])('rejects %s as an email', async (_label, email) => {
      expect(await check({ email, password: STRONG_PASSWORD })).toContain(
        ERROR_MESSAGES.EMAIL_INVALID,
      )
    })

    it('rejects an email shorter than the shared minimum length', async () => {
      // 'a@b.c' is 5 characters — one below EMAIL_MIN_LENGTH.
      expect(await check({ email: 'a@.bc', password: STRONG_PASSWORD })).toContain(
        ERROR_MESSAGES.EMAIL_INVALID,
      )
    })

    it('rejects an email longer than the shared maximum length', async () => {
      const long = `${'a'.repeat(250)}@example.com`

      expect(await check({ email: long, password: STRONG_PASSWORD })).toContain(
        ERROR_MESSAGES.EMAIL_INVALID,
      )
    })

    it.each([
      ['no lowercase letter', 'STR0NG!PASS'],
      ['no uppercase letter', 'str0ng!pass'],
      ['no digit', 'Strong!Pass'],
      ['no special character', 'Str0ngPass1'],
      ['only special characters', '!!!!!!!!'],
      ['shorter than 8 characters', 'St0!Pa'],
    ])('rejects a password with %s', async (_label, password) => {
      expect(await check({ email: 'user@example.com', password })).toContain(
        ERROR_MESSAGES.PASSWORD_WEAK,
      )
    })

    it('accepts a password at exactly the 8-character minimum', async () => {
      expect(await check({ email: 'user@example.com', password: 'Str0ng!P' })).toEqual([])
    })

    it('rejects a non-string password', async () => {
      expect(await check({ email: 'user@example.com', password: 12345678 })).toContain(
        ERROR_MESSAGES.PASSWORD_REQUIRED,
      )
    })
  })

  describe('LoginDto', () => {
    const check = (payload: Record<string, unknown>) => messagesFor(LoginDto, payload)

    it('accepts a valid email and a compliant password', async () => {
      expect(await check({ email: 'user@example.com', password: STRONG_PASSWORD })).toEqual([])
    })

    it('requires both fields', async () => {
      const messages = await check({})

      expect(messages).toContain(ERROR_MESSAGES.EMAIL_REQUIRED)
      expect(messages).toContain(ERROR_MESSAGES.PASSWORD_REQUIRED)
    })

    it('rejects a malformed email before the service ever sees it', async () => {
      expect(await check({ email: 'not-an-email', password: STRONG_PASSWORD })).toContain(
        ERROR_MESSAGES.EMAIL_INVALID,
      )
    })

    it.each([
      ['a password with no special character', 'Str0ngPass'],
      ['a password with no digit', 'Strong!Pass'],
      ['an empty password', ''],
    ])('rejects %s', async (_label, password) => {
      expect(await check({ email: 'user@example.com', password })).not.toEqual([])
    })
  })

  describe('ResendVerificationDto', () => {
    const check = (payload: Record<string, unknown>) => messagesFor(ResendVerificationDto, payload)

    it('accepts a valid email', async () => {
      expect(await check({ email: 'user@example.com' })).toEqual([])
    })

    it('rejects a missing email', async () => {
      expect(await check({})).toContain(ERROR_MESSAGES.EMAIL_REQUIRED)
    })

    it('rejects a malformed email', async () => {
      expect(await check({ email: 'plainaddress' })).toContain(ERROR_MESSAGES.EMAIL_INVALID)
    })

    it('applies exactly the same email rules as registration', async () => {
      // The endpoint reissues a token for an existing account, so it must not
      // accept an address that registration would have refused.
      const candidates = [
        'user@example.com',
        'not-an-email',
        'a@.bc',
        `${'a'.repeat(250)}@example.com`,
        'user@example.com\r\nBcc: attacker@evil.com',
      ]
      const passwordMessages = [ERROR_MESSAGES.PASSWORD_REQUIRED, ERROR_MESSAGES.PASSWORD_WEAK]

      for (const email of candidates) {
        const onRegister = (
          await messagesFor(RegisterDto, { email, password: STRONG_PASSWORD })
        ).filter((m) => !passwordMessages.includes(m))

        expect({ email, resend: await check({ email }) }).toEqual({ email, resend: onRegister })
      }
    })
  })

  describe('VerifyEmailDto', () => {
    const check = (payload: Record<string, unknown>) => messagesFor(VerifyEmailDto, payload)

    it('accepts a token of exactly the shared length', async () => {
      expect(await check({ token: 'a'.repeat(64) })).toEqual([])
    })

    it('rejects a missing token', async () => {
      expect(await check({})).toContain(ERROR_MESSAGES.VERIFICATION_TOKEN_REQUIRED)
    })

    it('rejects a non-string token', async () => {
      expect(await check({ token: { value: 'x'.repeat(64) } })).toContain(
        ERROR_MESSAGES.VERIFICATION_TOKEN_REQUIRED,
      )
    })

    it.each([
      ['one character short', 63],
      ['one character long', 65],
      ['an empty string', 0],
    ])('rejects a token that is %s', async (_label, length) => {
      expect(await check({ token: 'a'.repeat(length) })).toContain(
        ERROR_MESSAGES.VERIFICATION_TOKEN_INVALID,
      )
    })
  })
})
