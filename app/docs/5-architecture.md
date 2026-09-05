# Email-Chat-Pro — System Architecture

## System Overview

Email-Chat-Pro is a distributed real-time messaging system with clear separation
of concerns between frontend and backend.

Frontend (Next.js) runs on localhost:3000
Backend (NestJS) runs on localhost:4000
Database (PostgreSQL) runs on localhost:5432 (Docker)

Frontend and backend communicate via two channels:

1. REST API (HTTP)
   - User authentication (login, register, email verification)
   - Profile management (get, update, delete)
   - User search and contact management
   - Account operations

2. WebSocket (Socket.IO)
   - Real-time message delivery
   - Typing indicators
   - Online/offline status
   - Presence updates

Frontend is responsible for:
- User interface and user experience
- Form validation and user input handling
- Local state management (Zustand)
- Server state caching (TanStack Query)
- Real-time event handling (Socket.IO client)

Backend is responsible for:
- Business logic and data validation
- Authentication and authorization
- Database operations and persistence
- Real-time WebSocket coordination
- File uploads to Cloudinary
- Rate limiting and security
- Error handling and logging

Both layers are independent. Frontend can be replaced with mobile app without
backend changes. Backend can scale independently from frontend.

---

## Folder Layout

Frontend Application (apps/frontend)

apps/frontend/
  public/
    locales/                 — i18n translations
      en/
        common.json
        auth.json
        chat.json
        errors.json
      fa/
        common.json
        auth.json
        chat.json
        errors.json
      es/
        common.json
        auth.json
        chat.json
        errors.json
  src/
    app/                     — Next.js App Router (pages)
      (auth)/
        page.tsx             — landing page
        login/page.tsx
        register/page.tsx
        forgot-password/page.tsx
        verify-email/page.tsx
      (dashboard)/
        page.tsx             — dashboard
        chats/page.tsx
        chats/[chatId]/page.tsx
        settings/page.tsx
    components/              — React components (domain-based)
      Auth/
        LoginForm.tsx
        RegisterForm.tsx
        ForgotPasswordForm.tsx
        EmailVerificationForm.tsx
      Chat/
        ChatList.tsx
        ChatWindow.tsx
        MessageItem.tsx
        MessageInput.tsx
        TypingIndicator.tsx
      Layout/
        Header.tsx
        Sidebar.tsx
        Navigation.tsx
        LanguageSwitcher.tsx
      Common/
        Button.tsx
        Input.tsx
        Modal.tsx
        Loading.tsx
        Avatar.tsx
      Providers/
        QueryProvider.tsx
        AuthProvider.tsx
        WebSocketProvider.tsx
        I18nProvider.tsx
    hooks/                   — custom React hooks
      useAuth.ts
      useChat.ts
      useWebSocket.ts
      useForm.ts
    services/                — API clients
      api.client.ts          — Axios instance with interceptors
      auth.service.ts
      chat.service.ts
      message.service.ts
      user.service.ts
      search.service.ts
    store/                   — Zustand state stores
      authStore.ts
      chatStore.ts
      uiStore.ts
      notificationStore.ts
    types/                   — local TypeScript types
      index.ts
    utils/                   — utility functions
      validation.ts
      formatting.ts
      error-handler.ts
    styles/                  — global CSS
      globals.css
      variables.css
    config/
      i18n.config.ts
      api.config.ts

Backend Application (apps/backend)

