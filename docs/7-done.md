# Done

## Purpose

This file records work that has been **completed, verified, and approved**.

It is the project's lightweight implementation history.

Claude Code MUST NOT mark a task as completed unless the task has actually been implemented and the available verification steps have been performed.

---

# Completion Rules

A task may be recorded here only when:

* The authorized scope was implemented.
* The implementation is consistent with the project context.
* Available validation commands were executed.
* Known failures were reported.
* No unauthorized features were implemented.
* No unapproved technologies or infrastructure were introduced.

If verification is incomplete, the task MUST NOT be described as fully completed.

---

# Status Definitions

Use the following statuses:

### Completed

The task was implemented and the relevant verification checks passed.

### Completed with Known Issues

The authorized task was implemented, but one or more known non-blocking issues remain.

The issues MUST be explicitly documented.

### Blocked

The task could not be completed because of a blocking problem.

The reason MUST be documented.

### Cancelled

The task was intentionally stopped or removed from the development plan.

The reason MUST be documented.

---

# Task History

## Phase 0 — Infrastructure and Project Setup

### Task 0.1 — Repository and Monorepo Foundation

**Status:** Pending

**Scope:**

* Inspect existing repository.
* Establish or verify npm Workspaces.
* Establish or verify:

  * `apps/frontend`
  * `apps/backend`
  * `packages/types`
  * `packages/constants`
  * `packages/utils`
* Establish or verify frontend foundation.
* Establish or verify backend foundation.
* Establish or verify shared packages.
* Establish or verify PostgreSQL Docker environment.
* Establish or verify environment configuration structure.
* Establish or verify intended development ports.
* Establish or verify `/api/v1` API foundation.
* Establish or verify TypeScript configuration.
* Establish or verify development scripts.

**Verification:**

* Dependencies:

  * Pending
* TypeScript:

  * Pending
* Lint:

  * Pending
* Tests:

  * Pending
* Build:

  * Pending
* Docker/PostgreSQL:

  * Pending

**Files Changed:**

```text
Pending
```

**Notes:**

```text
This task must be completed according to current-task.md.
```

---

# Phase 1 — Authentication and User Profile

## Task 1.1 — Registration

**Status:** Not Started

**Scope:**

* User registration
* Email validation
* Password validation
* Password hashing
* User creation
* Registration error handling

**Verification:**

```text
Not Started
```

**Files Changed:**

```text
Not Started
```

---

## Task 1.2 — Email Verification

**Status:** Not Started

**Scope:**

* Email verification flow
* Verification state
* Verification validation
* Access restrictions for unverified accounts

**Verification:**

```text
Not Started
```

**Files Changed:**

```text
Not Started
```

---

## Task 1.3 — Login and Logout

**Status:** Not Started

**Scope:**

* Login
* JWT-based authentication
* Authentication state
* Logout
* Authentication error handling

**Verification:**

```text
Not Started
```

**Files Changed:**

```text
Not Started
```

---

## Task 1.4 — User Profile

**Status:** Not Started

**Scope:**

* Profile setup
* Profile retrieval
* Profile editing
* Username
* Full name
* Bio
* Profile state

**Verification:**

```text
Not Started
```

**Files Changed:**

```text
Not Started
```

---

## Task 1.5 — Account Deletion

**Status:** Not Started

**Scope:**

* Account deletion behavior
* Authentication prevention after deletion
* Preservation of message history
* Referential integrity

**Verification:**

```text
Not Started
```

**Files Changed:**

```text
Not Started
```

---

# Phase 2 — Real-time Messaging

## Task 2.1 — Chat Foundation

**Status:** Not Started

**Scope:**

* One-to-one chat model
* Chat persistence
* Two participants per chat
* Unique participant pair

**Verification:**

```text
Not Started
```

---

## Task 2.2 — Message Persistence

**Status:** Not Started

**Scope:**

* Text messages
* Message persistence
* Message ownership
* Message history

**Verification:**

```text
Not Started
```

---

## Task 2.3 — Real-time Messaging

**Status:** Not Started

**Scope:**

* Socket.IO connection
* Authorized chat rooms
* Real-time message delivery
* Shared WebSocket event contracts

**Verification:**

```text
Not Started
```

---

## Task 2.4 — Conversation List

**Status:** Not Started

**Scope:**

* Conversation retrieval
* Conversation ordering
* Basic conversation information

**Verification:**

```text
Not Started
```

---

# Phase 3 — Contacts and Search

## Task 3.1 — User Search

**Status:** Not Started

**Scope:**

* Search users
* Username search
* Email search
* Search result contracts

**Verification:**

