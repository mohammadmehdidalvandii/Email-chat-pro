/**
 * Shared WebSocket event contracts (architecture.md §WebSocket Events).
 *
 * Defines the types for Socket.IO client↔server communication. Both the NestJS
 * gateway and the Next.js frontend consume these contracts so event payloads
 * remain consistent.
 *
 * Task 2.3 — Real-time Messaging: message delivery events.
 * Task 4.4 — Presence: online/offline + last-seen events.
 * Typing indicators remain out of scope.
 */

import type { Message } from './chat.types'

// ---------------------------------------------------------------------------
// Client → Server events
// ---------------------------------------------------------------------------

/**
 * Emitted by the client to join a chat room after connecting.
 * The server verifies chat membership before acknowledging.
 */
export interface JoinChatPayload {
  chatId: string
}

/**
 * Emitted by the client to leave a chat room.
 */
export interface LeaveChatPayload {
  chatId: string
}

/**
 * Payload the client sends to request a message be persisted and delivered.
 * Task 2.3 uses REST for persistence; this event type is defined here for
 * the shared contract but not handled by the gateway until a later task.
 */
export interface SendMessagePayload {
  chatId: string
  content: string
  messageType: 'text' | 'image' | 'video'
  mediaUrl?: string | null
}

/**
 * Online/offline presence status (Task 4.4 — Presence).
 */
export type PresenceStatus = 'online' | 'offline'

/**
 * Payload the client may emit to mark presence on login/logout
 * (architecture.md §presence:update). The gateway derives server-state
 * presence from the real-time connection state instead (features.md — "Online
 * state is derived from the real-time connection state"), so this event is
 * defined for the protocol contract but is not handled by the server.
 */
export interface PresenceUpdatePayload {
  userId: string
  status: PresenceStatus
}

// ---------------------------------------------------------------------------
// Server → Client events
// ---------------------------------------------------------------------------

/**
 * Broadcast to all participants in a chat room after a message is persisted
 * via the REST API (architecture.md §WebSocket Events — message:received).
 */
export interface MessageSentEvent {
  message: Message
  chatId: string
}

/**
 * Generic error event sent by the server when a WebSocket operation fails.
 */
export interface ErrorEvent {
  code: string
  message: string
}

/**
 * Server → client: broadcast to a user's contacts when that user's presence
 * changes (architecture.md §presence:changed). `lastSeenAt` is the recorded
 * online/offline timestamp; for `offline` it is the moment the last socket
 * disconnected.
 */
export interface PresenceChangedEvent {
  userId: string
  status: PresenceStatus
  lastSeenAt: string
}

// ---------------------------------------------------------------------------
// Client → Server event name constants
// ---------------------------------------------------------------------------

export const WS_CLIENT_EVENTS = {
  JOIN_CHAT: 'chat:join',
  LEAVE_CHAT: 'chat:leave',
  SEND_MESSAGE: 'message:send',
  PRESENCE_UPDATE: 'presence:update',
} as const

// ---------------------------------------------------------------------------
// Server → Client event name constants
// ---------------------------------------------------------------------------

export const WS_SERVER_EVENTS = {
  MESSAGE_RECEIVED: 'message:received',
  ERROR: 'error:event',
  CHAT_JOINED: 'chat:joined',
  CHAT_LEFT: 'chat:left',
  PRESENCE_CHANGED: 'presence:changed',
} as const
