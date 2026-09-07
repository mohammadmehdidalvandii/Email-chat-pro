/**
 * Shared authentication API contracts (architecture.md: packages/types/auth.types.ts).
 * Single source of truth for frontend and backend.
 */

import type { User } from './user.types'

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

/** Request body for POST /auth/login (Task 1.3 — Login and Logout). */
export interface LoginInput {
  email: string
  password: string
}

/**
 * Successful response payload for POST /auth/login (architecture.md §API Endpoints).
 * Contains the signed JWT (also set as an httpOnly cookie) and the authenticated user.
 */
export interface LoginResponse {
  token: string
  user: User
}

/** Successful response payload for POST /auth/logout. */
export interface LogoutResponse {
  message: string
}

/**
 * Successful response payload for GET /auth/session (Task 1.3 — the minimal
 * guarded endpoint that proves the JWT authentication state works).
 */
export interface SessionResponse {
  user: User
}
