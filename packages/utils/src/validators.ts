/** RFC 5322 simplified email pattern defined in architecture.md. */
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

/** Minimum allowed email length (architecture.md). */
const EMAIL_MIN_LENGTH = 5

/** Maximum allowed email length (architecture.md). */
const EMAIL_MAX_LENGTH = 255

/** Returns true when the value is a valid email address. */
export function isValidEmail(value: string): boolean {
  return (
    value.length >= EMAIL_MIN_LENGTH &&
    value.length <= EMAIL_MAX_LENGTH &&
    EMAIL_PATTERN.test(value)
  )
}