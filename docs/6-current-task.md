# Current Task

## Purpose

This file defines the **exact work currently authorized** for Claude Code.

`current-task.md` is the execution boundary for the current development step.

Claude Code MUST NOT implement work outside the scope explicitly defined in this file.

When the task is completed and verified, the completed work MUST be recorded in `done.md`, and this file MUST be updated or replaced with the next approved task.

---

# Current Phase

## Frontend Development — Phase 1: Authentication Experience

**Authorization:** Approved Frontend Development Roadmap — Phase 1 only.

**Date:** 2026-09-19

---

# Frontend Development Roadmap

This roadmap defines the complete frontend development plan based on the already-implemented backend capabilities. Phases must be completed in order. Each phase must be verified, documented in `done.md`, committed, and explicitly approved before proceeding to the next phase.

---

## Phase 1: Authentication Experience

### Goal

Provide full registration, email verification, and session management.

### Backend Features Consumed

- `auth` module (registration, email verification, login/logout, session management)
- Shared contracts from `@email-chat-pro/types` (auth.types.ts, user.types.ts, api.types.ts)
- Shared constants from `@email-chat-pro/constants` (error.constants.ts, validation.constants.ts)

### Pages/Screens

- `/register` — Account creation form
- `/verify-email` — Verification token entry/submission
- `/login` — User authentication
- Protected routes (redirect unauthenticated users to `/login`)

### Components Required

- `AuthLayout` — Layout wrapper for authentication pages
- `RegisterForm` — Registration form with email/password validation
- `EmailVerificationForm` — Verification token submission
- `LoginForm` — Login form with email/password

### State Management Requirements

- **Zustand:** `authStore` for managing local auth session state (user, token, isAuthenticated)
- **TanStack Query:** Caching session and user profile data (`/auth/session`)

### API Integration

- `POST /api/v1/auth/register` — Registration
- `POST /api/v1/auth/verify-email` — Email verification
- `POST /api/v1/auth/login` — Login (sets httpOnly cookie)
- `POST /api/v1/auth/logout` — Logout (clears httpOnly cookie)
- `GET /api/v1/auth/session` — Session validation

### Validation Requirements

- Zod schemas aligned with shared `@email-chat-pro/constants`:
  - Email format (RFC 5322 simplified)
  - Password complexity (8+ chars, uppercase, lowercase, digit, special character)
  - Verification token length (64 hex chars)
- Client-side validation for immediate feedback
- Backend validation remains authoritative

### Authentication/Authorization Requirements

- Protected routes require valid JWT (httpOnly cookie or Bearer header)
- Unauthenticated users redirected to `/login`
- Verified email required before accessing protected features
- Session validation on app load

### Real-time Requirements

- None for this phase

### Dependencies

- None (first frontend phase)
- Existing backend auth endpoints must be operational

### Explicit Exclusions

- Password reset flow
- OAuth or social login
- Presence features
- Media uploads
- Contact management
- Messaging

### Verification Criteria

- User can register with valid email/password
- Registration fails with appropriate errors for invalid input
- Email verification token is accepted/rejected correctly
- Login with verified credentials succeeds and sets session
- Login with unverified credentials fails with `EMAIL_NOT_VERIFIED`
- Logout clears session and redirects to login
- Protected routes redirect unauthenticated users to login
- Session validation works on app load
- All forms use shared validation constants
- All API calls use shared type contracts

---

## Phase 2: User Profile Experience

### Goal

Enable profile setup, viewing, and modification.

### Backend Features Consumed

- `users` module (get/patch profile, delete account)
- Shared contracts from `@email-chat-pro/types` (user.types.ts)
- Shared constants from `@email-chat-pro/constants` (validation.constants.ts, error.constants.ts)

### Pages/Screens

- `/settings/profile` — Profile viewing and editing form

### Components Required

- `ProfileForm` — Profile editing form
- `AvatarUploader` — Placeholder until Media Phase
- `AccountDeletionModal` — Confirmation modal for account deletion

### State Management Requirements

- **Zustand:** UI state for modals, form state
- **TanStack Query:** User profile fetching and updating mutations

### API Integration

- `GET /api/v1/users/me` — Fetch current user profile
- `PATCH /api/v1/users/me` — Update profile (username, fullName, bio, avatarUrl)
- `DELETE /api/v1/users/me` — Delete account (requires password confirmation)

### Validation Requirements

- Zod schemas for:
  - Username (3–30 chars, alphanumeric + underscore/hyphen)
  - Full name (max 100 chars)
  - Bio (max 500 chars)
