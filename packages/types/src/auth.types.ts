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
 * email verification is a later feature (Task 1.2). Accounts are created in
 * the unverified/pending state.
 */
export interface RegisterResponse {
  id: string
  email: string
  message: string
}
