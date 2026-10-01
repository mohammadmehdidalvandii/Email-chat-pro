/**
 * Shared error codes and messages (architecture.md: packages/constants/error-messages.ts).
 * Used to keep error responses consistent with the standardized API contract.
 */
import {
  IMAGE_MAX_SIZE_BYTES,
  MESSAGE_CONTENT_MAX_LENGTH,
  SEARCH_QUERY_MAX_LENGTH,
  VIDEO_MAX_SIZE_BYTES,
  VIDEO_MAX_DURATION_SECONDS,
} from './validation.constants'

/**
 * Standard error codes used in API error responses (architecture.md §Error Handling).
 *
 * These are the codes a client may receive in `error.code`. They fall into two
 * groups:
 *
 *  - Generic HTTP-level codes, used as the fallback whenever a throw does not
 *    identify a more specific cause (see `HttpExceptionFilter.codeForStatus`).
 *  - Specific codes, emitted when the backend knows exactly what went wrong.
 *    They are the contract the UI keys off: a specific code lets the frontend
 *    render the right translation without ever matching on the English
 *    `message` text. Every specific code has a matching `errors` namespace key
 *    in the frontend locales.
 *
 * Specific codes reuse the names already defined in {@link ERROR_MESSAGES} —
 * the code identifies the cause, the message remains the English fallback.
 */
