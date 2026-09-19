/**
 * Maps an auth mutation's `ApiRequestError` to a localized, user-facing
 * message.
 *
 * The backend distinguishes an unverified-account login from invalid
 * credentials only by the `message` field (both use code `UNAUTHORIZED`), so
 * this helper matches against the shared `ERROR_MESSAGES` constants to pick
 * the right translation key. Unknown errors fall back to the i18n `errors`
 * namespace via `translateApiError`.
 */
import { ERROR_MESSAGES } from '@email-chat-pro/constants'
import { translateApiError } from '../../i18n/errors'
import { getI18n } from 'react-i18next'
import type { ApiRequestError } from './client'

/**
 * Returns a localized message for a failed auth request. Uses the `auth`
 * namespace keys defined in `public/locales/{en,fa}/auth.json` for the
 * well-known auth-specific error messages, and the `errors` namespace
 * (via translateApiError) for everything else.
 */
export function authErrorMessage(error: ApiRequestError | null | undefined): string {
  if (!error) return ''

  const i18n = getI18n()
  const authT = i18n?.getFixedT(i18n.resolvedLanguage ?? 'en', 'auth') ?? ((k: string) => k)

  // The unverified-account case: backend sends code UNAUTHORIZED with the
  // shared EMAIL_NOT_VERIFIED message. Match on the message constant so the
  // user is prompted to verify rather than told their credentials are wrong.
  if (error.message === ERROR_MESSAGES.EMAIL_NOT_VERIFIED) {
    return authT('emailNotVerified')
  }
  if (error.message === ERROR_MESSAGES.INVALID_CREDENTIALS) {
    return authT('invalidCredentials')
  }
  if (error.message === ERROR_MESSAGES.EMAIL_ALREADY_REGISTERED) {
    return authT('emailAlreadyRegistered')
  }
  if (error.message === ERROR_MESSAGES.VERIFICATION_TOKEN_INVALID) {
    return authT('verificationTokenInvalid')
  }

  // Fall back to the standardized error-code translation (errors namespace).
  return translateApiError(error.code, error.message)
}