- Username uniqueness enforced by backend
- Client-side validation for immediate feedback

### Authentication/Authorization Requirements

- All profile routes protected by JWT authentication
- Account deletion requires password confirmation

### Real-time Requirements

- None for this phase

### Dependencies

- Phase 1: Authentication Experience

### Explicit Exclusions

- Cloudinary image uploads (scheduled for Media Phase)
- Email change flow
- Profile picture uploads

### Verification Criteria

- Profile fields are fetched and displayed correctly
- Profile updates persist to backend
- Username uniqueness is enforced by backend
- Account deletion anonymizes user data correctly
- Account deletion invalidates sessions
- All forms use shared validation constants

---

## Phase 3: Contacts and User Discovery Experience

### Goal

Enable searching for users, managing contact requests, and maintaining a contact list.

### Backend Features Consumed

- `users` module (search)
- `contacts` module (requests, incoming, accept/decline, accepted contact list)
- Shared contracts from `@email-chat-pro/types` (user.types.ts, contact.types.ts)
- Shared constants from `@email-chat-pro/constants` (error.constants.ts, validation.constants.ts)

### Pages/Screens

- `/search` — Search interface for finding users
- `/contacts` — Contact request management, accepted contact list

### Components Required

- `UserSearchBar` — Search input with debouncing
- `UserSearchResult` — Display search results
- `ContactRequestItem` — Display pending requests with accept/decline actions
- `ContactItem` — Display accepted contacts

### State Management Requirements

- **Zustand:** UI state for search input, request status
- **TanStack Query:** Search results, contact lists, incoming requests

### API Integration

- `GET /api/v1/users/search` — Search users by username or email
- `POST /api/v1/contacts/requests` — Send contact request
- `GET /api/v1/contacts/requests/incoming` — Fetch incoming requests
- `PATCH /api/v1/contacts/requests/:requestId` — Accept or decline request
- `GET /api/v1/contacts` — Fetch accepted contacts

### Validation Requirements

- Query parameter validation (search query, limit)
- Client-side validation for search input (non-empty, trimmed)

### Authentication/Authorization Requirements

- All contact routes protected by JWT authentication
- Backend enforces messaging restrictions based on contact status

### Real-time Requirements

- None for this phase

### Dependencies

- Phase 1: Authentication Experience
- Phase 2: User Profile Experience

### Explicit Exclusions

- Messaging access
- Presence features
- Group chat
- Blocking/muting

### Verification Criteria

- User search returns active users only
- Search results exclude deleted users
- Contact requests can be sent to valid users
- Self-requests are rejected
- Duplicate requests are rejected
- Incoming requests are displayed correctly
- Accept request creates contact relationship
- Decline request does not enable messaging
- Contact list displays accepted contacts only
- All API calls use shared type contracts

---

## Phase 4: Real-time Chat Experience

### Goal

Enable viewing conversations and real-time messaging.

### Backend Features Consumed

- `chats` module (conversation list)
- `messages` module (message history, send messages)
- `websocket` module (real-time message delivery)
- Shared contracts from `@email-chat-pro/types` (chat.types.ts, websocket.types.ts)
- Shared constants from `@email-chat-pro/constants` (error.constants.ts, validation.constants.ts)

### Pages/Screens

- `/chats` — Conversation list
- `/chats/[chatId]` — Chat window with message history

### Components Required

- `ChatList` — Display conversations with last message preview
- `ChatWindow` — Full chat interface
- `MessageItem` — Display individual message (text only)
- `MessageInput` — Message composition and sending

### State Management Requirements

- **Zustand:** Socket.IO connection state, real-time message arrival
- **TanStack Query:** Chat lists, message history, message sending mutations

### API Integration

- `GET /api/v1/chats` — Fetch conversation list
- `GET /api/v1/chats/:chatId/messages` — Fetch message history (paginated)
- `POST /api/v1/chats/:chatId/messages` — Send message
- Socket.IO events:
  - `chat:join` — Join chat room
  - `chat:leave` — Leave chat room
  - `message:received` — Receive real-time message
  - `error:event` — Handle WebSocket errors

### Validation Requirements

- Message content validation (1–5000 chars)
- Client-side validation for empty messages
- Backend enforces contact relationship requirement

### Authentication/Authorization Requirements

- All chat routes protected by JWT authentication
- WebSocket connections require valid JWT
- Backend enforces chat membership and contact relationship

### Real-time Requirements