apps/backend/
  src/
    modules/                 — NestJS modules (feature-based)
      auth/
        auth.controller.ts
        auth.service.ts
        auth.module.ts
        dto/
          login.dto.ts
          register.dto.ts
          refresh-token.dto.ts
        entities/
          user.entity.ts
        strategies/
          jwt.strategy.ts
          local.strategy.ts
        guards/
          jwt.guard.ts
      users/
        users.controller.ts
        users.service.ts
        users.module.ts
        dto/
          create-user.dto.ts
          update-user.dto.ts
          user-profile.dto.ts
        entities/
          user.entity.ts
      chat/
        chat.controller.ts
        chat.service.ts
        chat.module.ts
        dto/
          create-chat.dto.ts
        entities/
          chat.entity.ts
      messages/
        messages.controller.ts
        messages.service.ts
        messages.module.ts
        dto/
          create-message.dto.ts
        entities/
          message.entity.ts
      contacts/
        contacts.controller.ts
        contacts.service.ts
        contacts.module.ts
        dto/
          create-contact-request.dto.ts
        entities/
          contact-request.entity.ts
      websocket/
        websocket.gateway.ts
        websocket.service.ts
        websocket.module.ts
        events/
          message.events.ts
          presence.events.ts
        dto/
          websocket.dto.ts
      files/
        files.controller.ts
        files.service.ts
        files.module.ts
        dto/
          upload.dto.ts
    common/
      decorators/
        auth.decorator.ts
        user.decorator.ts
      exceptions/
        custom.exception.ts
      pipes/
        validation.pipe.ts
      middleware/
        logger.middleware.ts
        auth.middleware.ts
      interceptors/
        response.interceptor.ts
        error.interceptor.ts
    config/
      database.config.ts
      jwt.config.ts
      cors.config.ts
      rate-limit.config.ts
      logger.config.ts
    database/
      migrations/
        1_create_users_table.sql
        2_create_chats_table.sql
        3_create_messages_table.sql
        4_create_contacts_table.sql
      data-source.ts
    constants/
      error-messages.ts
      validation.ts
    utils/
      password.util.ts
      jwt.util.ts
      error.util.ts
    main.ts

Shared Packages (packages/)

packages/types/
  auth.types.ts            — Auth DTOs and responses
  user.types.ts            — User entity and profile
  chat.types.ts            — Chat and message types
  contact.types.ts         — Contact request types
  api.types.ts             — API response wrappers
  websocket.types.ts       — Socket.IO event types

packages/constants/
  error-messages.ts        — all error messages
  validation.ts            — validation rules
  api.ts                   — API constants
  events.ts                — WebSocket event names

packages/utils/
  validators.ts            — shared validators
  formatters.ts            — shared formatters
  error-handler.ts         — error handling utilities

---

## Data Model

Entities and their relationships follow this design:

Users Table

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(30) NOT NULL UNIQUE COLLATE NOCASE,
  full_name VARCHAR(100),
  bio TEXT,
  avatar_url VARCHAR(500),
  
  is_verified BOOLEAN DEFAULT FALSE,
  profile_completed BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CHECK (LENGTH(username) >= 3 AND LENGTH(username) <= 30),
  CHECK (username ~ '^[a-zA-Z0-9_-]+$')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

Schema Reasoning for Users:

- password_hash stored as bcryptjs hash. Never store plain passwords.
- is_verified tracks email verification status. Required before access.
- profile_completed tracks if user finished onboarding.
- is_active tracks if account is deleted (soft delete via deleted_at).
- last_seen_at updates on every user action. Displayed in UI.
- deleted_at for soft deletes. Enables message attribution to "Deleted User".
- username case-insensitive (COLLATE NOCASE). "Milad" == "milad" as identity.
- CHECK constraints enforce at database level.
- Indexes on email and username for fast lookups.

Chats Table

CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_a UUID NOT NULL REFERENCES users(id),
  user_b UUID NOT NULL REFERENCES users(id),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE (user_a, user_b),
  CHECK (user_a < user_b),
  CHECK (user_a != user_b)
);

CREATE INDEX idx_chats_user_a ON chats(user_a);
CREATE INDEX idx_chats_user_b ON chats(user_b);

Schema Reasoning for Chats:

- One conversation between two users, always stored with user_a < user_b.
- CHECK (user_a < user_b) ensures (3,7) and (7,3) both map to same row.
- UNIQUE (user_a, user_b) guarantees one chat per user pair.
- Lookup normalizes pair before querying: IF user1 > user2 THEN swap.
- No messages are ever deleted. Chat destroyed only if both users deleted.

Contact Requests Table

CREATE TABLE contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  sender_id UUID NOT NULL REFERENCES users(id),
  receiver_id UUID NOT NULL REFERENCES users(id),
  
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined')),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE (sender_id, receiver_id),
  CHECK (sender_id != receiver_id)
);

CREATE INDEX idx_contacts_receiver_id ON contact_requests(receiver_id);
CREATE INDEX idx_contacts_status ON contact_requests(status);

Schema Reasoning for Contact Requests:

- Tracks all requests between users (one direction: sender to receiver).
- status: pending (awaiting response), accepted (can message), declined (no message).
- UNIQUE (sender_id, receiver_id) prevents duplicate requests.
- Only accepted requests allow messaging.
- Declined requests prevent future messages until new request sent.

