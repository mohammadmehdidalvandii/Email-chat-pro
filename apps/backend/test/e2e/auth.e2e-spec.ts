import { createHash } from 'node:crypto'
import { ERROR_CODES, ERROR_MESSAGES } from '@email-chat-pro/constants'
import {
  createE2EApp,
  makeUser,
  request,
  PLAIN_PASSWORD,
  type ApiEnvelope,
  type ApiErrorEnvelope,
  type E2EContext,
  type TestUser,
} from './e2e-app'

/**
 * Auth integration (P2, Step 5) — registration, verification, resend, login,
 * logout — driven over real HTTP against the real routing, ValidationPipe,
 * JwtAuthGuard, Passport strategy and services.
 *
 * The token email is captured by the harness recorder, which is how a test gets
 * hold of the verification token: the plaintext exists only in the outbound
 * mail, never in the API response or the database (only its SHA-256 hash is
 * stored). That is itself an assertion — no test peeks at a stored token.
 */
describe('auth (e2e)', () => {
  let ctx: E2EContext

  beforeAll(async () => {
    ctx = await createE2EApp()
  })

  afterAll(async () => {
    await ctx?.close()
  })

  beforeEach(() => {
    ctx.store.reset()
    ctx.mail.reset()
  })

  const register = (email: string, password = PLAIN_PASSWORD) =>
    request<ApiEnvelope<{ id: string; email: string; message: string }>>(ctx.baseUrl, '/auth/register', {
      method: 'POST',
      body: { email, password },
    })

  const login = (email: string, password = PLAIN_PASSWORD) =>
    request<ApiEnvelope<{ token: string; user: { id: string; email: string } }>>(
      ctx.baseUrl,
      '/auth/login',
      { method: 'POST', body: { email, password } },
    )

  const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

  // -------------------------------------------------------------------------
  describe('POST /auth/register', () => {
    it('creates an unverified account and returns 201 with the standard envelope', async () => {
      const res = await register('New.User@Example.com')

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.email).toBe('new.user@example.com')
      expect(typeof res.body.data.id).toBe('string')
      expect(typeof res.body.timestamp).toBe('string')
    })

    it('stores the account with the email lowercased, a bcrypt hash and no plaintext password', async () => {
      await register('Mixed.Case@Example.com')

      const stored = [...ctx.store.users.values()][0]
      expect(stored.email).toBe('mixed.case@example.com')
      // bcrypt hashes are $2a$/$2b$ prefixed and salted, so an equality check
      // against the plaintext would fail even if the value were stored wrongly.
      expect(String(stored.passwordHash)).toMatch(/^\$2[aby]\$\d{2}\$/)
      expect(String(stored.passwordHash)).not.toContain(PLAIN_PASSWORD)
    })

    it('creates the account in an unverified state with a hashed, expiring token', async () => {
      await register('pending@example.com')

      const stored = [...ctx.store.users.values()][0]
      expect(stored.isVerified).toBe(false)
      expect(stored.isActive).toBe(true)
      expect(stored.deletedAt).toBeNull()
      // Only the hash of the delivered token is persisted.
      const delivered = ctx.mail.sent[0].token
      expect(String(stored.verificationTokenHash)).toBe(hashToken(delivered))
      expect(String(stored.verificationTokenHash)).not.toBe(delivered)
      expect(stored.verificationTokenExpiresAt).toBeInstanceOf(Date)
    })

    it('sends the verification email to the normalized address and never returns the token', async () => {
      const res = await register('delivered@example.com')

      expect(ctx.mail.sent).toHaveLength(1)
      expect(ctx.mail.sent[0].email).toBe('delivered@example.com')
      // A 64-char hex token: 256 bits of entropy (architecture.md).
      expect(ctx.mail.sent[0].token).toMatch(/^[0-9a-f]{64}$/)
      expect(JSON.stringify(res.body)).not.toContain(ctx.mail.sent[0].token)
    })

    it('generates a distinct token for each account', async () => {
      await register('a@example.com')
      await register('b@example.com')

      expect(ctx.mail.sent[0].token).not.toBe(ctx.mail.sent[1].token)
    })

    it('rejects a duplicate address with 409, case-insensitively', async () => {
      await register('taken@example.com')

      const res = await register('TAKEN@example.com')

      expect(res.status).toBe(409)
      expect(res.body).toMatchObject({
        success: false,
        error: { code: ERROR_CODES.CONFLICT, message: ERROR_MESSAGES.EMAIL_ALREADY_REGISTERED },
      })
      // The duplicate attempt must not have sent a second email.
      expect(ctx.mail.sent).toHaveLength(1)
      expect(ctx.store.users.size).toBe(1)
    })

    it('never leaks the stored password hash in the response', async () => {
      const res = await register('leak@example.com')

      expect(JSON.stringify(res.body)).not.toContain('$2b$')
      expect(JSON.stringify(res.body)).not.toContain('passwordHash')
    })

    it.each([
      ['a missing email', { password: PLAIN_PASSWORD }],
      ['a malformed email', { email: 'not-an-email', password: PLAIN_PASSWORD }],
      ['a missing password', { email: 'nopass@example.com' }],
      ['a weak password', { email: 'weak@example.com', password: 'password' }],
    ])('rejects %s with a 400 validation error', async (_label, body) => {
      const res = await request<ApiErrorEnvelope>(ctx.baseUrl, '/auth/register', {
        method: 'POST',
        body,
      })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(ctx.store.users.size).toBe(0)
    })
  })

  // -------------------------------------------------------------------------
  describe('POST /auth/register — mail delivery failure', () => {
    it('returns 500 with a fixed message and no provider detail when delivery fails', async () => {
      ctx.mail.failNext = true

      const res = await register('undeliverable@example.com')

      expect(res.status).toBe(500)
      expect(res.body).toMatchObject({
        success: false,
        error: { code: ERROR_CODES.INTERNAL_ERROR, message: ERROR_MESSAGES.EMAIL_SEND_FAILED },
      })
      // The provider's own error text must not reach the client.
      expect(res.body.error.message).not.toContain('simulated mail transport failure')
    })

    it('keeps the account but clears the undelivered token, so resend can recover it', async () => {
      ctx.mail.failNext = true

      await register('recoverable@example.com')

      const stored = [...ctx.store.users.values()][0]
      expect(stored.email).toBe('recoverable@example.com')
      expect(stored.verificationTokenHash).toBeNull()
      expect(stored.verificationTokenExpiresAt).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  describe('POST /auth/verify-email', () => {
    it('verifies the account with the delivered token and clears it for reuse', async () => {
      await register('verifyme@example.com')
      const token = ctx.mail.sent[0].token

      const res = await request<ApiEnvelope<{ message: string }>>(ctx.baseUrl, '/auth/verify-email', {
        method: 'POST',
        body: { token },
      })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const stored = [...ctx.store.users.values()][0]
      expect(stored.isVerified).toBe(true)
      expect(stored.verifiedAt).toBeInstanceOf(Date)
      expect(stored.verificationTokenHash).toBeNull()
      expect(stored.verificationTokenExpiresAt).toBeNull()
    })

    it('rejects a replayed token, so verification cannot be performed twice', async () => {
      await register('replay@example.com')
      const token = ctx.mail.sent[0].token
      await request(ctx.baseUrl, '/auth/verify-email', { method: 'POST', body: { token } })

      const second = await request<ApiErrorEnvelope>(ctx.baseUrl, '/auth/verify-email', {
        method: 'POST',
        body: { token },
      })

      expect(second.status).toBe(400)
      expect(second.body.error.message).toBe(ERROR_MESSAGES.VERIFICATION_TOKEN_INVALID)
    })

    it('rejects an unknown token with the same generic error as a replay', async () => {
      await register('known@example.com')

      const res = await request<ApiErrorEnvelope>(ctx.baseUrl, '/auth/verify-email', {
        method: 'POST',
        body: { token: 'f'.repeat(64) },
      })

      expect(res.status).toBe(400)
      expect(res.body.error.message).toBe(ERROR_MESSAGES.VERIFICATION_TOKEN_INVALID)
    })

    it('rejects an expired token and leaves the account unverified', async () => {
      await register('expired@example.com')
      const token = ctx.mail.sent[0].token
      const stored = [...ctx.store.users.values()][0]
      stored.verificationTokenExpiresAt = new Date(Date.now() - 1000)

      const res = await request<ApiErrorEnvelope>(ctx.baseUrl, '/auth/verify-email', {
        method: 'POST',
        body: { token },
      })

      expect(res.status).toBe(400)
      expect(stored.isVerified).toBe(false)
    })

    it('rejects a token whose stored expiry is missing', async () => {
      await register('noexpiry@example.com')
      const token = ctx.mail.sent[0].token
      const stored = [...ctx.store.users.values()][0]
      stored.verificationTokenExpiresAt = null

      const res = await request(ctx.baseUrl, '/auth/verify-email', { method: 'POST', body: { token } })

      expect(res.status).toBe(400)
      expect(stored.isVerified).toBe(false)
    })

    it('rejects a malformed token with a 400 rather than reaching the service', async () => {
      const res = await request<ApiErrorEnvelope>(ctx.baseUrl, '/auth/verify-email', {
        method: 'POST',
        body: { token: 'short' },
      })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  describe('POST /auth/resend-verification', () => {
    it('rotates the token and re-sends the email for an unverified account', async () => {
      await register('rotate@example.com')
      const first = ctx.mail.sent[0].token
      const firstHash = String([...ctx.store.users.values()][0].verificationTokenHash)

      const res = await request<ApiEnvelope<{ message: string }>>(
        ctx.baseUrl,
        '/auth/resend-verification',
        { method: 'POST', body: { email: 'rotate@example.com' } },
      )

      expect(res.status).toBe(200)
      expect(ctx.mail.sent).toHaveLength(2)
      const second = ctx.mail.sent[1].token
      expect(second).not.toBe(first)
      expect(String([...ctx.store.users.values()][0].verificationTokenHash)).toBe(hashToken(second))
      expect(String([...ctx.store.users.values()][0].verificationTokenHash)).not.toBe(firstHash)
    })

    it('invalidates the previously issued token', async () => {
      await register('invalidate@example.com')
      const stale = ctx.mail.sent[0].token
      await request(ctx.baseUrl, '/auth/resend-verification', {
        method: 'POST',
        body: { email: 'invalidate@example.com' },
      })

      const res = await request<ApiErrorEnvelope>(ctx.baseUrl, '/auth/verify-email', {
        method: 'POST',
        body: { token: stale },
      })

      expect(res.status).toBe(400)
    })

    // Account enumeration: every non-actionable case must be byte-identical to
    // a genuine resend, or the endpoint reveals which addresses are registered.
    it.each([
      ['an unknown address', 'nobody@example.com'],
      ['an already-verified account', 'verified@example.com'],
      ['a soft-deleted account', 'deleted@example.com'],
      ['an inactive account', 'inactive@example.com'],
    ])('returns the identical generic 200 for %s and sends no email', async (_label, email) => {
      const seed = makeUser(ctx.store, { email })
      if (email === 'verified@example.com') seed.isVerified = true
      if (email === 'deleted@example.com') seed.deletedAt = new Date()
      if (email === 'inactive@example.com') seed.isActive = false
      seed.verificationTokenHash = 'existing-hash'
      ctx.store.users.set(seed.id, seed as never)

      const res = await request<ApiEnvelope<{ message: string }>>(
        ctx.baseUrl,
        '/auth/resend-verification',
        { method: 'POST', body: { email } },
      )

      expect(res.status).toBe(200)
      expect(res.body.data.message).toBe(ERROR_MESSAGES.RESEND_VERIFICATION_SENT)
      expect(ctx.mail.sent).toHaveLength(0)
      // The existing token is left untouched — these paths must not even
      // reach the token-rotation step.
      expect(ctx.store.users.get(seed.id)?.verificationTokenHash).toBe('existing-hash')
    })

    it('matches an existing account case-insensitively', async () => {
      await register('casing@example.com')

      const res = await request(ctx.baseUrl, '/auth/resend-verification', {
        method: 'POST',
        body: { email: 'CASING@example.com' },
      })

      expect(ctx.mail.sent).toHaveLength(2)
      expect(res.status).toBe(200)
    })

    it('clears the rotated token when the new email cannot be delivered', async () => {
      await register('resendfail@example.com')
      ctx.mail.failNext = true

      const res = await request<ApiErrorEnvelope>(ctx.baseUrl, '/auth/resend-verification', {
        method: 'POST',
        body: { email: 'resendfail@example.com' },
      })

      expect(res.status).toBe(500)
      const stored = ctx.store.users.get(
        [...ctx.store.users.values()][0].id,
      )
      expect(stored?.verificationTokenHash).toBeNull()
      expect(stored?.verificationTokenExpiresAt).toBeNull()
    })

    it('rejects a malformed address with a 400', async () => {
      const res = await request(ctx.baseUrl, '/auth/resend-verification', {
        method: 'POST',
        body: { email: 'nope' },
      })

      expect(res.status).toBe(400)
    })
  })

  // -------------------------------------------------------------------------
  describe('POST /auth/login', () => {
    it('returns a token and the user projection for a verified account', async () => {
      const user = makeUser(ctx.store, { email: 'login@example.com' })

      const res = await login('login@example.com')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.token.split('.')).toHaveLength(3)
      expect(res.body.data.user.id).toBe(user.id)
      expect(res.body.data.user.email).toBe('login@example.com')
    })

    it('never returns the password hash or verification state in the user projection', async () => {
      makeUser(ctx.store, { email: 'projection@example.com' })

      const res = await login('projection@example.com')

      expect(res.status).toBe(200)
      const user = res.body.data.user as Record<string, unknown>
      expect(user).not.toHaveProperty('passwordHash')
      expect(user).not.toHaveProperty('verificationTokenHash')
      expect(user).not.toHaveProperty('deletedAt')
      expect(JSON.stringify(res.body)).not.toContain('$2b$')
    })

    it('matches the email case-insensitively', async () => {
      makeUser(ctx.store, { email: 'lower@example.com' })

      const res = await login('LOWER@example.com')

      expect(res.status).toBe(200)
    })

    it('sets the auth_token cookie as httpOnly so browser JS cannot read it', async () => {
      makeUser(ctx.store, { email: 'cookie@example.com' })

      const res = await login('cookie@example.com')

      expect(res.cookies.auth_token).toBe(res.body.data.token)
      const setCookie = res.headers.get('set-cookie') ?? ''
      expect(setCookie).toMatch(/HttpOnly/i)
      // Path '/' is required for the cookie to be sent to every API route.
      expect(setCookie).toMatch(/Path=\//i)
      expect(setCookie).toMatch(/SameSite=Lax/i)
    })

    it('returns a 401 with the same message for an unknown account and a wrong password', async () => {
      makeUser(ctx.store, { email: 'real@example.com' })

      const unknown = await login('ghost@example.com')
      const wrongPassword = await login('real@example.com', 'Wr0ng!Pass123')

      expect(unknown.status).toBe(401)
      expect(wrongPassword.status).toBe(401)
      // Identical error payloads: the pair must not disclose which addresses
      // exist. `timestamp` is excluded because it is the response time.
      expect(wrongPassword.body.error).toEqual(unknown.body.error)
      expect(unknown.body).toMatchObject({
        error: { code: ERROR_CODES.UNAUTHORIZED, message: ERROR_MESSAGES.INVALID_CREDENTIALS },
      })
    })

    it('refuses an unverified account with the distinct EMAIL_NOT_VERIFIED error', async () => {
      makeUser(ctx.store, { email: 'unverified@example.com', isVerified: false })

      const res = await login('unverified@example.com')

      expect(res.status).toBe(401)
      expect(res.body).toMatchObject({
        error: { code: ERROR_CODES.UNAUTHORIZED, message: ERROR_MESSAGES.EMAIL_NOT_VERIFIED },
      })
    })

    it('refuses a soft-deleted account', async () => {
      makeUser(ctx.store, { email: 'gone@example.com', deletedAt: new Date() })

      const res = await login('gone@example.com')

      expect(res.status).toBe(401)
      expect(res.body.error.message).toBe(ERROR_MESSAGES.INVALID_CREDENTIALS)
    })

    it('refuses a deactivated account', async () => {
      makeUser(ctx.store, { email: 'off@example.com', isActive: false })

      const res = await login('off@example.com')

      expect(res.status).toBe(401)
    })

    it('issues no cookie on a failed login', async () => {
      makeUser(ctx.store, { email: 'nocookie@example.com' })

      const res = await login('nocookie@example.com', 'Wr0ng!Pass123')

      expect(res.cookies.auth_token).toBeUndefined()
    })

    it('rejects a missing password with a 400 rather than a 401', async () => {
      const res = await request(ctx.baseUrl, '/auth/login', {
        method: 'POST',
        body: { email: 'nopass@example.com' },
      })

      // Validation runs before authentication, so this is a 400 and not the
      // generic 401 — an attacker cannot use it to probe for real accounts.
      expect(res.status).toBe(400)
    })
  })

  // -------------------------------------------------------------------------
  describe('authenticated session', () => {
    it('accepts a login token on a bearer header', async () => {
      const user = makeUser(ctx.store, { email: 'bearer@example.com' })
      const { body } = await login('bearer@example.com')

      const res = await request<ApiEnvelope<{ id: string }>>(ctx.baseUrl, '/users/me', {
        token: body.data.token,
      })

      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(user.id)
    })

    it('accepts the same token as the httpOnly cookie a browser sends', async () => {
      const user = makeUser(ctx.store, { email: 'cookieauth@example.com' })
      const { body } = await login('cookieauth@example.com')

      const res = await request<ApiEnvelope<{ id: string }>>(ctx.baseUrl, '/users/me', {
        token: body.data.token,
        asCookie: true,
      })

      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(user.id)
    })

    it.each([
      ['a missing token', undefined],
      ['a malformed token', 'not-a-jwt'],
      ['a token with a tampered payload', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.bad'],
    ])('rejects %s with 401', async (_label, token) => {
      const res = await request<ApiErrorEnvelope>(ctx.baseUrl, '/users/me', { token })

      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe(ERROR_CODES.UNAUTHORIZED)
    })

    it('rejects a token signed with a different secret', async () => {
      // Forged with a plausible header/payload but the wrong key — this is the
      // attack the JWT_SECRET requirement exists to stop.
      const forged =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAwMSIsImVtYWlsIjoiYXR0YWNrZXJAZXhhbXBsZS5jb20ifQ.' +
        'ZmFrZS1zaWduYXR1cmUtdGhhdC1jYW5ub3QtdmVyaWZ5'

      const res = await request<ApiErrorEnvelope>(ctx.baseUrl, '/users/me', { token: forged })

      expect(res.status).toBe(401)
    })

    it('rejects an expired token', async () => {
      const expired =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxMDAwMDAwMDAwfQ.' +
        'ZmFrZS1zaWduYXR1cmUtdGhhdC1jYW5ub3QtdmVyaWZ5'

      const res = await request<ApiErrorEnvelope>(ctx.baseUrl, '/users/me', { token: expired })

      expect(res.status).toBe(401)
    })
  })

  // -------------------------------------------------------------------------
  describe('POST /auth/logout', () => {
    it('returns 200 and clears the cookie with the same path it was set with', async () => {
      makeUser(ctx.store, { email: 'logout@example.com' })
      const { body } = await login('logout@example.com')

      const res = await request<ApiEnvelope<{ message: string }>>(ctx.baseUrl, '/auth/logout', {
        method: 'POST',
        token: body.data.token,
      })

      expect(res.status).toBe(200)
      expect(res.body.data.message).toBe(ERROR_MESSAGES.LOGGED_OUT)
      // A clearCookie with a mismatched path does not clear anything in a real
      // browser, which would leave the session alive after logout.
      expect(res.headers.get('set-cookie') ?? '').toMatch(/auth_token=;/)
      expect(res.headers.get('set-cookie') ?? '').toMatch(/Path=\//i)
    })

    it('is reachable without a token, so a stale cookie can still be cleared', async () => {
      const res = await request(ctx.baseUrl, '/auth/logout', { method: 'POST' })

      expect(res.status).toBe(200)
    })

    // Tokens are stateless, so logout cannot revoke them server-side; the
    // cookie clear is the whole mechanism. Recorded explicitly so the
    // behaviour is known rather than assumed.
    it('does not invalidate the token, which remains a stateless bearer credential', async () => {
      const user = makeUser(ctx.store, { email: 'stateless@example.com' })
      const { body } = await login('stateless@example.com')
      await request(ctx.baseUrl, '/auth/logout', { method: 'POST', token: body.data.token })

      const res = await request(ctx.baseUrl, '/users/me', { token: body.data.token })

      expect(res.status).toBe(200)
      expect((res.body as ApiEnvelope<{ id: string }>).data.id).toBe(user.id)
    })
  })
})