- Socket.IO client integration
- Join chat rooms on conversation open
- Leave chat rooms on conversation close
- Receive real-time messages
- Handle connection failures and reconnection
- Display online/offline status (from user.lastSeenAt)

### Dependencies

- Phase 1: Authentication Experience
- Phase 3: Contacts and User Discovery Experience (for gating messaging)

### Explicit Exclusions

- Typing indicators
- Read receipts
- Media messages (scheduled for Media Phase)
- Unread counters
- Message editing/deletion

### Verification Criteria

- Conversation list displays all user's chats
- Conversations sorted by recent activity
- Chat window displays message history in chronological order
- Messages are persisted and survive page refresh
- Real-time messages are received without page refresh
- Messaging between non-contacts is rejected by backend
- WebSocket connection is authenticated
- Chat rooms are joined/left correctly
- All API calls use shared type contracts

---

## Phase 5: Media Upload Experience

### Goal

Enable sending images and videos.

### Backend Features Consumed

- `files` module (image/video upload)
- Updated `messages` module (media message support)
- Shared contracts from `@email-chat-pro/types` (file.types.ts, chat.types.ts)
- Shared constants from `@email-chat-pro/constants` (error.constants.ts, validation.constants.ts)

### Pages/Screens

- Integration into `/chats/[chatId]` — Media attachment in chat

### Components Required

- `MediaUploader` — File selection and upload
- `ImagePreview` — Display uploaded images
- `VideoPlayer` — Display uploaded videos
- `UploadProgress` — Display upload progress

### State Management Requirements

- **Zustand:** Upload progress, file selection state
- **TanStack Query:** File upload mutations

### API Integration

- `POST /api/v1/files/upload` — Upload image or video
- `POST /api/v1/chats/:chatId/messages` — Send media message with mediaUrl

### Validation Requirements

- Image format validation (jpg, jpeg, png, gif, webp)
- Video format validation (mp4, webm, mov, avi)
- File size validation (images: 10MB max, videos: 50MB max)
- Image dimension validation (100×100 to 5000×5000)
- Video duration validation (max 5 minutes)
- Client-side validation for immediate feedback

### Authentication/Authorization Requirements

- All upload routes protected by JWT authentication
- Backend enforces file type and size limits

### Real-time Requirements

- Real-time delivery of media messages

### Dependencies

- Phase 4: Real-time Chat Experience

### Explicit Exclusions

- Video trimming/transcoding
- Rich captions
- Arbitrary file sharing
- Cloudinary transformations

### Verification Criteria

- Valid images are uploaded successfully
- Valid videos are uploaded successfully
- Invalid formats are rejected
- Oversized files are rejected
- Upload progress is displayed
- Media messages are rendered correctly
- Cloudinary URLs are stored correctly
- All API calls use shared type contracts

---

## Phase 6: Internationalization and UI System

### Goal

Enable Persian/English support, RTL/LTR, and finalized UI polish.

### Backend Features Consumed

- Backend static i18n error keys (from `@email-chat-pro/constants`)
- Existing frontend i18n foundation (i18next, locale files)

### Pages/Screens

- Global updates to all views

### Components Required

- `LanguageSwitcher` — Language selection component
- `RtlProvider` — RTL/LTR layout provider
- Updated UI components for i18n support

### State Management Requirements

- **Zustand:** Current locale, RTL state
- **TanStack Query:** None (UI-only)

### API Integration

- None (UI-only phase)

### Validation Requirements

- None (UI-only phase)

### Authentication/Authorization Requirements

- Existing protected routes remain protected

### Real-time Requirements

- None (UI-only phase)

### Dependencies

- Phase 1: Authentication Experience
- Phase 2: User Profile Experience
- Phase 3: Contacts and User Discovery Experience
- Phase 4: Real-time Chat Experience
- Phase 5: Media Upload Experience

### Explicit Exclusions

- Spanish localization
- New features

### Verification Criteria

- UI displays correctly in Persian (RTL)
- UI displays correctly in English (LTR)
- Language switcher toggles between languages
- Locale persists across sessions
- All text is translated
- Error messages use backend error codes
- RTL layout is correct for Persian
- All components support i18n

---

# Golden Rule

> **Do not start Phase 2 or any later phase until Phase 1 is completed, verified, documented in `done.md`, committed, and explicitly approved.**

> **Do not modify backend code. Frontend only.**

> **Follow existing architecture and shared contracts. Use Zustand for UI state only. Use TanStack Query for server state.**
