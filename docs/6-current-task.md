# Current Task

## Purpose

This file defines the **exact work currently authorized** for Claude Code.

`current-task.md` is the execution boundary for the current development step.

---

# Current Phase

## Frontend Development — Phase 5: Media Upload Experience
**Authorization:** Authorized for implementation (Phase 5, frontend only). Backend is **not** to be modified.

**Date:** 2026-09-21

---

# Scope

## Goal
Implement the frontend media upload experience — enabling users to select, validate, upload, and send image/video messages, and render received media messages in chat.

## Backend Features Consumed (no backend changes authorized)
- File Upload: `POST /api/v1/files/upload` — multipart/form-data with `file` field (required) and optional `type` field (`'image'` | `'video'`). Returns `{ success: true, data: { url: string } }` or `{ success: false, error: { code, message }, timestamp }`.
- Send Message: `POST /api/v1/chats/:chatId/messages` — accepts `CreateMessageInput` (`{ chatId, content, messageType, mediaUrl? }`) with `messageType: 'image' | 'video'` and `mediaUrl` from the upload response.
- Message History: `GET /api/v1/chats/:chatId/messages` — each `Message` includes `messageType` (`'text' | 'image' | 'video'`) and `mediaUrl` (`string | null`).
- WebSocket: `message:received` — real-time delivery of media messages (already implemented in Phase 4; no changes).

## Backend Contracts Inspected (exact, from actual implementation)

### Shared Types (`packages/types/src/file.types.ts`)
- `UploadFileType = 'image' | 'video'`
- `FileUploadResponse = { url: string }`
- `FileUploadResponse` is re-exported from `packages/types/src/index.ts`

### Shared Types (`packages/types/src/chat.types.ts`)
- `MessageType = 'text' | 'image' | 'video'`
- `Message = { id, chatId, senderId, sender: User, content, messageType, mediaUrl: string | null, createdAt }`
- `CreateMessageInput = { chatId, content, messageType, mediaUrl?: string | null }`

### Shared Types (`packages/types/src/websocket.types.ts`)
- `WS_CLIENT_EVENTS = { JOIN_CHAT: 'chat:join', LEAVE_CHAT: 'chat:leave', SEND_MESSAGE: 'message:send', PRESENCE_UPDATE: 'presence:update' }`
- `WS_SERVER_EVENTS = { MESSAGE_RECEIVED: 'message:received', ERROR: 'error:event', CHAT_JOINED: 'chat:joined', CHAT_LEFT: 'chat:left', PRESENCE_CHANGED: 'presence:changed' }`
- `SendMessagePayload = { chatId, content, messageType, mediaUrl? }`

### Backend Upload Endpoint (`apps/backend/src/modules/files/files.controller.ts`)
- `@Controller('files')` → `POST /files/upload` (mounted under `/api/v1`)
- `@UseGuards(JwtAuthGuard)` — requires valid JWT
- `@UseFilters(FileSizeExceptionFilter)` — maps oversized uploads to `400 VALIDATION_ERROR FILE_SIZE_EXCEEDED`
- `@Throttle(endpointThrottles.UPLOAD_FILE)` — rate limit: **5 uploads/hour** per user
- `FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: VIDEO_MAX_SIZE_BYTES }, fileFilter: uploadFileFilter })`
- Request body: `{ file: Express.Multer.File, type?: 'image' | 'video' }` (validated by `UploadFileDto`)
- Dispatch: `type: 'video'` → `FilesService.uploadVideo`, otherwise `FilesService.uploadImage`
- Returns `ApiResponse<FileUploadResponse>` (`{ success, data: { url } }`)

### Backend Upload Validation (FilesService — authoritative server-side)
- **Image path** (`uploadImage`): missing/empty → `400 FILE_REQUIRED`; magic-byte format check (PNG/GIF/JPEG/WebP) → `400 FILE_TYPE_INVALID` if not image; dimensions `100×100–5000×5000` → `400 FILE_DIMENSIONS_INVALID`; size ≤ 10MB; Cloudinary upload `resource_type: 'image'`, folder `email-chat-pro/images`; failure → `500 FILE_UPLOAD_FAILED`
- **Video path** (`uploadVideo`): missing/empty → `400 FILE_REQUIRED`; container-header format check (mp4/mov/webm/avi) → `400 FILE_TYPE_INVALID` if not video; duration ≤ 300s → `400 VIDEO_DURATION_EXCEEDED` / `400 VIDEO_DURATION_INVALID`; size ≤ 50MB; Cloudinary upload `resource_type: 'video'`, folder `email-chat-pro/videos`; failure → `500 FILE_UPLOAD_FAILED`

