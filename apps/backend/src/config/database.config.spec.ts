/**
 * Production database resolution (P1-6).
 *
 * The hardcoded local development URL is a convenience, not a fallback: in
 * production a missing or unparseable DATABASE_URL must fail fast rather than
 * silently connecting the deployment to a developer's local database.
 *
 * The environment is restored after every test, and the assertions below never
 * read or assert on the development URL's contents.
 */
import { getDatabaseConfig } from './database.config'

describe('database.config', () => {
  const ORIGINAL_ENV = process.env

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  /**
   * The url actually handed to TypeORM, or the error it threw. getDatabaseConfig
   * reads process.env at call time, so no module reloading is needed for each
   * case to observe its own environment.
   */
  const resolve = () => {
    try {
      return { url: getDatabaseConfig().url as string }
    } catch (error) {
      return { error: error as Error }
    }
  }

  describe('production', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
    })

    it('uses the configured DATABASE_URL when it is a valid postgres URL', () => {
      process.env.DATABASE_URL = 'postgresql://app_user:app_secret@db.internal:5432/email_chat_pro'

      expect(resolve().url).toBe(process.env.DATABASE_URL)
    })

    it('accepts the postgres:// protocol as well as postgresql://', () => {
      process.env.DATABASE_URL = 'postgres://app_user:app_secret@db.internal:5432/email_chat_pro'

      expect(resolve().url).toBe(process.env.DATABASE_URL)
    })

    it('fails fast when DATABASE_URL is missing, instead of using the local default', () => {
      delete process.env.DATABASE_URL

      const { error } = resolve()

      expect(error).toBeInstanceOf(Error)
      expect(error?.message).toContain('DATABASE_URL')
    })

    it.each([
      ['a non-URL string', 'not-a-url'],
      ['a bare hostname', 'db.internal:5432/email_chat_pro'],
      ['an empty string', ''],
      ['a mysql URL', 'mysql://app_user:app_secret@db.internal:3306/email_chat_pro'],
    ])('fails fast on %s', (_label, value) => {
      process.env.DATABASE_URL = value

      const { error } = resolve()

      expect(error).toBeInstanceOf(Error)
      expect(error?.message).toContain('DATABASE_URL')
    })

    it('never returns the local development default in production', () => {
      delete process.env.DATABASE_URL

      const { url, error } = resolve()

      expect(url).toBeUndefined()
      expect(error).toBeInstanceOf(Error)
    })

    it('does not leak credentials or the configured URL into the thrown message', () => {
      process.env.DATABASE_URL = 'mysql://app_user:sup3r_secret@db.internal:3306/email_chat_pro'

      const { error } = resolve()

      expect(error?.message).not.toContain('sup3r_secret')
      expect(error?.message).not.toContain('app_user')
      expect(error?.message).not.toContain('db.internal')
    })

    it('does not leak the credentials of a missing-but-misconfigured URL either', () => {
      delete process.env.DATABASE_URL

      const { error } = resolve()

      expect(error?.message).not.toContain('127.0.0.1')
      expect(error?.message).not.toContain('password')
    })
  })

  describe('outside production', () => {
    it.each([['development'], ['test'], [undefined]])(
      'keeps the development fallback when NODE_ENV is %s',
      (env) => {
        if (env === undefined) {
          delete process.env.NODE_ENV
        } else {
          process.env.NODE_ENV = env
        }
        delete process.env.DATABASE_URL

        expect(() => resolve().error).not.toThrow()
      },
    )

    it('still honors an explicitly configured DATABASE_URL', () => {
      process.env.NODE_ENV = 'development'
      process.env.DATABASE_URL = 'postgres://app_user:app_secret@db.internal:5432/email_chat_pro'

      expect(resolve().url).toBe(process.env.DATABASE_URL)
    })

    it('returns the local default when no URL is configured outside production', () => {
      process.env.NODE_ENV = 'development'
      delete process.env.DATABASE_URL

      const { url, error } = resolve()

      expect(error).toBeUndefined()
      expect(url).toMatch(/^postgres:\/\/[^@]+@127\.0\.0\.1:5432\//)
    })
  })

  describe('shape', () => {
    it('never enables schema synchronization', () => {
      process.env.NODE_ENV = 'development'
      delete process.env.DATABASE_URL

      expect(getDatabaseConfig().synchronize).toBe(false)
    })

    it('keeps the remaining TypeORM options unchanged', () => {
      process.env.NODE_ENV = 'development'
      delete process.env.DATABASE_URL

      const config = getDatabaseConfig()

      expect(config.type).toBe('postgres')
      expect(config.autoLoadEntities).toBe(true)
    })
  })
})
