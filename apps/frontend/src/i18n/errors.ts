import { ERROR_CODES } from '@email-chat-pro/constants'
import { getI18n } from 'react-i18next'

/**
 * Backend error codes the app knows how to translate (errors namespace).
 *
 * Built from the shared `ERROR_CODES` contract in packages/constants, which
 * carries both the generic HTTP-level codes and the specific codes the backend
 * emits (`USERNAME_TAKEN`, `PASSWORD_INCORRECT`, `EMAIL_NOT_VERIFIED`, …). Every
 * one of them has a matching key in `public/locales/{en,fa}/errors.json`, so a
 * recognized code always resolves to localized text instead of leaking the
 * backend's English message.
 */
const KNOWN_ERROR_CODES = new Set<string>(Object.values(ERROR_CODES))

/**
 * Translates a backend API error code into user-facing text from the `errors`
 * namespace.
 *
 * Behavior for a recognized code: return the localized translation, ignoring
 * the caller's fallback entirely.
 *
 * For an unrecognized or missing code: fall back to the caller's message, then
 * to the namespace's generic `fallback`. The caller's message is normally the
 * backend's English text, so this path is only reached for codes the app does
 * not yet model — keeping it means a new backend code degrades to a readable
 * (if untranslated) sentence rather than a bare key, while every code this
 * contract knows about stays fully localized.
 */
export function translateApiError(code: string | null | undefined, fallbackText?: string): string {
  const i18n = getI18n()
  const errors = i18n?.getFixedT(i18n.resolvedLanguage ?? 'en', 'errors') ?? ((key: string) => key)
  if (code && KNOWN_ERROR_CODES.has(code)) return errors(code)
  return (fallbackText ?? '').trim() || errors('fallback')
}