```text
Not Started
```

---

## Task 3.2 — Contact Requests

**Status:** Not Started

**Scope:**

* Send contact request
* Accept request
* Decline request
* Pending requests
* Duplicate request prevention
* Self-request prevention

**Verification:**

```text
Not Started
```

---

## Task 3.3 — Contact List

**Status:** Not Started

**Scope:**

* Accepted contacts
* Contact retrieval
* Contact-based messaging authorization

**Verification:**

```text
Not Started
```

---

# Phase 4 — Media, Polish, and Deployment

## Task 4.1 — Image Messages

**Status:** Not Started

**Scope:**

* Image message support
* Cloudinary integration
* Image validation
* Image message contracts

**Verification:**

```text
Not Started
```

---

## Task 4.2 — Video Messages

**Status:** Not Started

**Scope:**

* Video message support
* Cloudinary integration
* Video validation
* Video message contracts

**Verification:**

```text
Not Started
```

---

## Task 4.3 — Internationalization

**Status:** Not Started

**Scope:**

* Persian
* English
* i18next integration
* RTL/LTR handling

**Verification:**

```text
Not Started
```

---

## Task 4.4 — Presence

**Status:** Not Started

**Scope:**

* User presence
* Last seen
* Online/offline state

**Verification:**

```text
Not Started
```

---

## Task 4.5 — Rate Limiting and Security Hardening

**Status:** Not Started

**Scope:**

* Rate limiting
* Security configuration
* Request protection
* Relevant validation

**Verification:**

```text
Not Started
```

---

## Task 4.6 — Structured Logging and Error Monitoring Foundation

**Status:** Not Started

**Scope:**

* Winston structured logging
* Backend error logging
* Safe error information
* Monitoring foundation

**Verification:**

```text
Not Started
```

---

## Task 4.7 — Performance Optimization

**Status:** Not Started

**Scope:**

* Database performance
* Query optimization
* Frontend performance
* Measured performance improvements

**Verification:**

```text
Not Started
```

---

## Task 4.8 — Deployment Preparation

**Status:** Not Started

**Scope:**

* Production configuration
* Deployment preparation
* Environment configuration
* Production build verification

**Verification:**

```text
Not Started
```

---

# Out-of-Scope Work

The following items MUST NOT be added to this file as completed work unless the product scope is explicitly changed:

* Group chats
* Channels
* Message editing
* Message deletion
* Read receipts
* Unread counters
* Typing indicators
* Voice calls
* Video calls
* Password reset
* OAuth
* Blocking
* Muting
* Reactions
* Rich text messaging
* Arbitrary file sharing
* End-to-end encryption
* Payments
* Subscriptions
* Social integrations
* Admin/moderation system
* Distributed Redis
* Message brokers
* WebSocket clustering
* Kubernetes
* Spanish localization

---

# Verification Record

For each completed task, record the actual verification performed.

Example:

```text
Task: 0.1
Date: YYYY-MM-DD

Checks:
- npm install: PASS
- TypeScript: PASS
- ESLint: PASS
- Tests: PASS
- Build: PASS
- Docker Compose: PASS

Unauthorized scope changes:
- None
```

Do not claim a check passed unless it was actually executed successfully.

---

# Known Issues

Document known issues that remain after a task.

Each issue should contain:

```text
Issue:
Impact:
Discovered During:
Current Status:
Next Action:
```

Do not hide known failures.

Do not silently remove or rewrite an issue simply because it is inconvenient.

---

# Architecture Changes

If an approved architecture change occurs, record:

```text
Change:
Reason:
Approved By:
Affected Files:
Affected Documentation:
Verification:
```

Architecture changes MUST NOT be recorded as normal implementation changes.

---

# Context Changes

If any of the following files are intentionally changed:

```text
overview-project.md
features.md
architecture.md
stack.md
rules.md
current-task.md
done.md
CLAUDE.md
```

record the change when it materially affects project behavior, scope, architecture, or development rules.

Example:

```text
Context Change:
File:
Change:
Reason:
Approved By:
```

---

# Completion Discipline

When a task reaches completion:

1. Verify the implementation.
2. Review the changed files.
3. Confirm the task stayed within `current-task.md`.
4. Record the result here.
5. Record known issues.
6. Update the task status.
7. Update `current-task.md` for the next approved task.
8. Stop.

Claude Code MUST NOT automatically begin the next task.

---

# Golden Rule

> `done.md` records what was actually completed, not what was intended to be completed.

Never mark work as done based on assumptions.

Never mark a task as verified without running the relevant checks.

Never hide known issues.

Never record unauthorized work as completed.
