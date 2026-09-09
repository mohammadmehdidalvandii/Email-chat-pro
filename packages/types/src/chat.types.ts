/**
 * Shared chat contracts (architecture.md: packages/types/chat.types.ts).
 * Single source of truth for frontend and backend.
 *
 * Task 2.1 (Chat Foundation) introduces the Chat type. The Message type is
 * added by Task 2.2 (Message Persistence) and is intentionally NOT defined
 * here yet.
 */

import type { User } from './user.types'

/**
 * A one-to-one chat between two users (architecture.md §Data Model — Chats).
 *
 * Participants are always stored normalized so that `userA.id < userB.id`
 * (enforced by the DB CHECK constraint). Both `userA` and `userB` are full
 * User objects; a client resolves the "other" participant by comparing each
 * against the authenticated user's id.
 */
export interface Chat {
  id: string
  userA: User
  userB: User
  createdAt: string
  updatedAt: string
}
