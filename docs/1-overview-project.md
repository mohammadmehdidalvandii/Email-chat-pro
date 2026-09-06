# Email-Chat-Pro — Project Overview

## Project Identity

**Project Name:** Email-Chat-Pro

**Project Type:** Full-stack real-time 1-on-1 messaging platform

**Primary Goal:** Build a production-oriented real-time messaging application with a clear layered architecture, shared API contracts, persistent data, and a controlled phase-based development process.

---

## One-liner

A real-time 1-on-1 messenger where users create accounts with email, verify their email address, complete their profile, search for other users by username or email, send contact requests, and exchange messages after the request is accepted.

---

## Goals

1. Build a full-stack real-time messaging platform with a clear separation between frontend, backend, database, and shared packages.

2. Implement a complete account lifecycle including email-based registration, mandatory email verification, profile setup and editing, email changes, secure logout, and permanent account deletion with data preservation.

3. Enable real-time messaging where messages are delivered instantly to both users, persist across server restarts, and remain available as conversation history.

4. Enforce a contact request system so users cannot start conversations with other users without an accepted contact request.

5. Maintain consistent API contracts and shared types between the frontend and backend.

6. Build the project incrementally through controlled development phases, with testing, review, and explicit approval before moving to the next phase.

---

## User Stories

* As a new user, I can create an account with my email and password. The system sends a verification email, and I must verify my email before accessing application features.

* As a verified user, I can complete my profile by choosing a unique username, entering my full name, adding a bio, and uploading a profile picture.

* As a user, I can search for other users by username or email address.

* As a user, I can send a contact request to another user.

* As a recipient, I can view incoming contact requests and accept or decline them.

* As a user, I can start messaging another user only after the contact request has been accepted.

* As a user, I can send text messages, images, and videos in conversations.

* As a user, I can see my active conversations and open a conversation to view its message history.

* As a user, I can access my complete message history when returning to the application.

* As a user, I can edit my username, name, bio, and profile picture.

* As a user, I can change my email address and must verify the new email address.

* As a user, I can log out and later log back in without losing my conversations or messages.

* As a user, I can delete my account. My account becomes unusable, my profile is no longer active, and existing messages remain available to other participants as belonging to "Deleted User".

---

## Non-goals

The following features are explicitly out of scope unless they are later added to `features.md`:

* Group chats or channels
* Message editing
* Message deletion
* Read receipts
* Unread message counts
* Typing indicators
* Email notifications
* Password reset emails
* OAuth or social login
* Arbitrary file uploads outside profile pictures and conversation media
* Blocking or muting users
* Message reactions
* Rich text formatting
* Voice calls
* Video calls
* Redis
* Message brokers
* WebSocket clustering
* Other horizontal scaling infrastructure

If a feature is not explicitly defined in `features.md`, Claude must not implement it.

---

## High-Level Architecture

Email-Chat-Pro follows a layered full-stack architecture:

```text
                    ┌─────────────────────┐
                    │       Client        │
                    │ Next.js / React / TS│
                    └──────────┬──────────┘
                               │
                    REST API + Socket.IO
                               │
                               ▼
                    ┌─────────────────────┐
                    │       Backend       │
                    │ NestJS / Node / TS  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     PostgreSQL      │
                    │      + TypeORM      │
                    └─────────────────────┘

              ┌─────────────────────────────────┐
              │        Shared Packages          │
              │ types / constants / utils       │
              └─────────────────────────────────┘
```

### Frontend

The frontend is responsible for:

* User interface and navigation
* Authentication screens
* Profile management
* Search and contact management
* Conversation and message UI
* Client-side server-state management
* Client-side UI state
* REST API communication
* Real-time Socket.IO communication
* Form validation
* Internationalized user interface

### Backend

The backend is responsible for:

* Authentication and authorization
* User and profile management
* Contact request management
* Chat and message management
* Real-time communication
* File/media handling
* Database access
* API validation
* Security
* Logging
* Error handling

### Database

PostgreSQL is the persistent source of application data.

All important user, contact, chat, and message data must survive application restarts.

### Shared Packages

The monorepo contains shared packages:

* `packages/types` — shared API contracts and TypeScript types
* `packages/constants` — shared error messages, validation rules, status codes, and API constants
* `packages/utils` — shared validators, formatters, and reusable utilities

`packages/types` is the Single Source of Truth for shared frontend/backend API contracts.

---

## Infrastructure

The project uses:

* npm workspaces for the monorepo
* Docker Compose for local PostgreSQL development
* Environment-based configuration
* PostgreSQL on port `5432`
* Frontend on port `3000`
* Backend on port `4000`