export const ERROR_CODES = {
  // --- Generic HTTP-level codes (fallback when no specific cause applies) ---
  /** Request validation failed (HTTP 400). */
  VALIDATION_ERROR: 'VALIDATION_ERROR',
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

  // --- Authentication ---
  /** The verification token is unknown, expired, or already used (HTTP 400). */
  VERIFICATION_TOKEN_INVALID: 'VERIFICATION_TOKEN_INVALID',
  /**
   * The email is not registered (HTTP 409).
   *
   * Distinct from {@link ERROR_CODES.CONFLICT} so the UI can say "this email is
   * taken" instead of a generic conflict message.
   */
  EMAIL_ALREADY_REGISTERED: 'EMAIL_ALREADY_REGISTERED',
  /**
   * The account exists and the password matched, but the email is unverified
   * (HTTP 401). Only ever returned AFTER the password check passes, so the code
   * discloses nothing an incorrect password would not.
   */
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  /**
   * Unknown email, inactive/deleted account, or wrong password (HTTP 401).
   * Deliberately one code for all three so the endpoint cannot be used to
   * discover which email addresses are registered.
   */
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // --- Profile & account ---
  /** The requested username belongs to another user (HTTP 409). */
  USERNAME_TAKEN: 'USERNAME_TAKEN',
  /** The password supplied for account deletion did not match (HTTP 401). */
  PASSWORD_INCORRECT: 'PASSWORD_INCORRECT',

  // --- Search ---
  /** The search query is missing or blank (HTTP 400). */
  SEARCH_QUERY_REQUIRED: 'SEARCH_QUERY_REQUIRED',
  /** The search query exceeded the maximum length (HTTP 400). */
  SEARCH_QUERY_TOO_LONG: 'SEARCH_QUERY_TOO_LONG',

  // --- Chats & messages ---
  /** The chat does not exist (HTTP 404). */
  CHAT_NOT_FOUND: 'CHAT_NOT_FOUND',
  /** The user is not a participant of the chat (HTTP 403). */
  NOT_CHAT_PARTICIPANT: 'NOT_CHAT_PARTICIPANT',
  /** A message was sent with neither text nor media (HTTP 400). */
  MESSAGE_CONTENT_REQUIRED: 'MESSAGE_CONTENT_REQUIRED',
  /** The message text exceeded the maximum length (HTTP 400). */
  MESSAGE_CONTENT_TOO_LONG: 'MESSAGE_CONTENT_TOO_LONG',
  /** `messageType` is not one of text/image/video (HTTP 400). */
  MESSAGE_TYPE_INVALID: 'MESSAGE_TYPE_INVALID',
  /** A text message carried a media URL (HTTP 400). */
  MESSAGE_MEDIA_NOT_ALLOWED: 'MESSAGE_MEDIA_NOT_ALLOWED',

  // --- Contacts ---
  /** A contact request already exists between these two users (HTTP 409). */
  CONTACT_REQUEST_DUPLICATE: 'CONTACT_REQUEST_DUPLICATE',
  /** The user tried to send a contact request to themselves (HTTP 400). */
  CONTACT_REQUEST_SELF_NOT_ALLOWED: 'CONTACT_REQUEST_SELF_NOT_ALLOWED',
  /** The target user does not exist or is not active (HTTP 404). */
  CONTACT_REQUEST_RECEIVER_NOT_FOUND: 'CONTACT_REQUEST_RECEIVER_NOT_FOUND',
  /** The contact request does not exist (HTTP 404). */
  CONTACT_REQUEST_NOT_FOUND: 'CONTACT_REQUEST_NOT_FOUND',
  /** The user is not the recipient of the contact request (HTTP 403). */
  CONTACT_REQUEST_NOT_RECEIVER: 'CONTACT_REQUEST_NOT_RECEIVER',
  /** The contact request was already accepted or declined (HTTP 409). */
  CONTACT_REQUEST_ALREADY_RESPONDED: 'CONTACT_REQUEST_ALREADY_RESPONDED',
  /** Messaging requires an accepted contact relationship (HTTP 403). */
  CONTACT_RELATIONSHIP_REQUIRED: 'CONTACT_RELATIONSHIP_REQUIRED',

  // --- File upload ---
  /** No file was supplied (HTTP 400). */
  FILE_REQUIRED: 'FILE_REQUIRED',
  /** The file's MIME type is not supported (HTTP 400). */
  FILE_TYPE_INVALID: 'FILE_TYPE_INVALID',
  /** The file exceeds the size limit for its type (HTTP 413). */
  FILE_SIZE_EXCEEDED: 'FILE_SIZE_EXCEEDED',
  /** Image dimensions are outside the allowed range (HTTP 400). */
  FILE_DIMENSIONS_INVALID: 'FILE_DIMENSIONS_INVALID',
  /** The video's duration could not be determined (HTTP 400). */
  VIDEO_DURATION_INVALID: 'VIDEO_DURATION_INVALID',
  /** The video is longer than the allowed duration (HTTP 400). */
  VIDEO_DURATION_EXCEEDED: 'VIDEO_DURATION_EXCEEDED',
  /** The upload to the storage provider failed (HTTP 500). */
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
  /** An image message carried no `mediaUrl` (HTTP 400). */
  IMAGE_MEDIA_URL_REQUIRED: 'IMAGE_MEDIA_URL_REQUIRED',
  /** The image `mediaUrl` is not a valid http(s) URL (HTTP 400). */
  IMAGE_MEDIA_URL_INVALID: 'IMAGE_MEDIA_URL_INVALID',
  /** A video message carried no `mediaUrl` (HTTP 400). */
  VIDEO_MEDIA_URL_REQUIRED: 'VIDEO_MEDIA_URL_REQUIRED',
  /** The video `mediaUrl` is not a valid http(s) URL (HTTP 400). */
  VIDEO_MEDIA_URL_INVALID: 'VIDEO_MEDIA_URL_INVALID',

  // --- Rate limiting ---
  /** A route-specific rate limit was exceeded (HTTP 429). */
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // --- WebSocket ---
  /** The socket connection failed or was rejected (handshake). */
  WS_CONNECTION_FAILED: 'WS_CONNECTION_FAILED',
  /** The socket handshake carried no valid token. */
  WS_UNAUTHORIZED: 'WS_UNAUTHORIZED',
  /** The socket user is not a participant of the requested room. */
  WS_CHAT_UNAUTHORIZED: 'WS_CHAT_UNAUTHORIZED',
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
  /**
   * Single response for POST /auth/resend-verification. The same message is
   * returned for a resent mail, an already-verified account, an unknown address,
   * and a soft-deleted account, so the endpoint cannot be used to discover which
   * addresses are registered (mirrors login()'s single generic 401).
   */
  RESEND_VERIFICATION_SENT:
    'If the account exists and is not yet verified, a verification email has been sent.',
  /**
   * Returned when a verification email could not be delivered. Deliberately
   * fixed text: it never carries the provider error, the address, or the token.
   */
  EMAIL_SEND_FAILED: 'Failed to send the email. Please try again later.',
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
  AVATAR_URL_INVALID: 'Avatar URL must be a valid http(s) URL',
  // Task 1.5 — Account Deletion
  PASSWORD_INCORRECT: 'Password is incorrect',
  ACCOUNT_DELETED: 'Account deleted',
  // Task 2.2 — Message Persistence
  CHAT_NOT_FOUND: 'Chat not found',
  NOT_CHAT_PARTICIPANT: 'You are not a participant of this chat',
  MESSAGE_CONTENT_REQUIRED: 'Message content is required',
  MESSAGE_CONTENT_TOO_LONG: `Message content must be no more than ${MESSAGE_CONTENT_MAX_LENGTH} characters`,
  MESSAGE_TYPE_INVALID: 'messageType must be "text", "image", or "video"',
  MESSAGE_MEDIA_NOT_ALLOWED: 'Text messages cannot include a media URL',
  // Task 2.3 — Real-time Messaging (WebSocket)
  WS_CONNECTION_FAILED: 'WebSocket connection failed',
  WS_UNAUTHORIZED: 'Authentication required to connect',
  WS_CHAT_UNAUTHORIZED: 'You are not a participant of this chat',
  // Task 3.1 — User Search
  SEARCH_QUERY_REQUIRED: 'Search query is required',
  SEARCH_QUERY_TOO_LONG: `Search query must be no more than ${SEARCH_QUERY_MAX_LENGTH} characters`,
  // Task 3.2 — Contact Requests
  CONTACT_REQUEST_RECEIVER_NOT_FOUND: 'User not found',
  CONTACT_REQUEST_SELF_NOT_ALLOWED: 'You cannot send a contact request to yourself',
  CONTACT_REQUEST_DUPLICATE: 'A contact request between these users already exists',
  CONTACT_REQUEST_NOT_FOUND: 'Contact request not found',
  CONTACT_REQUEST_NOT_RECEIVER: 'You are not the recipient of this contact request',
  CONTACT_REQUEST_ALREADY_RESPONDED: 'This contact request has already been responded to',
  CONTACT_REQUEST_STATUS_INVALID: 'status must be "accepted" or "declined"',
  // Task 3.3 — Contact List & Messaging Access Control
  CONTACT_RELATIONSHIP_REQUIRED: 'Messaging requires an accepted contact relationship',
  // Task 4.1 — File Upload & Image Messages
  FILE_REQUIRED: 'A file is required',
  FILE_TYPE_INVALID:
    'Unsupported file type. Supported formats: JPEG, PNG, GIF, WebP, MP4, WebM, MOV, AVI',
  FILE_SIZE_EXCEEDED: `File must be no more than ${IMAGE_MAX_SIZE_BYTES / (1024 * 1024)}MB for images and ${VIDEO_MAX_SIZE_BYTES / (1024 * 1024)}MB for videos`,
  FILE_DIMENSIONS_INVALID: 'Image dimensions must be between 100x100 and 5000x5000 pixels',
  UPLOAD_TYPE_INVALID: 'type must be "image" or "video"',
  IMAGE_MEDIA_URL_REQUIRED: 'mediaUrl is required for image messages',
  IMAGE_MEDIA_URL_INVALID: 'mediaUrl must be a valid http(s) URL',
  FILE_UPLOAD_FAILED: 'File upload failed',
  // Task 4.2 — Video Messages
  VIDEO_DURATION_EXCEEDED: `Video duration must be no more than ${VIDEO_MAX_DURATION_SECONDS / 60} minutes`,
  VIDEO_DURATION_INVALID: 'Video duration could not be validated',
  VIDEO_MEDIA_URL_REQUIRED: 'mediaUrl is required for video messages',
  VIDEO_MEDIA_URL_INVALID: 'mediaUrl must be a valid http(s) URL',
  // Task 4.5 — Rate Limiting
  TOO_MANY_REQUESTS: 'Too many requests. Try again later.',
} as const
