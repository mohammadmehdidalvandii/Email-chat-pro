# Email-Chat-Pro — What and Why

## One-liner

A real-time 1-on-1 messenger where users communicate through email-based
accounts. Sign up with email, verify your email address, complete your profile,
search for other users by username or email, and start messaging instantly.

## Goals

1. Build a full-stack real-time messaging platform from scratch with explicit
   layers: raw SQL with TypeORM on the backend, hand-rolled JWT authentication
   with bcryptjs, explicit Socket.IO WebSocket events for real-time updates.

2. Implement a complete account lifecycle: email-based registration with
   mandatory email verification, profile setup and editing, email changes,
   secure logout, and permanent account deletion with data preservation.

3. Enable real-time messaging: messages appear instantly for both users in
   real time, persist across server restarts, and full message history remains
   accessible.

4. Enforce a contact request system: users cannot message anyone without first
   sending a contact request. The recipient must accept or decline. Messaging
   is only enabled after acceptance.

## User stories

- As a new user, I can create an account with my email and password. The system
  sends a verification email. I must click the verification link to activate
  my account.

- As a verified user, I can complete my profile: choose a username (User ID),
  enter my full name, add a bio, and upload a profile picture.

- As a user, I can search for other users by their username or email address.

- As a user, when I find someone I want to chat with, I can send them a
  contact request. They receive a notification of the incoming request.

- As a user, I can view contact requests I have received. I can accept or
  decline each request.

- As a user, once my contact request is accepted, I can start sending messages
  to that person. Messages appear for them in real time.

- As a user, I can send text messages, images, and videos in conversations.
  All messages are stored permanently.

- As a user, I can see all my active conversations in a left sidebar, sorted by
  most recent activity. The main area displays the selected conversation thread.

- As a user, I can view the complete message history with any contact whenever
  I return to the app.

- As a user, I can edit my profile at any time: change username, name, bio, or
  profile picture. I can also change my email address (must verify the new email).

- As a user, I can log out. When I log back in, all my conversations and
  messages are still there.

- As a user, I can permanently delete my account. After deletion: my profile is
  completely erased, I cannot log in again with that email, but all my messages
  remain in conversations with others and are attributed to "Deleted User".

## Non-goals (explicitly out of scope)

- Group chats or channels
- Message editing or deletion
- Read receipts or unread message counts
- Typing indicators (may be added in later phases)
- Email notifications or password reset emails
- OAuth or social login
- File uploads other than profile pictures and conversation media
- Blocking, muting, or other user controls
- Message reactions or rich text formatting
- Voice or video calls
- Scaling infrastructure: no Redis, no message brokers, no clustering

If a feature is not listed in features.md, it will not be built until explicitly
added there.

## Architecture overview

Frontend (Next.js, React, TypeScript):
- Pages: auth (signup, login, email verification), dashboard (chats, search, settings)
- Component organization: Auth, Chat, Email, Layout, Common, Providers
- State management: Zustand for UI state, TanStack Query for server state
- Real-time updates via Socket.IO client
- API communication via Axios with interceptors
- Internationalization with i18next (Persian and English)
- Form validation with React Hook Form and Zod
- Styling with Tailwind CSS and ShadCN UI components

Backend (NestJS, Node.js, TypeScript):
- Modular architecture: auth, users, chat, messages, websocket, files
- PostgreSQL database with TypeORM ORM
- JWT authentication with bcryptjs password hashing
- Socket.IO gateway for real-time WebSocket communication
- File uploads to Cloudinary for images and videos
- Swagger documentation for all API endpoints
- Winston structured logging
- Rate limiting with nestjs/throttler and express-rate-limit
- CORS and Helmet for security

Shared packages (Monorepo):
- types: TypeScript interfaces for API contracts
- constants: error messages, validation rules, status codes
- utils: shared validators, formatters, error handlers

Infrastructure:
- Monorepo with pnpm workspaces
- Docker and Docker Compose for local development (PostgreSQL database)
- Environment-based configuration

## Done means

- Two users can create accounts, verify emails, complete profiles, search for
  each other, send a contact request, accept it, exchange messages in real time,
  and all messages persist.
- A contact request can be sent and declined; the sender cannot message the
  recipient afterwards.
- Server can be restarted without losing any messages.
- A deleted account cannot log in, its JWT is invalidated, its profile is gone,
  but its old messages remain and display as "Deleted User".
- Client build passes with zero TypeScript errors.
- Server passes type checking with zero errors.
- All API endpoints are documented in Swagger.
- Both Persian (fa-IR) and English (en-US) interfaces work correctly.

## Data integrity rules

- All messages are permanently stored in the database.
- When an account is deleted, all message data is preserved.
- A deleted account cannot authenticate; JWT tokens become invalid.
- One email address can only have one active account.
- Contact requests are mandatory; no direct messaging without approval.
- All contact requests and responses are logged.
- User profiles can be edited, but message history cannot be modified.

## Development phases

Phase 1: Foundation and Authentication
- Set up monorepo with pnpm workspaces and root configuration
- Configure Docker and Docker Compose for PostgreSQL
- Design database schema with TypeORM
- Implement user registration with email and password
- Implement email verification system and sending
- Implement JWT-based login and authentication
- Implement profile setup and profile editing
- Implement email change with re-verification
- Build frontend auth pages: signup, login, email verification

Phase 2: Core Messaging and Real-time
- Design chat and message database entities
- Set up Socket.IO server and client
- Implement real-time message sending and receiving
- Implement message persistence and history retrieval
- Build chat window and message display components
- Implement real-time connection status
- Test message delivery across server restarts

Phase 3: Contact Management and Search
- Implement contact request system (send, list, accept, decline)
- Implement user search by username and email
- Build contact list and chat list UI
- Implement contact request notifications
- Ensure blocked messaging for declined requests
- Build settings and profile management pages

Phase 4: Media, Polish, and Deployment
- Implement file upload to Cloudinary (images and videos)
- Add image and video message support
- Implement error handling and user feedback
- Set up Winston logging
- Implement rate limiting
- Complete internationalization setup with Persian translations
- Optimize performance
- Add testing
- Prepare for deployment

## Important implementation details

- Email verification is mandatory before any app features are accessible.
- Contact requests must be approved before any messaging can occur.
- Account deletion is permanent but data-preserving (soft delete).
- All Socket.IO events are type-safe with explicit TypeScript definitions.
- Frontend and backend share type definitions from packages/types.
- All error messages come from packages/constants for consistency.
- Naming conventions and code standards are defined in rules.md.
- Features not listed in features.md will not be implemented.

## Team and roles

Mohammad Mehdi: Product Owner, Architect, Decision Maker, Code Reviewer
Claude: Development Assistant, Implementation, Technical Guidance

Development will proceed in layers and phases as defined above, with features
added only when explicitly listed in features.md.