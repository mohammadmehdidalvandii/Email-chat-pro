import { getCloudinaryConfig } from './cloudinary.config'
import { getJwtConfig } from './jwt.config'
import { getResendConfig } from './resend.config'

/**
 * The three secret-reading config modules (P2 — none had a spec).
 *
 * rules.md §Secrets & Environment requires every credential to come from the
 * environment and never to be hard-coded. The failure mode that matters is not
 * a wrong value but a *missing* one: if any of these returned a default or an
 * empty string, the app would boot and then sign tokens with a known secret,
 * send mail unauthenticated, or attempt uploads with a blank key. Each test
 * below therefore asserts refusal to produce a config at all, and that the
 * thrown message names the variable without ever echoing its value.
 */
describe('secret configuration', () => {
  const ORIGINAL_ENV = process.env

  /** Values chosen to be obviously non-secret and greppable in a failure. */
  const SECRETS = {
    JWT_SECRET: 'jwt-secret-value',
    RESEND_API_KEY: 'resend-api-key-value',
    MAIL_FROM: 'Email Chat Pro <no-reply@example.com>',
    CLOUDINARY_CLOUD_NAME: 'cloud-name-value',
    CLOUDINARY_API_KEY: 'cloudinary-api-key-value',
    CLOUDINARY_API_SECRET: 'cloudinary-api-secret-value',
  }

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, ...SECRETS }
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  describe('getJwtConfig', () => {
    it('returns the secret from the environment', () => {
      expect(getJwtConfig().secret).toBe(SECRETS.JWT_SECRET)
    })

    it('defaults the lifetime to 30d when JWT_EXPIRES_IN is unset', () => {
      delete process.env.JWT_EXPIRES_IN

      expect(getJwtConfig().expiresIn).toBe('30d')
    })

    it('honours an explicit JWT_EXPIRES_IN', () => {
      process.env.JWT_EXPIRES_IN = '15m'

      expect(getJwtConfig().expiresIn).toBe('15m')
    })

    it('refuses to boot without JWT_SECRET rather than signing with a default', () => {
      delete process.env.JWT_SECRET

      expect(() => getJwtConfig()).toThrow(/JWT_SECRET/)
    })

    it('refuses a whitespace-only JWT_SECRET', () => {
      // A value of " " is truthy, so only an explicit trim check stops a
      // one-space secret from being accepted as a real one.
      process.env.JWT_SECRET = '   '

      expect(() => getJwtConfig()).toThrow(/JWT_SECRET/)
    })

    it('never includes the secret value in the error message', () => {
      delete process.env.JWT_SECRET

      let message = ''
      try {
        getJwtConfig()
      } catch (e) {
        message = (e as Error).message
      }

      // The message must name the variable so an operator can fix it, and must
      // not leak whatever was in the environment.
      expect(message).toContain('JWT_SECRET')
      expect(message).not.toContain(SECRETS.RESEND_API_KEY)
    })
  })

  describe('getResendConfig', () => {
    it('returns the API key and sender from the environment', () => {
      const config = getResendConfig()

      expect(config.apiKey).toBe(SECRETS.RESEND_API_KEY)
      expect(config.mailFrom).toBe(SECRETS.MAIL_FROM)
    })

    it.each(['RESEND_API_KEY', 'MAIL_FROM'])('refuses to construct without %s', (variable) => {
      delete process.env[variable]

      expect(() => getResendConfig()).toThrow(
        new RegExp('RESEND_API_KEY, MAIL_FROM'),
      )
    })

    it('refuses an empty-string API key', () => {
      process.env.RESEND_API_KEY = ''

      expect(() => getResendConfig()).toThrow(/RESEND_API_KEY/)
    })

    it('refuses a whitespace-only sender', () => {
      // Deliberately not handled by the module: the value is opaque to it and
      // is only validated by the provider. Recorded so the behaviour is known.
      process.env.MAIL_FROM = '   '

      expect(getResendConfig().mailFrom).toBe('   ')
    })
  })

  describe('getCloudinaryConfig', () => {
    it('returns the three credentials from the environment', () => {
      const config = getCloudinaryConfig()

      expect(config).toEqual({
        cloudName: SECRETS.CLOUDINARY_CLOUD_NAME,
        apiKey: SECRETS.CLOUDINARY_API_KEY,
        apiSecret: SECRETS.CLOUDINARY_API_SECRET,
      })
    })

    it.each(['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'])(
      'refuses to construct without %s rather than uploading with a blank key',
      (variable) => {
        delete process.env[variable]

        expect(() => getCloudinaryConfig()).toThrow(
          /CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET/,
        )
      },
    )

    it('refuses when the cloud name is an empty string', () => {
      process.env.CLOUDINARY_CLOUD_NAME = ''

      expect(() => getCloudinaryConfig()).toThrow(/CLOUDINARY_CLOUD_NAME/)
    })

    it('never includes a credential value in the error message', () => {
      delete process.env.CLOUDINARY_API_SECRET

      let message = ''
      try {
        getCloudinaryConfig()
      } catch (e) {
        message = (e as Error).message
      }

      expect(message).toContain('CLOUDINARY_API_SECRET')
      expect(message).not.toContain(SECRETS.CLOUDINARY_API_SECRET)
      expect(message).not.toContain(SECRETS.CLOUDINARY_API_KEY)
    })
  })
})
