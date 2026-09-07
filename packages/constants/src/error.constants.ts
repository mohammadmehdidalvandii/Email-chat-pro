/**
 * Shared error codes and messages (architecture.md: packages/constants/error-messages.ts).
 * Used to keep error responses consistent with the standardized API contract.
 */

/** Standard error codes used in API error responses (architecture.md §Error Handling). */
export const ERROR_CODES = {
  /** Request validation failed (HTTP 400). */
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  /** The verification token is unknown, expired, or already used (HTTP 400). */
  VERIFICATION_TOKEN_INVALID: 'VERIFICATION_TOKEN_INVALID',
  /** Authentication failed (HTTP 401). */
  UNAUTHORIZED: 'UNAUTHORIZED',
  /** The authenticated user cannot access the resource (HTTP 403). */
  FORBIDDEN: 'FORBIDDEN',
  /** The requested resource was not found (HTTP 404). */
  NOT_FOUND: 'NOT_FOUND',
  /** A resource conflict such as a duplicate unique value (HTTP 409). */
  CONFLICT: 'CONFLICT',
  /** A rate limit was exceeded (HTTP 429). */
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  /** Unexpected server failure (HTTP 500). */
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

/** Human-readable messages for registration- and verification-related errors. */
export const ERROR_MESSAGES = {
  EMAIL_REQUIRED: 'Email is required',
  EMAIL_INVALID: 'Email must be a valid email address',
  EMAIL_ALREADY_REGISTERED: 'Email already registered',
  PASSWORD_REQUIRED: 'Password is required',
  PASSWORD_WEAK:
    'Password must be 8-255 characters and include an uppercase letter, a lowercase letter, a digit, and a special character (!@#$%^&*)',
  VERIFICATION_TOKEN_REQUIRED: 'Verification token is required',
  VERIFICATION_TOKEN_INVALID: 'Verification token is invalid or expired',
  INTERNAL: 'An unexpected error occurred',
} as const
