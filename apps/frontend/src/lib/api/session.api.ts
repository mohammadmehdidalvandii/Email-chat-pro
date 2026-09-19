/**
 * Session API call (architecture.md §API Endpoints — GET /auth/session).
 *
 * Used by the TanStack Query session query on app load to confirm the JWT is
 * still valid and to hydrate the current user. Returns the authenticated user
 * directly; a 401 (expired/missing token) surfaces as an `ApiRequestError`.
 */
import type { SessionResponse } from '@email-chat-pro/types'
import { apiRequest } from './client'

/** GET /auth/session — validate the current JWT and return the user. */
export function fetchSession(): Promise<SessionResponse> {
  return apiRequest<SessionResponse>({ method: 'GET', url: '/auth/session' })
}
