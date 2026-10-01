/**
 * Resolves Zod validation messages to localized text.
 *
 * Schemas (lib/validation/*) emit `validation:<key>` as the Zod `message` so the
 * key travels with the field error and can be translated at render time — the
 * form re-labels existing errors when the language changes, without re-running
 * validation. Any message that is not a key is returned unchanged, which keeps
 * the helper safe for schemas that still carry a literal.
 *
 * A key with no matching translation never surfaces to the user: the raw
 * `validation:<key>` string is an internal identifier, not prose, so it is
 * replaced by the generic `invalidValue` message instead.
 */
import { getI18n } from 'react-i18next'

/** Prefix marking a Zod message as a `validation` namespace key. */
const VALIDATION_PREFIX = 'validation:'

/** Generic message used when a `validation:` key has no translation. */
const FALLBACK_KEY = 'invalidValue'

export function isValidationKey(message: string | undefined): boolean {
  return typeof message === 'string' && message.startsWith(VALIDATION_PREFIX)
}

/**
 * Returns user-facing text for a Zod field error. Keys are looked up in the
 * `validation` namespace; when the key is missing from the translations the
 * generic localized fallback is returned rather than the raw key, so an
 * untranslated field still shows a real message instead of an internal
 * identifier.
 */
export function validationMessage(message: string | undefined): string | undefined {
  if (!message) return undefined
  if (!isValidationKey(message)) return message

  const key = message.slice(VALIDATION_PREFIX.length)
  const i18n = getI18n()
  const t = i18n?.getFixedT(i18n.resolvedLanguage ?? 'en', 'validation')
  const translated = t?.(key)
  if (translated && translated !== key) return translated

  // i18next returns the key itself when a translation is missing.
  const fallback = t?.(FALLBACK_KEY)
  if (fallback && fallback !== FALLBACK_KEY) return fallback

  // i18n not initialised yet: return nothing rather than the internal key, so
  // the identifier can never reach the screen.
  return undefined
}
