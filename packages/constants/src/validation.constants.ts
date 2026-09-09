/**
 * Shared validation rules (architecture.md: packages/constants/validation.ts).
 *
 * These are the canonical rules for registration (Task 1.1), email verification
 * (Task 1.2), and profile setup (Task 1.4). They are referenced by
 * packages/utils validators and by the backend DTO validation so that a single
 * source of truth is used across the stack.
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

/** Length (hex characters) of a generated email verification token (Task 1.2). */
export const VERIFICATION_TOKEN_LENGTH = 64

/**
 * Default lifetime (hours) of an email verification token (Task 1.2).
 *
 * features.md requires a defined expiration period but does not specify a value;
 * 24 hours is the approved default and is intentionally fast to change.
 */
export const VERIFICATION_TOKEN_EXPIRATION_HOURS = 24

// ---------------------------------------------------------------------------
// Task 1.4 — Profile validation (architecture.md §Data Model — users table)
// ---------------------------------------------------------------------------

/** Username pattern: letters, digits, underscores, and hyphens only (architecture.md). */
export const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/

/** Minimum username length (architecture.md — CHECK constraint). */
export const USERNAME_MIN_LENGTH = 3

/** Maximum username length (architecture.md — CHECK constraint). */
export const USERNAME_MAX_LENGTH = 30

/** Maximum full_name length (architecture.md — VARCHAR(100)). */
export const FULL_NAME_MAX_LENGTH = 100

/** Maximum bio length. */
export const BIO_MAX_LENGTH = 500

/** Maximum avatar_url length (architecture.md — VARCHAR(500)). */
export const AVATAR_URL_MAX_LENGTH = 500

// ---------------------------------------------------------------------------
// Task 2.2 — Message validation (architecture.md §Validation Rules — Message
// Content)
// ---------------------------------------------------------------------------

/** Minimum message content length (architecture.md — Message Content). */
export const MESSAGE_CONTENT_MIN_LENGTH = 1

/** Maximum message content length (architecture.md — Message Content). */
export const MESSAGE_CONTENT_MAX_LENGTH = 5000
