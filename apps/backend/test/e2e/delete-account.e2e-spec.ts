import { ERROR_CODES, ERROR_MESSAGES } from '@email-chat-pro/constants'
import {
  createE2EApp,
  loginAs,
  makeUser,
  request,
  type ApiEnvelope,
  type E2EContext,
  PLAIN_PASSWORD,
} from './e2e-app'

describe('delete-account (e2e)', () => {
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

  it('DELETE /users/me deletes account and enforces auth-after-deletion', async () => {
    const user = makeUser(ctx.store, { email: 'delete@example.com' })
    const token = await loginAs(ctx.baseUrl, user.email)

    // 1. Verify authenticated access works before deletion
    const profileRes = await request(ctx.baseUrl, '/users/me', { token })
    expect(profileRes.status).toBe(200)

    // 2. Perform deletion
    const deleteRes = await request<ApiEnvelope<{ message: string }>>(ctx.baseUrl, '/users/me', {
      method: 'DELETE',
      token,
      body: { password: PLAIN_PASSWORD },
    })

    expect(deleteRes.status).toBe(200)
    expect(deleteRes.body.data.message).toBe(ERROR_MESSAGES.ACCOUNT_DELETED)

    // 3. Verify account state in DB (anonymization)
    const stored = ctx.store.users.get(user.id)
    expect(stored).toBeDefined()
    expect(stored?.isActive).toBe(false)
    expect(stored?.username).toMatch(/^deleted#/)
    expect(stored?.passwordHash).toBe('')

    // 4. Verify auth token is now invalid (JwtAuthGuard rejects inactive/deleted)
    const accessRes = await request(ctx.baseUrl, '/users/me', { token })
    expect(accessRes.status).toBe(401)
  })

  it('DELETE /users/me with wrong password rejects', async () => {
    const user = makeUser(ctx.store, { email: 'wrong-pass@example.com' })
    const token = await loginAs(ctx.baseUrl, user.email)

    const res = await request(ctx.baseUrl, '/users/me', {
      method: 'DELETE',
      token,
      body: { password: 'wrong-password' },
    })

    expect(res.status).toBe(401)
    expect((res.body as any).error.code).toBe(ERROR_CODES.PASSWORD_INCORRECT)
  })
})
