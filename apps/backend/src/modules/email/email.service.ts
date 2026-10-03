import { Injectable, Logger } from '@nestjs/common'
import { Resend } from 'resend'
import { getResendConfig } from '../../config/resend.config'
import { buildVerificationEmailHtml } from './verification-email.template'

@Injectable()
export class EmailService {
  private readonly resend: Resend
  private readonly config = getResendConfig()
  private readonly logger = new Logger(EmailService.name)

  constructor() {
    this.resend = new Resend(this.config.apiKey)
  }

  /**
   * Sends the verification email and rethrows any delivery failure.
   *
   * The Resend SDK does NOT throw on HTTP errors: `emails.send()` resolves with
   * a `{ data, error }` result union and only logs the error to the console. The
   * result must therefore be inspected explicitly — otherwise a rejected send
   * (e.g. an invalid or restricted recipient, a 4xx/5xx from the API) would be
   * reported as a success and the account would be left permanently
   * unverified with no delivered token.
   *
   * The body is a self-contained HTML email (inline CSS, no JavaScript — see
   * verification-email.template.ts). The token is embedded as prominent
   * copyable text the recipient enters on the verification page; no API
   * key, credential, or other secret is included.
   */
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    try {
      const result = await this.resend.emails.send({
        from: this.config.mailFrom,
        to: email,
        subject: 'Verify your email address',
        html: buildVerificationEmailHtml(token),
      })

      if (result.error) {
        throw new Error(
          `Resend rejected the verification email: ${result.error.message} (statusCode: ${String(result.error.statusCode)})`,
        )
      }

      this.logger.log(`Verification email sent to ${email}`)
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error)
      throw error
    }
  }
}