Messages Table

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  chat_id UUID NOT NULL REFERENCES chats(id),
  sender_id UUID NOT NULL REFERENCES users(id),
  
  content TEXT NOT NULL,
  message_type VARCHAR(20) NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'image', 'video')),
  media_url VARCHAR(500),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_chat_created ON messages(chat_id, created_at DESC);

Schema Reasoning for Messages:

- All messages permanently stored. Nothing deleted.
- message_type categorizes message content (text/image/video).
- media_url stored for images and videos. NULL for text messages.
- created_at is source of truth for ordering. Server timestamp, not client.
- idx_messages_chat_created is hot index: fetch last 50 messages of conversation.
- sender_id always valid (even if user deleted, keeps original ID).
- Messages belong to chat, not individual users. No duplication.

Entity Relationships

users (1) ----< (many) chats
  - User can have many conversations.

users (1) ----< (many) contact_requests (as sender)
users (1) ----< (many) contact_requests (as receiver)
  - User sends and receives contact requests.

chats (1) ----< (many) messages
  - Conversation has many messages.

users (1) ----< (many) messages
  - User sends many messages.

contact_requests <--> chats
  - Accepted contact request enables messaging in chat.
  - Before acceptance, no chat exists.
  - After acceptance, chat created.

Account Deletion (Anonymization)

When user deletes account:
  1. Set deleted_at = NOW()
  2. Set is_active = FALSE
  3. Rename username to deleted#{original_id}
  4. Clear full_name, bio, avatar_url
  5. Clear password_hash (cannot login)
  6. Old messages remain in messages table (sender_id unchanged)
  7. In API responses, sender shows as "Deleted User"

Benefits:
  - Data preservation for forensics and compliance
  - No foreign key violations
  - Message history intact for other users
  - Cannot impersonate deleted user (deleted# is outside username alphabet)

---

## Shared Type Definitions

All types defined in packages/types are the single source of truth for API
contracts. Frontend and backend import and use the same types.

User Types (packages/types/user.types.ts)

interface User {
  id: string
  email: string
  username: string
  fullName: string | null
  bio: string | null
  avatarUrl: string | null
  isVerified: boolean
  profileCompleted: boolean
  isActive: boolean
  lastSeenAt: string
  createdAt: string
}

interface UserProfile extends User {
  // Extended user info for profile page
}

interface CreateUserInput {
  email: string
  password: string
}

interface UpdateProfileInput {
  username?: string
  fullName?: string
  bio?: string
  avatarUrl?: string
}

Chat Types (packages/types/chat.types.ts)

interface Chat {
  id: string
  userA: User
  userB: User
  createdAt: string
  updatedAt: string
}

interface Message {
  id: string
  chatId: string
  senderId: string
  sender: User
  content: string
  messageType: 'text' | 'image' | 'video'
  mediaUrl: string | null
  createdAt: string
}

interface CreateMessageInput {
  chatId: string
  content: string
  messageType: 'text' | 'image' | 'video'
  mediaUrl?: string
}

Contact Request Types (packages/types/contact.types.ts)

interface ContactRequest {
  id: string
  senderId: string
  sender: User
  receiverId: string
  receiver: User
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
  updatedAt: string
}

interface CreateContactRequestInput {
  receiverId: string
}

interface UpdateContactRequestInput {
  status: 'accepted' | 'declined'
}

API Response Types (packages/types/api.types.ts)

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
  timestamp: string
}

interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    pages: number
  }
  timestamp: string
}

WebSocket Types (packages/types/websocket.types.ts)

interface MessageSentEvent {
  message: Message
  chatId: string
}

interface TypingEvent {
  chatId: string
  userId: string
  username: string
}

interface PresenceEvent {
  userId: string
  status: 'online' | 'offline'
  lastSeenAt: string
}

---

## Validation Rules

Email Validation

Format: RFC 5322 simplified
  Regex: ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$
  Min length: 5
  Max length: 255
  Check: Must be verified before account activation
  Uniqueness: One email per active account

Username Validation

Format: Alphanumeric, underscore, hyphen only
  Regex: ^[a-zA-Z0-9_-]+$
  Min length: 3
  Max length: 30
  Case: Insensitive (case-insensitive collation)
  Uniqueness: One username per user
  Reserved: Cannot start with 'deleted' (for anonymized users)

Password Validation

