export interface ResendConfig {
  apiKey: string
  mailFrom: string
}

/**
 * Public URL of the verification page in the frontend (Task 1.2).
 *
 * Defaults to the local development origin so a fresh checkout sends
 * working links out of the box. Deployments set FRONTEND_URL so the
 * link points at the real host; the value is a URL origin, never a
 * secret, and is never logged.
 */
const DEFAULT_FRONTEND_URL = 'http://localhost:3000'

/** Path of the verification page (apps/frontend/src/app/verify-email). */
const VERIFY_EMAIL_PATH = '/verify-email'

export function getResendConfig(): ResendConfig {
  const apiKey = process.env.RESEND_API_KEY
  const mailFrom = process.env.MAIL_FROM

  if (!apiKey || !mailFrom) {
    throw new Error(
      'Resend environment variables are required: RESEND_API_KEY, MAIL_FROM',
    )
  }

  return { apiKey, mailFrom }
}

/**
 * Returns the absolute URL the recipient opens to submit their
 * verification token (e.g. http://localhost:3000/verify-email).
 */
export function getVerifyEmailUrl(): string {
  const origin = process.env.FRONTEND_URL ?? DEFAULT_FRONTEND_URL
  return `${origin.replace(/\/$/, '')}${VERIFY_EMAIL_PATH}`
}
