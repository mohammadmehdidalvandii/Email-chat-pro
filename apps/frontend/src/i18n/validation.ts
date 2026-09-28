/**
 * Resolves Zod validation messages to localized text.
 *
 * Schemas (lib/validation/*) emit `validation:<key>` as the Zod `message` so the
 * key travels with the field error and can be translated at render time — the
 * form re-labels existing errors when the language changes, without re-running
 * validation. Any message that is not a key is returned unchanged, which keeps
 * the helper safe for schemas that still carry a literal.
 */
import { getI18n } from 'react-i18next'

/** Prefix marking a Zod message as a `validation` namespace key. */
const VALIDATION_PREFIX = 'validation:'

export function isValidationKey(message: string | undefined): boolean {
  return typeof message === 'string' && message.startsWith(VALIDATION_PREFIX)
}

/**
 * Returns user-facing text for a Zod field error. Keys are looked up in the
 * `validation` namespace; when the key is missing from the translations the raw
 * key is returned rather than an empty string, so the problem stays visible
 * instead of silently disappearing.
 */
export function validationMessage(message: string | undefined): string | undefined {
  if (!message) return undefined
  if (!isValidationKey(message)) return message

  const key = message.slice(VALIDATION_PREFIX.length)
  const i18n = getI18n()
  const t = i18n?.getFixedT(i18n.resolvedLanguage ?? 'en', 'validation')
  const translated = t?.(key)
  return translated && translated !== key ? translated : message
}
