/**
 * Shared chat contracts (architecture.md: packages/types/chat.types.ts).
 * Single source of truth for frontend and backend.
 *
 * Task 2.1 (Chat Foundation) introduces the Chat type. Task 2.2 (Message
 * Persistence) adds the Message type and its create input.
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

/**
 * Message content categories (architecture.md §Validation Rules — Message
 * Content). 'image' and 'video' are Phase 4; Task 2.2 only persists text.
 */
export type MessageType = 'text' | 'image' | 'video'

/**
 * A persisted message within a one-to-one chat (architecture.md §Data Model —
 * Messages).
 *
 * Each message is stored in a single row owned by the chat (never duplicated
 * per participant). `sender` is the full User object; `createdAt` is the
 * server-side timestamp that is the source of truth for ordering.
 */
export interface Message {
  id: string
  chatId: string
  senderId: string
  sender: User
  content: string
  messageType: MessageType
  mediaUrl: string | null
  createdAt: string
}

/**
 * Input for creating a message (architecture.md — CreateMessageInput).
 * `chatId` is included in the shared contract; the HTTP body posts only
 * content/messageType/mediaUrl because the route path carries the chatId.
 */
export interface CreateMessageInput {
  chatId: string
  content: string
  messageType: MessageType
  mediaUrl?: string | null
}