### Backend Message Validation (`apps/backend/src/modules/messages/messages.service.ts`)
- `text`: requires non-empty `content` (`MESSAGE_CONTENT_REQUIRED`), forbids `mediaUrl` (`MESSAGE_MEDIA_NOT_ALLOWED`)
- `image`: requires `mediaUrl` → `IMAGE_MEDIA_URL_REQUIRED`; validates URL via `isValidHttpUrl` → `IMAGE_MEDIA_URL_INVALID`; stores `content ?? ''`
- `video`: requires `mediaUrl` → `VIDEO_MEDIA_URL_REQUIRED`; validates URL via `isValidHttpUrl` → `VIDEO_MEDIA_URL_INVALID`; stores `content ?? ''`

### Shared Validation Constants (`packages/constants/src/validation.constants.ts`)
- `IMAGE_MAX_SIZE_BYTES = 10MB`, `IMAGE_MIN_DIMENSION_PX = 100`, `IMAGE_MAX_DIMENSION_PX = 5000`
- `VIDEO_MAX_SIZE_BYTES = 50MB`, `VIDEO_MAX_DURATION_SECONDS = 300`
- `IMAGE_FILE_EXTENSIONS`, `IMAGE_MIME_TYPES`, `VIDEO_FILE_EXTENSIONS`, `VIDEO_MIME_TYPES`
- `UPLOAD_TYPES = ['image', 'video']`
- `MEDIA_URL_MAX_LENGTH = 500`
- `MESSAGE_CONTENT_MAX_LENGTH = 5000`

### Shared Error Constants (`packages/constants/src/error.constants.ts`)
- Upload: `FILE_REQUIRED`, `FILE_TYPE_INVALID`, `FILE_SIZE_EXCEEDED`, `FILE_DIMENSIONS_INVALID`, `UPLOAD_TYPE_INVALID`, `FILE_UPLOAD_FAILED`
- Media URL: `IMAGE_MEDIA_URL_REQUIRED`, `IMAGE_MEDIA_URL_INVALID`, `VIDEO_MEDIA_URL_REQUIRED`, `VIDEO_MEDIA_URL_INVALID`
- Duration: `VIDEO_DURATION_EXCEEDED`, `VIDEO_DURATION_INVALID`
- Message: `MESSAGE_CONTENT_REQUIRED`, `MESSAGE_MEDIA_NOT_ALLOWED`, `MESSAGE_TYPE_INVALID`
- API: `VALIDATION_ERROR`, `RATE_LIMIT_EXCEEDED`, `INTERNAL_ERROR`

## Pages / Screens
- `/chats` — Conversation list (protected route, unchanged from Phase 4)
- `/chats/:chatId` — Chat window with media support (protected route, extended)

## Components
- `MessageInput` — **extended**: text input + file picker (image/video) + upload trigger + send. Displays upload progress and upload failure. Reuses existing `Button`, `Input`, `Card` from `../ui/`.
- `MessageItem` — **extended**: renders `message.content` for text; renders `<img>` thumbnail for `messageType: 'image'`; renders `<video>` element with poster/controls for `messageType: 'video'`. Reuses existing bubble styling for `isOwn`.
- `ConversationList` — unchanged (displays `lastMessage?.content` which is `''` for media messages; acceptable per scope).
- `ChatWindow` — unchanged structure (`MessageList` + `MessageInput`); `MessageInput` prop interface may extend to support media mode if needed.
- `MessageList` — unchanged (`MessageItem` rendered per message; media rendering handled inside `MessageItem`).

## API & WebSocket Integration

### New API Function (`apps/frontend/src/lib/api/files.api.ts`)
- `uploadFileApi(formData: FormData): Promise<FileUploadResponse>` — POST `/files/upload` via `apiClient` (existing Axios instance with Bearer token interceptor). Returns `data` from `ApiResponse<FileUploadResponse>`. Throws `ApiRequestError` on failure.

