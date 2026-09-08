/**
 * Shared user contracts (architecture.md: packages/types/user.types.ts).
 * Single source of truth for frontend and backend.
 *
 * Task 1.3 exposes the authenticated user identity returned by login/session.
 * Task 1.4 extends the contract with the profile fields (username, full_name,
 * bio, avatar_url, profile_completed, last_seen_at) once they exist in the
 * database. Fields that are nullable in the schema are optional on the type.
 */
export interface User {
  id: string
  email: string
  isVerified: boolean
  isActive: boolean
  /** Unique handle, set once the profile is completed (Task 1.4). Nullable. */
  username?: string
  /** User-provided display name (Task 1.4). Nullable. */
  fullName?: string
  /** Short free-text biography (Task 1.4). Nullable. */
  bio?: string
  /** URL of the user's avatar (Task 1.4). Nullable. */
  avatarUrl?: string
  /** Whether the user has completed their profile setup (Task 1.4). */
  profileCompleted: boolean
  /** When the user was last seen online (Task 1.4). */
  lastSeenAt?: string
  createdAt: string
}

/**
 * Request body for PATCH /users/me (Task 1.4 — Profile Setup).
 * All fields optional so a partial update is allowed.
 */
export interface UpdateProfileInput {
  username?: string
  fullName?: string
  bio?: string
  avatarUrl?: string
}

/**
 * Successful response payload for GET/PATCH /users/me (architecture.md §API
 * Endpoints — User Endpoints). The `data` field carries the User object
 * directly (unlike /auth/session, which wraps it in `{ user }`).
 */
export type ProfileResponse = User
