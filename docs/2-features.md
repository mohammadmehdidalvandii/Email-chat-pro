# Email-Chat-Pro — Feature Specification

This document is the Single Source of Truth for product features and feature scope.

A feature must be explicitly defined in this document before it can be implemented.

Technical implementation details belong in `architecture.md`, `stack.md`, `rules.md`, or `current-task.md`.

---

# Phase 0 — Infrastructure and Project Setup

## Feature: Monorepo and Workspace Setup

**Description:**
Establish the project as a monorepo containing the frontend application, backend application, and shared packages.

**Acceptance Criteria:**

* `apps/frontend` exists.
* `apps/backend` exists.
* `packages/types` exists.
* `packages/constants` exists.
* `packages/utils` exists.
* npm workspaces are configured.
* Dependencies can be installed from the repository root.
* TypeScript strict mode is enabled.
* ESLint and Prettier are configured.
* Workspace packages can be consumed by the applications.

**Phase:** 0
**Priority:** Critical

---

## Feature: Frontend Application Foundation

**Description:**
Establish the Next.js frontend application and its foundational structure according to `architecture.md`.

**Acceptance Criteria:**

* Next.js application is available under `apps/frontend`.
* App Router is configured.
* TypeScript is configured in strict mode.
* Required frontend configuration is present.
* The application starts successfully.
* Frontend runs on port `3000`.
* The application structure follows `architecture.md`.

**Phase:** 0
**Priority:** Critical

---

## Feature: Backend Application Foundation

**Description:**
Establish the NestJS backend application and its foundational module structure according to `architecture.md`.

**Acceptance Criteria:**

* NestJS application is available under `apps/backend`.
* Required application modules are established.
* TypeScript is configured in strict mode.
* PostgreSQL configuration is prepared.
* API application starts successfully.
* Backend runs on port `4000`.
* The backend structure follows `architecture.md`.

**Phase:** 0
**Priority:** Critical

---

## Feature: Shared Packages Foundation

**Description:**
Establish shared packages used by both frontend and backend.

**Acceptance Criteria:**

* `packages/types` contains shared API contracts.
* `packages/constants` contains shared constants and validation definitions.
* `packages/utils` contains approved shared utilities.
* Frontend can consume shared packages.
* Backend can consume shared packages.
* Shared packages are libraries and are never treated as standalone applications.
* API contracts are not duplicated independently inside frontend or backend.

**Phase:** 0
**Priority:** Critical

---

## Feature: Local Database Environment

**Description:**
Provide a local PostgreSQL development environment using Docker Compose.

**Acceptance Criteria:**

* PostgreSQL runs through Docker Compose.
* PostgreSQL is available on port `5432`.
* Database data persists across container restarts.
* Backend can connect to the local database.
* Database configuration is documented.
* Environment variables are provided through appropriate `.env.example` files.

**Phase:** 0
**Priority:** Critical

---

# Phase 1 — Authentication and User Profile

## Feature: User Registration

**Description:**
Users can create an account using an email address and password.

**Acceptance Criteria:**

* User can submit email and password.
* Email format is validated.
* Password requirements are enforced according to the shared validation rules.
* Email uniqueness is enforced.
* Password is securely hashed before storage.
* New accounts start in an unverified state.
* Registration returns an appropriate success or error response.

**Phase:** 1
**Priority:** Critical

---

## Feature: Email Verification

**Description:**
Users must verify their email address before accessing authenticated application features.

**Acceptance Criteria:**

* Verification process is initiated after registration.
* A unique verification token is generated.
* Verification tokens have a defined expiration period.
* A valid verification link activates email verification.
* Expired tokens are rejected.
* Already-used verification tokens are rejected.
* Users can request another verification email.
* Unverified users cannot access protected application features.

**Phase:** 1
**Priority:** Critical

---

## Feature: User Login

**Description:**
Verified users can authenticate using their email and password.

**Acceptance Criteria:**

* User can submit email and password.
* Credentials are validated securely.
* Unverified users cannot authenticate successfully.
* Successful authentication establishes an authenticated session.
* Protected resources require authentication.
* Invalid credentials return an appropriate authentication error.

**Phase:** 1
**Priority:** Critical

---

## Feature: User Logout

**Description:**
Authenticated users can securely end their current authenticated session.

**Acceptance Criteria:**

* Logout is available to authenticated users.
* The current authentication session is invalidated.
* Protected resources are inaccessible after logout.
* User is returned to the unauthenticated application state.
* Logout does not delete user data or conversations.

**Phase:** 1
**Priority:** Critical

---

## Feature: Profile Setup

**Description:**
After email verification, users complete the required profile information.