### Extended Mutation (`apps/frontend/src/hooks/use-chat-mutations.ts`)
- `useSendMessage(chatId)` — unchanged signature (`mutationFn: (dto: CreateMessageInput) => Promise<Message>`). Caller (`ChatWindow`) passes `messageType: 'image'|'video'` and `mediaUrl` when sending a media message. `onSuccess` invalidates `CHAT_HISTORY_KEY` (unchanged).

### TanStack Query for Upload State
- Upload is **not** a persistent server-state query; it is a **mutation** (transient). Use `useMutation` with `uploadFileApi` as the mutation function. Track `isPending`, `progress` (if feasible), and `error` through the mutation lifecycle. Do **not** add a `useQuery` for upload state — upload is not cacheable server state.

### WebSocket (unchanged)
- `useChatSocket(chatId)` — no changes needed. `message:received` events will carry `Message` objects with `messageType: 'image'|'video'` and `mediaUrl`; `MessageList` already renders each via `MessageItem`.

## State Ownership
- **TanStack Query** (server state): `conversations` (`useConversations`), `messages` (`useChatHistory`), file upload mutation state
- **Zustand** (UI state only): `activeChatId`, `isSocketConnected` (unchanged from Phase 4). **No duplication** of server state (conversations, messages, upload results) in Zustand.

## Validation (client-side, mirroring backend rules)
- **Format pre-check** before upload: image → jpg/jpeg/png/gif/webp; video → mp4/webm/mov/avi. Use `File.type` / extension matching against shared constants. Rejected format → user-facing error (i18n key in `errors` namespace).
- **Size pre-check** before upload: image ≤ 10MB; video ≤ 50MB. Oversized → user-facing error.
- **Client validation is a UX optimization only** — backend performs **authoritative** re-validation (magic bytes, dimensions, duration). Server errors are surfaced to the user via `ApiRequestError` / `toApiRequestError` → `translateApiError` (i18n `errors` namespace).
- **Message content** validation remains in `MessageInput` (`MESSAGE_CONTENT_MAX_LENGTH = 5000`, same as Phase 4).

## Authentication
- `RequireAuth` for all chat routes (unchanged from Phase 4).
- JWT token automatically included in `POST /files/upload` via the existing Axios interceptor in `apps/frontend/src/lib/api/client.ts` (reads from auth store).

## Verification Requirements
1. `npm run type-check` PASS (all workspaces).
2. `npm run lint` PASS (frontend).
3. `npm run build` PASS (frontend).
4. Manual workflow:
   - Authenticated user opens `/chats/:chatId`.
   - Clicks file picker in `MessageInput` → selects an image → image preview or upload starts → Send → message appears in chat with image rendered.
   - Repeats for video → video element rendered in chat.
   - Selecting an unsupported format or oversized file → user-facing error (no upload attempted).
   - Uploaded message received in real-time via WebSocket → `message:received` → `MessageItem` renders media correctly.

## Explicit Exclusions
- Typing indicators
- Read receipts
- Presence improvements
- Group chat
- Backend modifications (upload endpoint, validation, message handling all unchanged)
- New backend features
- New libraries for media processing (no image resizing, video transcoding, thumbnail generation — backend handles Cloudinary as-is)
- Caption/text overlay on media messages (content stored as `''` for media messages per backend architecture)
- File download / media retrieval endpoints (not in backend scope)
- Upload progress bar UI complexity beyond indicating pending/error state (unless trivially achievable via existing mutation state)

---

# Rules
- Frontend only; backend unchanged.
- Use existing shared API contracts (`@email-chat-pro/types` — `FileUploadResponse`, `MessageType`, `Message`, `CreateMessageInput`).
- Use existing shared constants (`@email-chat-pro/constants` — `IMAGE_*`, `VIDEO_*`, `UPLOAD_TYPES`, `MEDIA_URL_MAX_LENGTH`, `MESSAGE_CONTENT_MAX_LENGTH`, error constants).
- Use TanStack Query for server state and upload mutation state; Zustand for UI state only.
- Client-side validation mirrors backend but backend remains authoritative.
- Strictly adhere to Phase 5 media upload scope; no Phase 6 features.
- All user-facing strings use i18next (`useTranslation`) with namespaces from `public/locales/`.
