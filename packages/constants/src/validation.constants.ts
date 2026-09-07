/**
 * Shared validation rules (architecture.md: packages/constants/validation.ts).
 *
 * These are the canonical rules for the registration flow (Task 1.1). They are
 * referenced by packages/utils validators and by the backend DTO validation so
 * that a single source of truth is used across the stack.
 */

/** RFC 5322 simplified email pattern defined in architecture.md. */
export const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

/** Minimum allowed email length (architecture.md). */
export const EMAIL_MIN_LENGTH = 5

/** Maximum allowed email length (architecture.md). */
export const EMAIL_MAX_LENGTH = 255

/** Minimum allowed password length (architecture.md). */
export const PASSWORD_MIN_LENGTH = 8

/** Maximum allowed password length (architecture.md). */
export const PASSWORD_MAX_LENGTH = 255

/** Special characters a password must contain at least one of (architecture.md). */
export const PASSWORD_SPECIAL_CHARS = '!@#$%^&*'

/**
 * Password rule (architecture.md): 8-255 characters containing at least one
 * uppercase letter, one lowercase letter, one digit, and one special character
 * from {@link PASSWORD_SPECIAL_CHARS}.
 */
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,255}$/
