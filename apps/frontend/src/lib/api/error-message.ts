/**
 * Maps an auth mutation's `ApiRequestError` to a localized, user-facing
 * message.
 *
 * The backend distinguishes an unverified-account login from invalid
 * credentials purely by the structured `code` field (`EMAIL_NOT_VERIFIED` vs
 * `INVALID_CREDENTIALS`), so this helper keys off codes rather than the English
 * `message` text. Matching on message text broke the moment a message was
 * reworded or a locale was introduced.
 *
 * One documented exception: a failed verification-email delivery is a
 * 500 whose code is the generic INTERNAL_ERROR, disambiguated by the
 * contract's fixed EMAIL_SEND_FAILED sentinel text (see
 * `sendVerificationEmail` in the backend). That text is fixed by design
 * and never leaks provider details.
 *
 * Errors outside the auth flow fall back to the i18n `errors` namespace via
 * `translateApiError`.
 */
import { ERROR_CODES, ERROR_MESSAGES } from '@email-chat-pro/constants'
import { translateApiError } from '../../i18n/errors'
import { getI18n } from 'react-i18next'
import type { ApiRequestError } from './client'

/**
 * Returns a localized message for a failed auth request. Uses the `auth`
 * namespace keys defined in `public/locales/{en,fa}/auth.json` for the
 * auth-specific error codes, and the `errors` namespace (via
 * translateApiError) for everything else.
 */
export function authErrorMessage(error: ApiRequestError | null | undefined): string {
  if (!error) return ''

  const i18n = getI18n()
  const authT = i18n?.getFixedT(i18n.resolvedLanguage ?? 'en', 'auth') ?? ((k: string) => k)

  // Auth-specific codes, keyed on the structured contract rather than English
  // message text. The `emailNotVerified` copy prompts the user to verify
  // instead of telling them their credentials are wrong.
  if (error.code === ERROR_CODES.EMAIL_NOT_VERIFIED) {
    return authT('emailNotVerified')
  }
  if (error.code === ERROR_CODES.INVALID_CREDENTIALS) {
    return authT('invalidCredentials')
  }
  if (error.code === ERROR_CODES.EMAIL_ALREADY_REGISTERED) {
    return authT('emailAlreadyRegistered')
  }
  if (error.code === ERROR_CODES.VERIFICATION_TOKEN_INVALID) {
    return authT('verificationTokenInvalid')
  }
  // Registration succeeded but the verification email could not be
  // delivered. The backend reports this as a 500 whose structured
  // code is the generic INTERNAL_ERROR, so the code alone cannot
  // tell it apart from any other server failure (e.g. a failed
  // login). It does carry the fixed EMAIL_SEND_FAILED message from
  // the shared contract — deliberately fixed text that never leaks
  // provider details — so that sentinel is the reliable discriminator.
  // Every other INTERNAL_ERROR keeps the generic message.
  if (
    error.code === ERROR_CODES.INTERNAL_ERROR &&
    error.message === ERROR_MESSAGES.EMAIL_SEND_FAILED
  ) {
    return authT('emailSendFailed')
  }

  // Fall back to the standardized error-code translation (errors namespace).
  return translateApiError(error.code)
}
