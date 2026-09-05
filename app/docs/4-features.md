# Email-Chat-Pro — Complete Feature List

## Phase 0: Infrastructure and Project Setup

Feature: Project Structure and Dependencies Installation
  Description: Set up monorepo with pnpm workspaces. Install all frontend and
  backend dependencies. Configure Docker and Docker Compose for PostgreSQL.
  Setup environment templates (.env.example).
  Acceptance Criteria:
    - Monorepo structure created with apps/frontend, apps/backend, packages/*
    - All npm dependencies installed and locked
    - Docker Compose runs PostgreSQL on localhost:5432
    - ESLint and Prettier configured and working
    - TypeScript strict mode enabled in all apps
  Phase: 0
  Priority: Critical

Feature: Frontend Folder Structure and File Organization
  Description: Create all frontend folders and files according to architecture.md.
  Organize components by domain (Auth, Chat, Layout, Common, Providers).
  Setup configuration files (next.config.ts, tsconfig.json, tailwind.config.ts).
  Acceptance Criteria:
    - All frontend folders created as per rules.md
    - Component structure ready
    - Config files (i18n, api, env) in place
    - Next.js app router structure ready
  Phase: 0
  Priority: Critical

Feature: Backend Folder Structure and Module Setup
  Description: Create all backend folders and modules according to architecture.md.
  Initialize NestJS modules structure. Setup configuration files
  (database.config.ts, jwt.config.ts, etc).
  Acceptance Criteria:
    - All backend folders created
    - NestJS modules structure ready (auth, users, chat, etc)
    - Configuration files setup
    - Database connection configured
  Phase: 0
  Priority: Critical

Feature: Shared Packages Setup
  Description: Create packages/types, packages/constants, and packages/utils.
  Setup TypeScript compilation for shared packages. Configure tsconfig for
  path aliases (@/packages/*).
  Acceptance Criteria:
    - packages/types exports all API types
    - packages/constants exports error messages and validation rules
    - packages/utils exports shared functions
    - Path aliases working in both frontend and backend
  Phase: 0
  Priority: Critical

Feature: Docker and Development Environment
  Description: Complete Docker Compose setup with PostgreSQL database.
  Create docker-compose.yml with database service. Setup health checks.
  Document database connection and initialization.
  Acceptance Criteria:
    - Docker Compose starts PostgreSQL
    - Database accessible on localhost:5432
    - Volume mounted for data persistence
    - npm run dev starts all services
  Phase: 0
  Priority: Critical

---

## Phase 1: Authentication and User Profile Management

Feature: User Registration with Email
  Description: Create registration page and backend endpoint. User signs up with
  email and password. Backend validates input, checks email uniqueness, hashes
  password with bcryptjs, stores user in database.
  Acceptance Criteria:
    - Frontend registration form with email and password
    - Backend validates email format (Zod)
    - Password minimum 8 characters, complexity rules
    - Email uniqueness check in database
    - Password hashed with bcryptjs before storage
    - User created in pending/unverified state
    - Response includes success message
  Phase: 1
  Priority: Critical

Feature: Email Verification System
  Description: Send verification email after registration. Email contains unique
  verification link. User clicks link to verify email. Account becomes active.
  Acceptance Criteria:
    - Verification email sent automatically after registration
    - Email contains unique verification token
    - Link valid for 24 hours
    - Clicking link marks email as verified
    - User cannot login until email verified
    - Error if token expired or already verified
    - Resend verification email option available
  Phase: 1
  Priority: Critical

Feature: User Login and JWT Authentication
  Description: Create login page and authentication system. User enters email and
  password. Backend validates, generates JWT token. Token stored in httpOnly cookie.
  User can access protected endpoints.
  Acceptance Criteria:
    - Frontend login form with email and password
    - Backend verifies email exists and is verified
    - Password validated against hash
    - JWT token generated with 7-day expiration
    - Token stored in httpOnly cookie (secure)
    - Unauthorized endpoint returns 401
    - Token refreshed on access if near expiration
    - Multiple devices supported (separate tokens)
  Phase: 1
  Priority: Critical

Feature: User Logout
  Description: Logout functionality clears JWT token and session. User redirected
  to login page. Cannot access protected pages without login.
  Acceptance Criteria:
    - Logout button in UI
    - JWT token cleared from cookies
    - User redirected to login page
    - Protected routes inaccessible after logout
    - Multiple logout from same user invalidates all tokens
  Phase: 1
  Priority: Critical

Feature: Profile Setup After Email Verification
  Description: After email verification, user completes profile with username,
  full name, bio, and profile picture. Profile must be completed to access chat.
  Acceptance Criteria:
    - Profile completion page shown after email verification
    - User ID (username) field required, unique
    - Full name field required
    - Bio field optional
    - Profile picture upload (to Cloudinary in Phase 4)
    - Username validation: alphanumeric, underscore, hyphen, 3-20 chars
    - Profile saved in database
    - User marked as "profile_complete"
  Phase: 1
  Priority: Critical

Feature: Profile Viewing and Editing
  Description: User can view their profile and edit information. Update username,
  full name, bio, and profile picture. Changes saved to database immediately.
  Acceptance Criteria:
    - Profile page displays current information
    - Edit mode available
    - All fields editable except email (separate flow)
    - Username uniqueness checked (excluding own)
    - Changes persisted to database
    - Success message shown after save
    - Profile visible to other users (in Phase 3)
  Phase: 1
  Priority: High

Feature: Email Change
  Description: User can change email address. New email must be verified before
  taking effect. Old email still valid until verification complete.
  Acceptance Criteria:
    - Email change form in settings
    - New email validation
    - Verification email sent to new email
    - New email confirmed before change
    - Old email remains active until verified
    - User can cancel change
    - Cannot use email already in use by another user
  Phase: 1
  Priority: High

Feature: Account Deletion (Soft Delete)
  Description: User can permanently delete account. Data is soft deleted (marked
  with deleted_at timestamp). User cannot login anymore. Old messages remain
  attributed to "Deleted User".
  Acceptance Criteria:
    - Delete account button in settings
    - Confirmation dialog asking for password
    - Account marked with deleted_at timestamp
    - All user data preserved in database
    - User cannot login with email after deletion
    - JWT tokens become invalid
    - Profile shows "Deleted User" in messages
    - Message history intact for other users
  Phase: 1
  Priority: High

Feature: Protected Routes and JWT Middleware
  Description: Implement JWT verification middleware. Protect all authenticated
  endpoints. Redirect unauthenticated users to login.
  Acceptance Criteria:
    - JWT middleware on all protected endpoints
    - Invalid token returns 401
    - Expired token returns 401
    - User ID extracted from token and passed to route
    - Frontend guards protect pages from unauthenticated access
    - Redirect to login if token missing or invalid
  Phase: 1
  Priority: Critical

Feature: Error Handling and User Feedback
  Description: Implement consistent error messages for all auth flows. Display
  user-friendly error messages via Sonner toasts.
  Acceptance Criteria:
    - All errors use constants from packages/constants
    - Toast notifications for all errors
    - Field-level validation errors shown in forms
    - Meaningful error messages (not technical jargon)
    - Errors logged with Winston (backend)
  Phase: 1
  Priority: High

---

## Phase 2: Real-time Messaging Core

Feature: Chat Window and Message Display
  Description: Create chat interface with message list. Display all messages
  between two users. Messages sorted by timestamp. Shows sender avatar and name.
  Acceptance Criteria:
    - Chat window displays messages in chronological order
    - Each message shows sender name and timestamp
    - Sender avatar displayed for each message
    - Message text displayed clearly
    - Long messages wrapped to next line
    - Messages loaded and displayed in real time
  Phase: 2
  Priority: Critical

Feature: Message Input and Sending
  Description: Message input field at bottom of chat. User types message and
  sends via Enter key or Send button. Message immediately sent to backend and
  appears for both users in real time.
  Acceptance Criteria:
    - Text input field for message
    - Send button or Enter to send
    - Message not sent if empty
    - Message sent via Socket.IO event
    - Message appears immediately for sender
    - Loading state while sending
    - Error handling if send fails
  Phase: 2
  Priority: Critical

Feature: Socket.IO Real-time Communication
  Description: Implement WebSocket server with Socket.IO. Users connect when
  entering chat. Messages sent and received in real time. Connection handles
  disconnection and reconnection gracefully.
  Acceptance Criteria:
    - Socket.IO server running on backend
    - Client connects when opening chat
    - Client disconnects on leave/logout
    - Message events sent and received in real time
    - Automatic reconnection if connection lost
    - No message loss on disconnect/reconnect
    - Proper error handling and logging
  Phase: 2
  Priority: Critical

Feature: Message Persistence in Database
  Description: All messages stored in database with timestamp, sender ID, chat ID.
  Messages retrievable from database. No message loss on server restart.
  Acceptance Criteria:
    - Message entity with user_id, chat_id, content, created_at
    - Messages inserted in database when sent
    - Messages retrieved on chat load
    - Timestamp accurate (server time, not client)
    - No duplicate messages
    - Messages survive server restart
  Phase: 2
  Priority: Critical

Feature: Message History Retrieval
  Description: Load complete message history when opening chat. Display oldest
  messages at top, newest at bottom. Support pagination for large histories.
  Acceptance Criteria:
    - Load messages from database on chat open
    - Display all historical messages
    - Messages sorted by timestamp ascending
    - Pagination: load 50 messages at a time
    - Load more on scroll up
    - Recent messages loaded first
  Phase: 2
  Priority: High

Feature: Image Message Support
  Description: User can send images in chat. Images uploaded to Cloudinary.
  Image URL stored in message. Images displayed inline in chat.
  Acceptance Criteria:
    - Image upload button in chat
    - File type validation (jpg, png, gif, webp)
    - File size validation (max 10MB)
    - Upload to Cloudinary
    - URL stored in message
    - Image rendered in chat
    - Loading state during upload
    - Error handling for failed uploads
  Phase: 2
  Priority: High

Feature: Video Message Support
  Description: User can send videos in chat. Videos uploaded to Cloudinary.
  Video URL stored in message. Videos playable in chat.
  Acceptance Criteria:
    - Video upload button in chat
    - File type validation (mp4, webm, mov)
    - File size validation (max 50MB)
    - Upload to Cloudinary
    - URL stored in message
    - Video player embedded in chat
    - Thumbnail preview for videos
    - Loading state during upload
  Phase: 2
  Priority: High

Feature: Conversation Sidebar
  Description: Left sidebar showing all active conversations. Sorted by most
  recent activity. Shows last message preview and timestamp. Click to open chat.
  Acceptance Criteria:
    - Sidebar shows all active conversations
    - Sorted by most recent message
    - Shows contact name and avatar
    - Shows last message preview (first 50 chars)
    - Shows time of last message
    - Click opens conversation
    - Current conversation highlighted
    - Badge for unread messages (Phase 2+)
  Phase: 2
  Priority: High

---

## Phase 3: Contact Management and Search

Feature: User Search by Username
  Description: Search bar to find users by username. Display search results with
  user avatar and profile info. Click to view profile or send message request.
  Acceptance Criteria:
    - Search input in UI
    - Search queries backend endpoint
    - Results show matching usernames
    - Results show user avatar
    - Show partial matches
    - Show 10 results per query
    - Display user ID and bio
    - Cannot search for deleted users
  Phase: 3
  Priority: High

Feature: User Search by Email
  Description: Search users by email address. Shows results with profile info.
  Useful for finding specific users.
  Acceptance Criteria:
    - Search accepts email format
    - Exact email match returned
    - Shows user full name and avatar
    - Shows user ID
    - Only shows verified, active users
  Phase: 3
  Priority: High

Feature: Contact Request System
  Description: Send contact request to start messaging. Contact request appears
  on recipient's notifications. Recipient must accept before messaging enabled.
  Acceptance Criteria:
    - "Add Contact" or "Send Message" button on user profile
    - Contact request sent via backend
    - Request stored in database with status "pending"
    - Sender ID and receiver ID stored
    - Timestamp recorded
    - Duplicate requests prevented (check existing request)
    - User notified of incoming request
  Phase: 3
  Priority: Critical

Feature: Contact Request Notification
  Description: User receives notification of incoming contact request. Shows
  requester name and allows quick accept/decline actions.
  Acceptance Criteria:
    - In-app notification for request
    - Shows requester avatar and name
    - Quick accept button
    - Quick decline button
    - Request list in notifications area
    - Notification cleared after action
  Phase: 3
  Priority: High

Feature: Accept Contact Request
  Description: User accepts contact request. Both users can now message each
  other. Chat created and conversation appears in sidebar.
  Acceptance Criteria:
    - Accept button on notification
    - Accept button on contact request list
    - Status updated to "accepted" in database
    - Chat created between users
    - Both users can now send messages
    - Notification cleared
    - Conversation appears in sidebar for both
  Phase: 3
  Priority: Critical

Feature: Decline Contact Request
  Description: User declines contact request. Request deleted. Requester cannot
  message recipient. Can send new request later.
  Acceptance Criteria:
    - Decline button on notification
    - Decline button on contact request list
    - Status updated to "declined"
    - Messaging not enabled
    - Requester can send new request later
    - Notification cleared
  Phase: 3
  Priority: Critical

Feature: Contact List
  Description: View all contacts with whom you have accepted messages. Shows
  contact name, avatar, and last message. Access from sidebar or dedicated page.
  Acceptance Criteria:
    - Contact list page or sidebar section
    - Shows all accepted contacts
    - Shows name and avatar
    - Shows online/offline status
    - Shows last message preview
    - Shows last activity time
    - Click to open conversation
  Phase: 3
  Priority: High

Feature: Blocked Messaging Prevention
  Description: Prevent messaging between users without accepted contact request.
  System prevents sending messages to non-contacts. Error message shown.
  Acceptance Criteria:
    - Backend checks for accepted contact before allowing message
    - Frontend prevents message input for non-contacts
    - Error message if attempting to message
    - "Send Contact Request" button shown instead
  Phase: 3
  Priority: Critical

---

## Phase 4: Internationalization, Rate Limiting, Performance, and Advanced Features

Feature: Internationalization (i18n) Setup
  Description: Setup i18next for multiple languages. Support Persian (fa-IR) and
  English (en-US) initially. Translation files in public/locales/. Language
  switcher in UI.
  Acceptance Criteria:
    - i18next configured with namespaces (common, auth, chat, errors)
    - Translation files for Persian and English
    - Language detection from browser
    - Language switcher in header
    - User language preference saved
    - All UI text translatable
    - Numbers and dates formatted per language
  Phase: 4
  Priority: High

Feature: Persian Language Translations
  Description: Complete Persian translations for all UI text, error messages,
  placeholders, and notifications.
  Acceptance Criteria:
    - All pages translated to Persian
    - All form labels translated
    - All error messages translated
    - All notifications translated
    - Date/time format for Persian
    - RTL layout support
  Phase: 4
  Priority: High

Feature: English Language Translations
  Description: Complete English translations for all UI text and messages.
  Acceptance Criteria:
    - All pages translated to English
    - All form labels translated
    - All error messages translated
    - Professional English language
    - Consistent terminology
  Phase: 4
  Priority: High

Feature: Spanish Language Translations
  Description: Complete Spanish translations for all UI text and messages.
  Acceptance Criteria:
    - All pages translated to Spanish
    - All form labels translated
    - Professional Spanish language
    - Date/time format for Spanish
  Phase: 4
  Priority: Medium

Feature: Global Rate Limiting
  Description: Implement rate limiting on backend to prevent abuse. Limit requests
  per IP. Different limits for auth vs regular endpoints.
  Acceptance Criteria:
    - Global rate limit: 100 requests per 15 minutes per IP
    - Auth endpoints (login, register): 5 attempts per 15 minutes
    - Message send: 100 per hour per user
    - Search: 50 per hour per user
    - File upload: 5 per hour per user
    - Returns 429 status when exceeded
    - Clear error message shown to user
  Phase: 4
  Priority: High

Feature: Per-Endpoint Rate Limiting
  Description: Granular rate limiting rules for specific endpoints. Different
  limits based on endpoint sensitivity.
  Acceptance Criteria:
    - Login: 5 attempts/15 minutes
    - Register: 3 per hour per IP
    - Password reset: 5 per hour
    - Message send: 100 per hour
    - File upload: 5 per hour (10MB/day limit)
    - Search: 50 per hour
    - Returns 429 with retry-after header
    - Whitelist localhost in development
  Phase: 4
  Priority: High

Feature: User Online Status
  Description: Display online/offline status for users. Show green indicator for
  online users. Update status in real time via Socket.IO.
  Acceptance Criteria:
    - User marked as online when connected to Socket.IO
    - User marked as offline when disconnected
    - Status stored in database (redis optional)
    - Online status shown in contact list
    - Online status shown in conversation
    - Last seen timestamp updated
  Phase: 4
  Priority: High

Feature: Last Seen Timestamp
  Description: Track and display last activity time for each user. Shows "Last
  seen 2 hours ago" or specific time. Updates in real time.
  Acceptance Criteria:
    - Track last activity timestamp
    - Display relative time (2 hours ago, yesterday)
    - Update on every user action
    - Show specific time on hover
    - Display in contact list
    - Display in conversation
  Phase: 4
  Priority: High

Feature: Typing Indicator
  Description: Show "User is typing..." indicator when someone types. Appears
  while typing, disappears after 3 seconds of inactivity.
  Acceptance Criteria:
    - Emit typing event on keystroke
    - Display indicator for active typer
    - Disappear after 3 seconds inactivity
    - Show "is typing..." under contact name
    - Emitted via Socket.IO
    - Multiple typers support
  Phase: 4
  Priority: High

Feature: Message Timestamps
  Description: Display timestamp for each message. Show time in chat. Format:
  "HH:MM" for today, "Yesterday HH:MM", "DD/MM/YYYY" for older.
  Acceptance Criteria:
    - Timestamp displayed for each message
    - Format changes based on date (today, yesterday, older)
    - Hover shows full timestamp with date
    - Timestamps in user's timezone
    - Formatted per language (i18n)
  Phase: 4
  Priority: High

Feature: Password Reset / Forgot Password
  Description: User can reset forgotten password. Click "Forgot Password", enter
  email, receive reset link. Click link, set new password.
  Acceptance Criteria:
    - Forgot Password link on login page
    - Email input form
    - Reset email sent with unique token
    - Token valid for 1 hour
    - Click link takes to reset form
    - New password validated
    - Password reset in database
    - Old sessions invalidated
    - Success message shown
  Phase: 4
  Priority: High

Feature: Activity/Audit Logging
  Description: Log important user actions for security monitoring. Record login,
  logout, password changes, email changes, account deletion.
  Acceptance Criteria:
    - Login events logged
    - Logout events logged
    - Password change logged
    - Email change logged
    - Account deletion logged
    - Contact request accept/decline logged
    - Timestamps and IP addresses recorded
    - Admin view of activity logs
    - Winston structured logging
  Phase: 4
  Priority: High

Feature: Database Performance Optimization
  Description: Optimize database queries to prevent N+1 problems. Add indexes
  on frequently queried columns. Use eager loading where necessary.
  Acceptance Criteria:
    - All queries reviewed for N+1
    - Indexes on: email, username, chat_id, user_id, created_at
    - Eager loading for relationships
    - No SELECT N queries
    - Query performance benchmarked
    - Explain plan analyzed for slow queries
  Phase: 4
  Priority: High

Feature: Frontend Performance Optimization
  Description: Optimize frontend for speed. Lazy load components, optimize images,
  reduce bundle size.
  Acceptance Criteria:
    - Code splitting for routes
    - Lazy load Chat components
    - Image optimization (Cloudinary)
    - Bundle size < 500KB (gzipped)
    - Lighthouse score > 90
    - First Contentful Paint < 2 seconds
  Phase: 4
  Priority: High

Feature: Caching Strategy
  Description: Implement caching to reduce API calls. TanStack Query handles
  server state. Cache messages, user profiles, contacts.
  Acceptance Criteria:
    - TanStack Query configured
    - Message history cached
    - User profiles cached
    - Contact lists cached
    - Cache invalidation on updates
    - Stale-while-revalidate pattern
  Phase: 4
  Priority: Medium

Feature: Error Monitoring and Logging
  Description: Comprehensive error tracking and logging. Backend errors logged
  with Winston. Frontend errors logged and sent to monitoring service.
  Acceptance Criteria:
    - Winston logger configured
    - All errors logged with context
    - Error messages stored
    - Stack traces included
    - Frontend errors caught globally
    - Sentry or similar integration (optional)
  Phase: 4
  Priority: High

---

## Out of Scope Features

These features will NOT be implemented in Email-Chat-Pro:

Not Implementing:
  - Video calls or voice calls
  - Message editing (edit sent messages)
  - Message deletion (delete sent messages)
  - Group chats or channels
  - Read receipts or seen status
  - Message reactions or emojis
  - Rich text formatting (bold, italic, etc)
  - Message pinning
  - Message search
  - Blocking or muting users
  - Admin panel or moderation
  - Broadcast or channel functionality
  - File sharing (only images and videos for now)
  - Message encryption (end-to-end)
  - Payment or subscription features
  - Integration with social media
  - Mobile-specific optimizations (Phase 5+)

All out-of-scope features may be added in Phase 5+ if approved and added to
features.md explicitly.