**Acceptance Criteria:**

* User can choose a unique username.
* User can enter a full name.
* User can optionally provide a bio.
* Username validation follows the shared validation rules.
* Profile information is persisted.
* User is marked as having completed the required profile information.
* Users cannot access features that require a completed profile until required profile information is available.

**Phase:** 1
**Priority:** Critical

**Dependency:** Email Verification

---

## Feature: Profile Viewing and Editing

**Description:**
Users can view and update their profile information.

**Acceptance Criteria:**

* User can view current profile information.
* User can update username.
* User can update full name.
* User can update bio.
* Username uniqueness is enforced.
* Profile changes are persisted.
* Email changes use the separate email-change flow.

**Phase:** 1
**Priority:** High

---

## Feature: Email Change

**Description:**
Authenticated users can change their email address through a verification flow.

**Acceptance Criteria:**

* User can submit a new email address.
* New email format is validated.
* New email cannot belong to another active account.
* Verification is required before the new email becomes active.
* Existing email remains active until the new email is verified.
* User can cancel a pending email change.

**Phase:** 1
**Priority:** High

---

## Feature: Account Deletion

**Description:**
Users can permanently delete their account while preserving historical message data.

**Acceptance Criteria:**

* User can request account deletion.
* Deletion requires explicit confirmation.
* Deleted accounts cannot authenticate.
* Existing authentication sessions become invalid.
* User profile is no longer treated as an active profile.
* Historical messages remain preserved.
* Historical messages associated with the deleted user display `Deleted User` where appropriate.
* Other participants retain access to their historical conversations.

**Phase:** 1
**Priority:** High

---

## Feature: Protected Application Access

**Description:**
Authenticated application features and protected API resources require valid authentication.

**Acceptance Criteria:**

* Protected API resources reject unauthenticated requests.
* Invalid authentication is rejected.
* Expired authentication is rejected.
* The authenticated user identity is available to authorized backend operations.
* Frontend protected pages require authentication.
* Unauthenticated users are redirected to the appropriate authentication flow.

**Phase:** 1
**Priority:** Critical

---

## Feature: Authentication Error Handling

**Description:**
Authentication-related errors are presented consistently and in a user-friendly manner.

**Acceptance Criteria:**

* Shared error definitions are used where applicable.
* Validation errors are displayed at the field level.
* Authentication failures provide meaningful user-facing feedback.
* Errors are handled through the appropriate UI mechanism.
* Backend errors are logged according to the project's logging rules.

**Phase:** 1
**Priority:** High

---

# Phase 2 — Real-time Messaging

## Feature: Conversation and Chat Window

**Description:**
Users can open a conversation with an accepted contact and view its messages.

**Acceptance Criteria:**

* Conversation displays messages between the two participants.
* Messages are displayed in chronological order.
* Sender identity is displayed.
* Message timestamps are displayed.
* Text messages are rendered correctly.
* Long messages remain readable.
* Conversation updates when new messages arrive.

**Phase:** 2
**Priority:** Critical

**Dependency:** Accepted Contact Relationship

---

## Feature: Text Message Sending

**Description:**
Users can send text messages to an accepted contact.

**Acceptance Criteria:**

* User can enter a text message.
* Empty messages cannot be sent.
* User can send using the configured send interaction.
* Message is delivered through the real-time messaging system.
* Sender sees the sent message.
* Recipient receives the message in real time.
* Failed sends provide appropriate feedback.

**Phase:** 2
**Priority:** Critical

---

## Feature: Real-time Communication

**Description:**
The application provides real-time communication between connected users.

**Acceptance Criteria:**

* Authenticated users can establish a real-time connection.
* Messages are delivered in real time.
* Connection failures are handled gracefully.
* Reconnection is supported.
* Message persistence prevents loss of successfully stored messages during temporary connection failures.
* Real-time events use the shared type definitions.

**Phase:** 2
**Priority:** Critical

---

## Feature: Message Persistence

**Description:**
Messages are permanently stored and can be retrieved after application or server restarts.

**Acceptance Criteria:**

* Messages are stored in PostgreSQL.
* Messages contain the required conversation and sender information.
* Server-side timestamps are used.
* Successfully stored messages survive backend restarts.
* Duplicate message creation is prevented according to the message contract.

**Phase:** 2
**Priority:** Critical

---

## Feature: Message History

**Description:**
Users can retrieve historical messages from a conversation.

**Acceptance Criteria:**

* Existing messages are loaded when a conversation is opened.
* Newest messages are available immediately.
* Messages are displayed from oldest to newest within the loaded view.
* Older messages can be loaded by scrolling upward.
* Message history is paginated.
* Pagination does not modify existing message data.

