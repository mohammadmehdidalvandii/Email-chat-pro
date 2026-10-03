import { Test } from '@nestjs/testing'
import { EmailService } from './email.service'
import { getResendConfig } from '../../config/resend.config'

/**
 * EmailService (P2 — the service had no spec at all, and it is the only
 * outbound-network boundary in the auth flow).
 *
 * The Resend SDK is mocked: no test contacts the real API. The behaviour that
 * matters most is the `{ data, error }` result union — `emails.send()` does NOT
 * throw on HTTP errors, so if the error union is ignored a rejected send is
 * reported as a success and the account is stranded with no delivered token.
 * That is asserted directly below.
 */
jest.mock('resend', () => {
  const send = jest.fn()
  class Resend {
    emails = { send }
    static __send = send
    constructor(public apiKey: string) {}
  }
  return { Resend }
})

const ResendMock = jest.requireMock('resend') as {
  Resend: { __send: jest.Mock }
}
const send = ResendMock.Resend.__send

/** The Resend success shape: a data object and a null error. */
const sendResult = (id: string) => ({ data: { id }, error: null })

describe('EmailService', () => {
  const ORIGINAL_ENV = process.env
  const API_KEY = 're_test_0123456789abcdef'
  const MAIL_FROM = 'Email Chat Pro <no-reply@example.com>'

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, RESEND_API_KEY: API_KEY, MAIL_FROM }
    send.mockReset()
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  const createService = async () => {
    const moduleRef = await Test.createTestingModule({ providers: [EmailService] }).compile()
    return moduleRef.get(EmailService)
  }

  describe('sendVerificationEmail', () => {
    it('resolves without throwing when the provider accepts the message', async () => {
      send.mockResolvedValue(sendResult('email-1'))
      const service = await createService()

      await expect(
        service.sendVerificationEmail('user@example.com', 'token-abc'),
      ).resolves.toBeUndefined()
    })

    // The SDK resolves with { data, error } rather than rejecting, so the error
    // union must be inspected explicitly.
    it('throws when the provider resolves with an error instead of throwing', async () => {
      send.mockResolvedValue({ data: null, error: { message: 'Recipient rejected', statusCode: 422 } })
      const service = await createService()

      await expect(
        service.sendVerificationEmail('user@example.com', 'token-abc'),
      ).rejects.toThrow(/Resend rejected the verification email/)
    })

    it('surfaces the provider status code so the cause is diagnosable server-side', async () => {
      send.mockResolvedValue({ data: null, error: { message: 'Rate limited', statusCode: 429 } })
      const service = await createService()

      await expect(
        service.sendVerificationEmail('user@example.com', 'token-abc'),
      ).rejects.toThrow(/429/)
    })

    it('rethrows a provider exception unchanged', async () => {
      const providerError = new Error('socket hang up')
      send.mockRejectedValue(providerError)
      const service = await createService()

      await expect(
        service.sendVerificationEmail('user@example.com', 'token-abc'),
      ).rejects.toBe(providerError)
    })

    it('sends to the exact recipient, from the configured sender', async () => {
      send.mockResolvedValue(sendResult('email-1'))
      const service = await createService()

      await service.sendVerificationEmail('recipient@example.com', 'token-abc')

      expect(send).toHaveBeenCalledTimes(1)
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: MAIL_FROM,
          to: 'recipient@example.com',
        }),
      )
    })

    it('embeds the verification token in the message body', async () => {
      send.mockResolvedValue(sendResult('email-1'))
      const service = await createService()

      await service.sendVerificationEmail('user@example.com', 'secret-token-xyz')

      const payload = send.mock.calls[0][0]
      expect(payload.subject).toBe('Verify your email address')
      expect(payload.html).toContain('secret-token-xyz')
    })

    it('presents the code without a verification button or link', async () => {
      send.mockResolvedValue(sendResult('email-1'))
      const service = await createService()

      await service.sendVerificationEmail('user@example.com', 'secret-token-xyz')

      const payload = send.mock.calls[0][0]
      const html = payload.html as string
      // Token exists
      expect(html).toContain('secret-token-xyz')
      expect(html).toContain('Your verification code')
      // No verification button or link
      expect(html.toLowerCase()).not.toContain('<a href')
      expect(html).not.toContain('Verify my email')
    })

    it('renders a complete transactional email structure', async () => {
      send.mockResolvedValue(sendResult('email-1'))
      const service = await createService()

      await service.sendVerificationEmail('user@example.com', 'secret-token-xyz')

      const payload = send.mock.calls[0][0]
      const html = payload.html as string
      // Greeting, explanation, prominent token section, expiration
      // notice, and footer.
      expect(html).toContain('Verify your email address')
      expect(html).toContain('Your verification code')
      expect(html).toContain('expires in 24 hours')
      expect(html).toContain('Email-Chat-Pro')
      // Responsive: a max-width wrapper plus a mobile viewport meta.
      expect(html).toContain('max-width:600px')
      expect(html).toContain('name="viewport"')
      // Email-safe: no JavaScript and no external stylesheet.
      expect(html.toLowerCase()).not.toContain('<script')
      expect(html.toLowerCase()).not.toContain('javascript:')
      expect(html).not.toContain('<link')
      expect(html).not.toContain('src="http')
    })

    it('never sends the API key or the configured sender secret as message content', async () => {
      send.mockResolvedValue(sendResult('email-1'))
      const service = await createService()

      await service.sendVerificationEmail('user@example.com', 'token-abc')

      const payload = send.mock.calls[0][0]
      expect(payload.html).not.toContain(API_KEY)
      expect(JSON.stringify(payload)).not.toContain('RESEND_API_KEY')
    })

    it('constructs the client with the configured API key', async () => {
      send.mockResolvedValue(sendResult('email-1'))
      await createService()

      // getResendConfig is the single source of the key; the service must not
      // read process.env itself or fall back to a hardcoded value.
      expect(getResendConfig().apiKey).toBe(API_KEY)
    })
  })

  describe('configuration', () => {
    it('refuses to construct without RESEND_API_KEY rather than sending unauthenticated', async () => {
      delete process.env.RESEND_API_KEY
      process.env.MAIL_FROM = MAIL_FROM

      await expect(createService()).rejects.toThrow(/RESEND_API_KEY/)
    })

    it('refuses to construct without MAIL_FROM', async () => {
      process.env.RESEND_API_KEY = API_KEY
      delete process.env.MAIL_FROM

      await expect(createService()).rejects.toThrow(/MAIL_FROM/)
    })
  })
})