Exact implementation and configuration details are defined in `stack.md`, `architecture.md`, and `current-task.md`.

---

## Definition of Done

The complete project is considered functionally complete when:

* Two users can create accounts.
* Users must verify their email addresses.
* Users can complete and edit their profiles.
* Users can search for other users.
* Users can send, accept, and decline contact requests.
* Users cannot message another user without an accepted contact relationship.
* Accepted contacts can exchange messages in real time.
* Messages are persisted in PostgreSQL.
* Messages survive backend restarts.
* Existing messages remain available after an account is deleted.
* Deleted users cannot authenticate again.
* Deleted users are represented as "Deleted User" where required.
* Frontend and backend type-check successfully.
* API endpoints are documented in Swagger.
* Persian (`fa-IR`) and English (`en-US`) interfaces work correctly.
* Required tests and quality checks pass according to the current development phase.

---

## Core System Invariants

The following rules are fundamental to the system:

* Email verification is mandatory before authenticated application features are accessible.
* Contact requests are mandatory before direct messaging is allowed.
* Messages are permanently preserved once stored.
* Account deletion must not delete historical message data.
* A deleted account cannot authenticate.
* JWT authentication must become invalid after account deletion.
* One email address cannot have more than one active account.
* Contact requests and their responses must be persisted.
* Message history cannot be edited or deleted.
* Frontend and backend must use shared API contracts from `packages/types`.
* Shared error messages and validation constants must come from `packages/constants` where applicable.

---

## Development Phases

### Phase 0 — Infrastructure and Project Setup

* Set up the monorepo and workspace structure
* Configure frontend and backend applications
* Configure shared packages
* Configure Docker and PostgreSQL
* Configure environment variables
* Configure TypeScript, ESLint, and Prettier
* Establish the required project folder structure
* Establish basic documentation and development infrastructure

### Phase 1 — Authentication and User Profile

* User registration
* Email verification
* Login and JWT authentication
* Logout
* Profile setup
* Profile editing
* Email change with re-verification
* Account deletion
* Protected routes
* Authentication error handling

### Phase 2 — Real-time Messaging

* Chat and message data model
* Socket.IO server and client
* Real-time message delivery
* Message persistence
* Message history retrieval
* Chat interface
* Real-time connection handling

### Phase 3 — Contacts and Search

* User search
* Contact requests
* Accept and decline flows
* Contact list
* Chat list
* Contact request notifications
* Settings and profile management
* Enforcement of messaging restrictions

### Phase 4 — Media, Polish, and Deployment

* Image and video message support
* Cloudinary media handling
* User feedback and error handling
* Structured logging
* Rate limiting
* Internationalization completion
* Performance optimization
* Additional testing
* Deployment preparation

The detailed scope and acceptance criteria for each phase are defined in `features.md`.

---

## Team and Decision Authority

### Mohammad Mehdi

Role:

* Product Owner
* Architect
* Decision Maker
* Code Reviewer
* Final Approval Authority

Mohammad Mehdi has final authority over:

* Product scope
* Feature decisions
* Architecture changes
* Technology changes
* Data model changes
* API contract changes
* Phase completion
* Pull request approval

### Claude

Role:

* Development Assistant
* Implementation Assistant
* Technical Guidance
* Testing Assistant
* Documentation Assistant

Claude must not make autonomous product or architecture decisions.

If project context contains a conflict or an implementation requires changing an established architectural or technology decision, Claude must stop and ask Mohammad Mehdi for a decision instead of guessing.

---

## Context Rules

Project development is governed by the following context files:

1. `overview-project.md` — project goals, scope, and system invariants
2. `features.md` — features and acceptance criteria
3. `architecture.md` — system structure, boundaries, data model, and technical architecture
4. `stack.md` — technologies, dependencies, and environment configuration
5. `rules.md` — coding, testing, documentation, and Git rules
6. `current-task.md` — the currently authorized development phase and task
7. `done.md` — approved historical phase records

These files must be treated as project context and must not be silently rewritten or contradicted by implementation decisions.

When conflicting information is discovered, Claude must identify the conflict and request clarification from Mohammad Mehdi rather than choosing a value based on assumption.

---

## Scope Control

Development must remain within the explicitly defined project scope.

Claude must not:

* Invent new product features
* Introduce technologies not defined by the project
* Reorganize the architecture without approval
* Create independent applications inside `packages/*`
* Duplicate shared API contracts locally
* Skip the current development phase
* Mark a phase as approved without explicit approval
* Modify unrelated parts of the codebase without a clear task requirement

All detailed implementation decisions must follow the appropriate context file for the current task.