**Phase:** 2
**Priority:** High

---

## Feature: Conversation List

**Description:**
Users can view their active conversations in a conversation list.

**Acceptance Criteria:**

* Active conversations are displayed.
* Conversations are sorted by recent activity.
* Contact name is displayed.
* Contact avatar is displayed when available.
* Last message preview is displayed.
* Last activity time is displayed.
* Selecting a conversation opens the corresponding chat.

**Phase:** 2
**Priority:** High

---

# Phase 3 — Contacts and Search

## Feature: User Search

**Description:**
Users can search for active users by username or email.

**Acceptance Criteria:**

* Search by username is supported.
* Search by email is supported.
* Username search supports appropriate partial matching.
* Email search supports exact matching.
* Only eligible active users are returned.
* Deleted users are not returned.
* Search results provide the information necessary to identify a user.
* Search results are limited to a defined result count.

**Phase:** 3
**Priority:** High

---

## Feature: Contact Request

**Description:**
Users can send contact requests to other active users.

**Acceptance Criteria:**

* User can send a contact request.
* Contact requests are persisted.
* Sender and recipient are recorded.
* Request creation time is recorded.
* Duplicate active requests are prevented.
* The recipient is informed of the incoming request.
* Messaging is not enabled by merely sending the request.

**Phase:** 3
**Priority:** Critical

---

## Feature: Contact Request Management

**Description:**
Recipients can view and respond to incoming contact requests.

**Acceptance Criteria:**

* Recipient can view pending requests.
* Recipient can accept a request.
* Recipient can decline a request.
* Accepted requests create an active contact relationship.
* Declined requests do not enable messaging.
* Request state is persisted.
* Appropriate request notifications are updated after the action.

**Phase:** 3
**Priority:** Critical

---

## Feature: Contact List

**Description:**
Users can view their accepted contacts.

**Acceptance Criteria:**

* Accepted contacts are displayed.
* Contact name is displayed.
* Contact avatar is displayed when available.
* Last message information is displayed where available.
* Last activity information is displayed where available.
* Selecting a contact can open the corresponding conversation.

**Phase:** 3
**Priority:** High

---

## Feature: Messaging Access Control

**Description:**
The system prevents messaging between users who do not have an accepted contact relationship.

**Acceptance Criteria:**

* Backend verifies the contact relationship before accepting a message.
* Users without an accepted relationship cannot send messages.
* Frontend does not present the normal message-sending experience when messaging is not allowed.
* An appropriate action to send a contact request is presented where applicable.
* Backend enforcement remains authoritative even if frontend restrictions are bypassed.

**Phase:** 3
**Priority:** Critical

---

# Phase 4 — Media, Internationalization, Security, Performance, and Deployment

## Feature: Image Messages

**Description:**
Users can send images in conversations.

**Acceptance Criteria:**

* User can select an image.
* Supported image formats are validated.
* Maximum image size is enforced.
* Image is uploaded through the approved media infrastructure.
* Stored media reference is associated with the message.
* Image is rendered in the conversation.
* Upload progress/loading state is handled.
* Upload failures provide appropriate feedback.

**Phase:** 4
**Priority:** High

---

## Feature: Video Messages

**Description:**
Users can send videos in conversations.

**Acceptance Criteria:**

* User can select a video.
* Supported video formats are validated.
* Maximum video size is enforced.
* Video is uploaded through the approved media infrastructure.
* Stored media reference is associated with the message.
* Video can be played in the conversation.
* Upload failures provide appropriate feedback.

**Phase:** 4
**Priority:** High

---

## Feature: Internationalization

**Description:**
The application supports Persian and English.

**Acceptance Criteria:**

* Persian (`fa-IR`) is supported.
* English (`en-US`) is supported.
* UI text is translatable.
* Language switching is supported.
* Persian layout supports RTL correctly.
* Dates and numbers follow the selected language where applicable.
* Translation terminology remains consistent.

**Phase:** 4
**Priority:** High

---

## Feature: Rate Limiting

**Description:**
The backend applies rate limits to reduce abuse and protect sensitive operations.

**Acceptance Criteria:**

* Authentication endpoints have appropriate rate limits.
* Sensitive endpoints have appropriate rate limits.
* Message sending has an appropriate rate limit.
* Search has an appropriate rate limit.
* Media upload has an appropriate rate limit.
* Rate-limit violations return HTTP `429`.
* Users receive an appropriate error response.

Exact limits are defined in the technical configuration and must not be invented during implementation.

**Phase:** 4
**Priority:** High

---

## Feature: User Presence

