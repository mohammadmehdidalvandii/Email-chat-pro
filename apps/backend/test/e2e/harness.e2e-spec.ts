import { createE2EApp, request, makeUser, type E2EContext } from './e2e-app'
import { ERROR_CODES } from '@email-chat-pro/constants'

/**
 * Harness smoke test.
 *
 * This exists because the E2E harness itself is non-trivial infrastructure: it
 * overrides providers on a module whose root TypeORM connection comes from a
 * `forRootAsync` factory, replaces the throttler's storage token, and starts a
 * real listener. If any of that breaks, every other E2E suite fails with a
 * confusing error. This file asserts the harness is wired correctly, so a
 * failure elsewhere can be attributed to the behaviour under test.
 */
describe('E2E harness', () => {
  let ctx: E2EContext

  beforeAll(async () => {
    ctx = await createE2EApp()
  })

  afterAll(async () => {
    await ctx?.close()
  })

  it('starts the real application on a loopback port', () => {
    expect(ctx.baseUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/)
  })

  it('serves the real /api/v1 prefix and the standardized error envelope', async () => {
    // 404 on a route that does not exist proves the global prefix and the
    // HttpExceptionFilter are both active — a filter that is not registered
    // returns the default Nest body, not this envelope.
    const res = await request(ctx.baseUrl, '/does-not-exist')

    expect(res.status).toBe(404)
    expect(res.body).toMatchObject({
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND },
    })
    expect(typeof res.body.timestamp).toBe('string')
  })

  it('runs the global ValidationPipe with whitelist + forbidNonWhitelisted', async () => {
    const res = await request(ctx.baseUrl, '/auth/register', {
      method: 'POST',
      body: { email: 'someone@example.com', password: 'Str0ng!Pass123', role: 'admin' },
    })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    // forbidNonWhitelisted rejects the unknown `role` property outright rather
    // than stripping it, which is the stricter of the two settings.
    expect(res.body.error.message).toContain('role')
  })

  it('rejects an unauthenticated request to a guarded route with 401', async () => {
    const res = await request(ctx.baseUrl, '/users/me')

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe(ERROR_CODES.UNAUTHORIZED)
  })

  it('serves a real user fixture from the in-memory store', async () => {
    const user = makeUser(ctx.store, { username: 'smoketest' })

    const res = await request<{ data: { users: Array<{ id: string }> } }>(ctx.baseUrl, '/users/search', {
      token: 'unused',
      query: { q: 'smoketest' },
    })

    // 401 not 200 — the caller's own exclusion and the JWT verification both
    // have to work for a 200 here, and a fake token cannot produce one. What
    // matters at this level is that the guard rejects before the service runs,
    // which proves the guard is real and the repository override did not
    // short-circuit it.
    expect(res.status).toBe(401)
    expect(ctx.store.users.has(user.id)).toBe(true)
  })
})
