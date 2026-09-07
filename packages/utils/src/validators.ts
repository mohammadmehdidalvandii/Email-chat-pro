import {
  EMAIL_MAX_LENGTH,
  EMAIL_MIN_LENGTH,
  EMAIL_REGEX,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REGEX,
} from '@email-chat-pro/constants'

/** Returns true when the value is a valid email address. */
export function isValidEmail(value: string): boolean {
  return (
    value.length >= EMAIL_MIN_LENGTH && value.length <= EMAIL_MAX_LENGTH && EMAIL_REGEX.test(value)
  )
}

/**
 * Returns true when the value satisfies the shared password rule
 * (8-255 characters with an uppercase letter, a lowercase letter, a digit,
 * and a special character from `!@#$%^&*`).
 */
export function isValidPassword(value: string): boolean {
  return (
    value.length >= PASSWORD_MIN_LENGTH &&
    value.length <= PASSWORD_MAX_LENGTH &&
    PASSWORD_REGEX.test(value)
  )
}