**Description:**
The application can display whether a contact is currently online and provide last-seen information.

**Acceptance Criteria:**

* Online state is derived from the real-time connection state.
* Offline state is detected when the user disconnects.
* Last-seen information is recorded where applicable.
* Presence information is displayed in approved contact/conversation interfaces.

**Phase:** 4
**Priority:** Medium

---

## Feature: Message Timestamps

**Description:**
Messages display timestamps appropriate for the user's locale and timezone.

**Acceptance Criteria:**

* Each message displays a timestamp.
* Today and older dates use appropriate display formats.
* Full timestamp information is available where appropriate.
* User timezone is respected.
* Formatting follows the active language.

**Phase:** 4
**Priority:** Medium

---

## Feature: Structured Logging

**Description:**
The backend provides structured application logging for operational and debugging purposes.

**Acceptance Criteria:**

* Backend logging is centralized.
* Important application errors are logged.
* Logs include useful contextual information.
* Sensitive information is not logged.
* Logging follows the project's security rules.

**Phase:** 4
**Priority:** High

---

## Feature: Error Handling and Monitoring Foundation

**Description:**
The application provides consistent error handling across frontend and backend.

**Acceptance Criteria:**

* Backend errors are handled consistently.
* Frontend errors are handled consistently.
* Unexpected errors do not expose sensitive implementation details.
* Appropriate user-facing feedback is provided.
* Errors contain sufficient context for debugging.
* Global error boundaries/handlers are used where appropriate.

**Phase:** 4
**Priority:** High

---

## Feature: Database Performance Optimization

**Description:**
Database access is reviewed and optimized for the expected application workload.

**Acceptance Criteria:**

* Frequently queried fields are reviewed for appropriate indexing.
* N+1 query problems are identified and resolved where applicable.
* Slow queries are investigated.
* Query plans are reviewed where necessary.
* Performance changes are verified rather than assumed.

**Phase:** 4
**Priority:** High

---

## Feature: Frontend Performance Optimization

**Description:**
The frontend is optimized for reasonable loading and runtime performance.

**Acceptance Criteria:**

* Routes and heavy components are loaded appropriately.
* Images are optimized.
* Unnecessary JavaScript is minimized.
* Bundle size is reviewed.
* Core Web Vitals are reviewed.
* Performance changes are measured.

Specific performance targets must be defined before implementation rather than assumed by Claude.

**Phase:** 4
**Priority:** High

---

## Feature: Deployment Preparation

**Description:**
Prepare the application for deployment without introducing infrastructure outside the approved project scope.

**Acceptance Criteria:**

* Production configuration is documented.
* Environment variables required for production are documented.
* Frontend production build succeeds.
* Backend production build succeeds.
* Database configuration is documented.
* Deployment prerequisites are documented.
* Production security configuration is reviewed.

**Phase:** 4
**Priority:** High

---

# Explicitly Out of Scope

The following features are not part of the current roadmap:

* Group chats
* Channels
* Message editing
* Message deletion
* Read receipts
* Unread message counts
* Typing indicators
* Voice calls
* Video calls
* Password reset
* OAuth or social login
* Blocking
* Muting
* Message reactions
* Rich text formatting
* Message search
* Message pinning
* Arbitrary file sharing
* End-to-end message encryption
* Payments
* Subscription functionality
* Social media integrations
* Admin panel
* Moderation system
* Distributed Redis caching
* Message brokers
* WebSocket clustering
* Other distributed scaling infrastructure
* Spanish localization

These features may only be introduced after explicit approval and after being formally added to this document.

---

# Feature Governance

## Source of Truth

`features.md` is the authoritative source for product feature scope.

If a feature is not listed here, Claude must not implement it.

If another context file conflicts with this document regarding whether a product feature exists, Claude must stop and request clarification rather than making an assumption.

---

## Implementation Boundary

This document defines **what the product must do**.

It does not define every implementation detail.

Implementation decisions must follow:

* `architecture.md` for system architecture and boundaries
* `stack.md` for technologies and dependencies
* `rules.md` for coding and engineering rules
* `current-task.md` for the currently authorized implementation work

---

## Dependencies

A feature may depend on another feature from an earlier phase.

Dependencies must be explicitly identified when they affect implementation order.

Claude must not bypass a required dependency simply to complete a feature.

---

## Change Control

Adding, removing, or materially changing a feature requires explicit approval from Mohammad Mehdi.

Claude must not:

* invent new features,
* silently expand feature scope,
* move a feature between phases without approval,
* change acceptance criteria without approval,
* implement out-of-scope features,
* interpret optional features as approved features.

The absence of an explicit prohibition does not constitute permission to implement a feature.
