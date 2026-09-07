/**
 * Shared authentication API contracts (architecture.md: packages/types/auth.types.ts).
 * Single source of truth for frontend and backend.
 */

/** Request body for POST /auth/register (Task 1.1 — Registration). */
export interface RegisterInput {
  email: string
  password: string
}

/**
 * Successful response payload for POST /auth/register.
 *
 * Note: the message does not claim a verification email was sent, because
 * there is no email transport in the approved stack. Accounts are created in
 * the unverified/pending state (Task 1.1); email verification is Task 1.2.
 */
export interface RegisterResponse {
  id: string
  email: string
  message: string
}

/** Request body for POST /auth/verify-email (Task 1.2 — Email Verification). */
export interface VerifyEmailInput {
  token: string
}

/**
 * Successful response payload for POST /auth/verify-email.
 * The account transitions from is_verified = false to is_verified = true.
 */
export interface VerifyEmailResponse {
  message: string
}
