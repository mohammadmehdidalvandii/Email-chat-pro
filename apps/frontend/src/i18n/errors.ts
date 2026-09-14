import { ERROR_CODES } from '@email-chat-pro/constants'
import { getI18n } from 'react-i18next'

/** Backend error codes the app knows how to translate (errors namespace). */
const KNOWN_ERROR_CODES = new Set<string>(Object.values(ERROR_CODES))

/**
 * Translates a backend API error code (packages/constants ERROR_CODES values)
 * into user-facing text from the `errors` namespace. Unknown codes fall back
 * to a caller-provided message, then to the namespace's generic `fallback`, so
 * the English backend message is never shown verbatim.
 */
export function translateApiError(code: string | null | undefined, fallbackText?: string): string {
  const i18n = getI18n()
  const errors = i18n?.getFixedT(i18n.resolvedLanguage ?? 'en', 'errors') ?? ((key: string) => key)
  if (code && KNOWN_ERROR_CODES.has(code)) return errors(code)
  return (fallbackText ?? '').trim() || errors('fallback')
}
