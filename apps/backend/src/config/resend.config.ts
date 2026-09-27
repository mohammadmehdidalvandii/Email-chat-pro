export interface ResendConfig {
  apiKey: string
  mailFrom: string
}

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
