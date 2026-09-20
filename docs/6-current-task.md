# Current Task

## Purpose

This file defines the **exact work currently authorized** for Claude Code.

`current-task.md` is the execution boundary for the current development step.

---

# Current Phase

## Frontend Development — Phase 4: Real-time Chat Experience
**Authorization:** Authorized for implementation (Phase 4).

**Date:** 2026-09-20

---

# Scope

## Goal
Implement the frontend for real-time messaging (building on Phase 2 backend support).

## Backend Features Consumed (no backend changes authorized)
- Chat Retrieval: `GET /api/v1/chats`
- Message History: `GET /api/v1/chats/:chatId/messages`
- Send Message: `POST /api/v1/chats/:chatId/messages`
- WebSocket: `chat:join`, `chat:leave`, `message:send`, `message:received`

## Pages / Screens
- `/chats` — Conversation list (protected route)
- `/chats/:chatId` — Chat window (protected route)

## Components
- `ConversationList` (list of contacts with last message preview)
- `ChatWindow` (message list + input area)
- `MessageList` (scrollable message history)
- `MessageItem` (individual message display, own vs. other)
- `MessageInput` (text input + send button)
- Reuse UI components (Button, Input, Card) from existing design

## API & WebSocket Integration
- TanStack Query:
  - `useConversations`: `GET /chats`
  - `useChatHistory`: `GET /chats/:chatId/messages`
  - `useSendMessage`: `POST /chats/:chatId/messages` (invalidates messages query on success)
- Socket.IO:
  - `connect`: Authorized by JWT in handshake.
  - `chat:join`: Call on chat mount.
  - `chat:leave`: Call on chat unmount.
  - `message:received`: Listen for real-time incoming messages; update TanStack Query cache.

## State Ownership
- TanStack Query (server state): `conversations`, `messages`
- Zustand (UI state only): `activeChatId` (for chat room selection), `isSocketConnected`

## Validation
- `Zod` validation for message input (1-5000 chars per shared constant `MESSAGE_CONTENT_MAX_LENGTH`).

## Authentication
- `RequireAuth` for all chat routes.

## Verification Requirements
1. `npm run type-check`, `npm run lint`, `npm run build` PASS.
2. Manual workflow:
   - Authenticated user views conversation list.
   - Click conversation → opens chat window.
   - Chat window loads history.
   - Send message → message appears in real-time in the other user's window.

## Explicit Exclusions
- Typing indicators
- Read receipts
- Media messages
- File uploads
- Presence improvements
- Group chat
- Backend modifications
- New dependencies (no new libraries)

---

# Rules
- Frontend only; backend unchanged.
- Use existing shared API contracts (`@email-chat-pro/types`).
- Use TanStack Query for data fetching, Zustand for UI state.
- Strictly adhere to Phase 4 real-time messaging scope.
