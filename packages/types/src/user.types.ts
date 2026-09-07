/**
 * Shared user contracts (architecture.md: packages/types/user.types.ts).
 * Single source of truth for frontend and backend.
 *
 * Task 1.3 exposes the authenticated user identity returned by login/session.
 * Profile fields (username, full_name, bio, avatar_url, profile_completed,
 * last_seen_at) do not exist in the database until Task 1.4, so this type
 * intentionally contains only the columns present today. It is extended by the
 * profile task.
 */
export interface User {
  id: string
  email: string
  isVerified: boolean
  isActive: boolean
  createdAt: string
}
