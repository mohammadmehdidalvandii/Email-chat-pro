/**
 * Shared error codes and messages (architecture.md: packages/constants/error-messages.ts).
 * Used to keep error responses consistent with the standardized API contract.
 */
import { MESSAGE_CONTENT_MAX_LENGTH } from './validation.constants'

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

/** Human-readable messages for registration-, verification-, and profile-related errors. */
export const ERROR_MESSAGES = {
  EMAIL_REQUIRED: 'Email is required',
  EMAIL_INVALID: 'Email must be a valid email address',
  EMAIL_ALREADY_REGISTERED: 'Email already registered',
  PASSWORD_REQUIRED: 'Password is required',
  PASSWORD_WEAK:
    'Password must be 8-255 characters and include an uppercase letter, a lowercase letter, a digit, and a special character (!@#$%^&*)',
  VERIFICATION_TOKEN_REQUIRED: 'Verification token is required',
  VERIFICATION_TOKEN_INVALID: 'Verification token is invalid or expired',
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_NOT_VERIFIED: 'Email is not verified. Please verify your email before logging in.',
  LOGGED_OUT: 'Logged out',
  INTERNAL: 'An unexpected error occurred',
  // Task 1.4 — Profile
  USERNAME_REQUIRED: 'Username is required',
  USERNAME_TAKEN: 'Username is already taken',
  USERNAME_INVALID:
    'Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens',
  USERNAME_TOO_SHORT: 'Username must be at least 3 characters',
  USERNAME_TOO_LONG: 'Username must be no more than 30 characters',
  FULL_NAME_TOO_LONG: 'Full name must be no more than 100 characters',
  BIO_TOO_LONG: 'Bio must be no more than 500 characters',
  AVATAR_URL_TOO_LONG: 'Avatar URL must be no more than 500 characters',
  // Task 1.5 — Account Deletion
  PASSWORD_INCORRECT: 'Password is incorrect',
  ACCOUNT_DELETED: 'Account deleted',
  // Task 2.2 — Message Persistence
  CHAT_NOT_FOUND: 'Chat not found',
  NOT_CHAT_PARTICIPANT: 'You are not a participant of this chat',
  MESSAGE_CONTENT_REQUIRED: 'Message content is required',
  MESSAGE_CONTENT_TOO_LONG: `Message content must be no more than ${MESSAGE_CONTENT_MAX_LENGTH} characters`,
  MESSAGE_TYPE_INVALID:
    'messageType must be "text" — image and video messages are not supported yet',
  MESSAGE_MEDIA_NOT_ALLOWED: 'Text messages cannot include a media URL',
  // Task 2.3 — Real-time Messaging (WebSocket)
  WS_CONNECTION_FAILED: 'WebSocket connection failed',
  WS_UNAUTHORIZED: 'Authentication required to connect',
  WS_CHAT_UNAUTHORIZED: 'You are not a participant of this chat',
} as const