Min length: 8 characters
  Complexity:
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character (!@#$%^&*)
  Max length: 255
  Hashing: bcryptjs with salt rounds 10
  Never stored in plain text

Message Content Validation

Min length: 1 character
  Max length: 5000 characters
  Types: text, image, video
  Media URL: Valid URL format if type is image/video
  Encoding: UTF-8

File Upload Validation

Images:
  Types: jpg, jpeg, png, gif, webp
  Max size: 10MB
  Dimensions: Min 100x100, Max 5000x5000

Videos:
  Types: mp4, webm, mov, avi
  Max size: 50MB
  Duration: Max 5 minutes

Contact Request Validation

Receiver must exist and be active
  Sender cannot send to self
  No duplicate pending requests
  Only accepted requests allow messaging

---

## API Endpoints

Base URL: http://localhost:4000/api/v1

Auth Endpoints

POST /auth/register
  Request:
    {
      "email": "user@example.com",
      "password": "SecurePass123!"
    }
  Response: 201
    {
      "success": true,
      "data": {
        "id": "uuid",
        "email": "user@example.com",
        "message": "Verification email sent"
      }
    }

POST /auth/verify-email
  Request:
    {
      "token": "verification_token_from_email"
    }
  Response: 200
    {
      "success": true,
      "data": {
        "message": "Email verified successfully"
      }
    }

POST /auth/login
  Request:
    {
      "email": "user@example.com",
      "password": "SecurePass123!"
    }
  Response: 200
    {
      "success": true,
      "data": {
        "user": { ... User object ... },
        "token": "jwt_token"
      }
    }
  Sets: httpOnly cookie with JWT token

POST /auth/logout
  Response: 200
    {
      "success": true,
      "data": { "message": "Logged out" }
    }

POST /auth/refresh-token
  Response: 200
    {
      "success": true,
      "data": { "token": "new_jwt_token" }
    }

POST /auth/forgot-password
  Request:
    {
      "email": "user@example.com"
    }
  Response: 200
    {
      "success": true,
      "data": { "message": "Reset email sent" }
    }

POST /auth/reset-password
  Request:
    {
      "token": "reset_token",
      "newPassword": "NewPass123!"
    }
  Response: 200
    {
      "success": true,
      "data": { "message": "Password reset successful" }
    }

User Endpoints

GET /users/me
  Authentication: Required (JWT)
  Response: 200
    {
      "success": true,
      "data": { ... User object ... }
    }

PATCH /users/me
  Authentication: Required
  Request:
    {
      "username": "newusername",
      "fullName": "New Name",
      "bio": "New bio",
      "avatarUrl": "https://..."
    }
  Response: 200
    {
      "success": true,
      "data": { ... Updated User ... }
    }

POST /users/me/change-email
  Authentication: Required
  Request:
    {
      "newEmail": "newemail@example.com"
    }
  Response: 200
    {
      "success": true,
      "data": { "message": "Verification sent to new email" }
    }

DELETE /users/me
  Authentication: Required
  Request:
    {
      "password": "current_password"
    }
  Response: 200
    {
      "success": true,
      "data": { "message": "Account deleted" }
    }

GET /users/search
  Authentication: Required
  Query params:
    - q: search query (username or email)
    - limit: default 10, max 50
  Response: 200
    {
      "success": true,
      "data": [
        { ... User objects ... }
      ]
    }

GET /users/:userId
  Authentication: Required
  Response: 200
    {
      "success": true,
      "data": { ... User object ... }
    }

Chat Endpoints

GET /chats
  Authentication: Required
  Response: 200
    {
      "success": true,
      "data": [
        { ... Chat objects ... }
      ]
    }

GET /chats/:chatId/messages
  Authentication: Required
  Query params:
    - page: default 1
    - limit: default 50
  Response: 200
    {
      "success": true,
      "data": { ... PaginatedResponse of Messages ... }
    }

POST /chats/:chatId/messages
  Authentication: Required
  Request:
    {
      "content": "message text",
      "messageType": "text",
      "mediaUrl": null
    }
  Response: 201
    {
      "success": true,
      "data": { ... Message object ... }
    }

Contact Endpoints

POST /contacts/requests
  Authentication: Required
  Request:
    {
      "receiverId": "uuid_of_receiver"
    }
  Response: 201
    {
      "success": true,
      "data": { ... ContactRequest object ... }
    }

GET /contacts/requests/incoming
  Authentication: Required
  Response: 200
    {
      "success": true,
      "data": [
        { ... ContactRequest objects ... }
      ]
    }

PATCH /contacts/requests/:requestId
  Authentication: Required
  Request:
    {
      "status": "accepted" or "declined"
    }
  Response: 200
    {
      "success": true,
      "data": { ... Updated ContactRequest ... }
    }

GET /contacts
  Authentication: Required
  Response: 200
    {
      "success": true,
      "data": [
        { ... User objects (contacts) ... }
      ]
    }

File Endpoints

POST /files/upload
  Authentication: Required
  Content-Type: multipart/form-data
  Request:
    - file: binary file
    - type: 'image' or 'video'
  Response: 200
    {
      "success": true,
      "data": {
        "url": "cloudinary_url"
      }
    }

---

## WebSocket Events

Connection

Socket.IO server running on backend.
Frontend connects on chat load.
Emits userId on connection for presence tracking.
Handles disconnection and auto-reconnection.

Client to Server Events

message:send
  Emitted when user sends a message.
  Payload:
    {
      "chatId": "uuid",
      "content": "message text",
      "messageType": "text|image|video",
      "mediaUrl": null or "url"
    }

typing:start
  Emitted when user starts typing (first keystroke).
  Payload:
    {
      "chatId": "uuid"
    }

typing:stop
  Emitted when user stops typing (3 seconds inactivity).
  Payload:
    {
      "chatId": "uuid"
    }

presence:update
  Emitted on login/logout.
  Payload:
    {
      "userId": "uuid",
      "status": "online|offline"
    }

Server to Client Events

message:received
  Sent to all users in chat when new message arrives.
  Payload:
    {
      "message": { ... Message object ... }
    }

typing:indicator
  Sent to other user in chat when user is typing.
  Payload:
    {
      "userId": "uuid",
      "username": "username",
      "chatId": "uuid"
    }

presence:changed
  Sent to all contacts when user status changes.
  Payload:
    {
      "userId": "uuid",
      "status": "online|offline",
      "lastSeenAt": "timestamp"
    }

error:event
  Sent on any error during Socket.IO operation.
  Payload:
    {
      "code": "error_code",
      "message": "human readable message"
    }

Namespaces

/chats
  Namespace for chat-related events.
  Users join rooms by chatId (e.g., room 'chat:uuid').
  Only users in the conversation join the room.

Example flow:
  1. User opens chat (chatId: 123)
  2. Connect to /chats namespace
  3. Join room 'chat:123'
  4. Emit message:send event
  5. Server broadcasts to room 'chat:123'
  6. Other user receives message:received event

---

## Rate Limiting Strategy

Global Rate Limits (per IP):
  - 100 requests / 15 minutes

Endpoint-Specific Limits (per user):
  - POST /auth/login: 5 attempts / 15 minutes
  - POST /auth/register: 3 attempts / hour
  - POST /auth/forgot-password: 5 attempts / hour
  - POST /chats/:chatId/messages: 100 / hour
  - GET /users/search: 50 / hour
  - POST /files/upload: 5 / hour (10MB/day total)

WebSocket Events:
  - message:send: 100 / hour
  - typing:start: 50 / hour

Behavior:
  - Returns HTTP 429 (Too Many Requests)
  - Includes Retry-After header
  - Error response includes reset time

---

## Error Handling

All errors follow standard response format:

HTTP 400 (Bad Request)
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Email is required"
    }
  }

HTTP 401 (Unauthorized)
  {
    "success": false,
    "error": {
      "code": "UNAUTHORIZED",
      "message": "Invalid credentials"
    }
  }

HTTP 403 (Forbidden)
  {
    "success": false,
    "error": {
      "code": "FORBIDDEN",
      "message": "You cannot access this resource"
    }
  }

HTTP 404 (Not Found)
  {
    "success": false,
    "error": {
      "code": "NOT_FOUND",
      "message": "User not found"
    }
  }

HTTP 409 (Conflict)
  {
    "success": false,
    "error": {
      "code": "CONFLICT",
      "message": "Email already registered"
    }
  }

HTTP 429 (Too Many Requests)
  {
    "success": false,
    "error": {
      "code": "RATE_LIMIT_EXCEEDED",
      "message": "Too many requests. Try again later."
    },
    "retryAfter": 300
  }

HTTP 500 (Internal Server Error)
  {
    "success": false,
    "error": {
      "code": "INTERNAL_ERROR",
      "message": "An unexpected error occurred"
    }
  }

Error codes defined in packages/constants/error-messages.ts
Logged with Winston on backend
Displayed with Sonner toast on frontend