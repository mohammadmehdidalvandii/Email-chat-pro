# Current Task

## Purpose

This file defines the **exact work currently authorized** for Claude Code.

`current-task.md` is the execution boundary for the current development step.

Claude Code MUST NOT implement work outside the scope explicitly defined in this file.

When the task is completed and verified, the completed work MUST be recorded in `done.md`, and this file MUST be updated or replaced with the next approved task.

---

# Current Phase

## Phase 1 — Authentication and User Profile

The current task is **Task 1.2 — Email Verification**.

Task 1.1 (Registration) is completed and verified (`docs/7-done.md`).

---

# Current Objective

Implement email verification for accounts registered under Task 1.1.

The goal is to verify that a registered email address belongs to the user who registered it, and to transition the account from the unverified/pending state (`is_verified = false`) to the verified state (`is_verified = true`) after successful verification.

Email verification is **mandatory before authenticated application features are accessible** (project invariant). Authentication guards and protected routes belong to Task 1.3 and are NOT part of this task.

---

# Authorized Scope

Claude Code is authorized to work only on the following areas.

## 1. Verification Token Generation

* A unique, cryptographically secure verification token MUST be generated for each new account.
* Token generation is **initiated at registration** (inside the existing `register()` flow).
* The plaintext token MUST be stored securely (a hash of the token at rest); the raw token MUST NOT be returned in API responses or written to logs.
* Token generation MUST use the approved stack (`node:crypto`) and MUST NOT introduce a new dependency.

## 2. Verification Token Expiration and Secure Handling

* Verification tokens MUST have a defined expiration period.
* The default expiration is **24 hours**, defined as a shared constant in `packages/constants` so it is easily adjustable.
* Expired tokens MUST be rejected.
* Already-used tokens MUST be rejected (the token is consumed/cleared on successful verification).
* The token, its hash, and expiry MUST never be exposed in logs, responses, or source code.

## 3. Verify-Email Endpoint

* Implement `POST /auth/verify-email` per `architecture.md` §API Endpoints:

  ```text
  POST /auth/verify-email
    Request: { "token": "verification_token" }
    Response: 200 { "message": "Email verified successfully" }
  ```

* The endpoint MUST validate the token and transition `is_verified` from `false` to `true` on success.
* The endpoint MUST return the standardized `ApiResponse<T>` envelope and use the shared error architecture.

## 4. Verification State

* Change `is_verified` from `false` to `true` only after successful verification.
* Record when verification occurred (`verified_at`).
* Clear the stored verification token and expiry after successful verification.

## 5. Access Restrictions for Unverified Accounts

* Implement access restrictions for unverified users **only where explicitly defined by the project context**.
* No protected routes, guards, or JWT exist yet (Task 1.3). Nothing in the current context defines an enforceable restriction before authentication exists, so no speculative guard infrastructure may be introduced.
* The verification state (`is_verified`) is the mechanism that future tasks will use to enforce verification-based restrictions.

## 6. Shared Packages

* Add shared types to `packages/types` where the frontend and backend share a contract (e.g., the verify-email request/response).
* Add shared constants to `packages/constants` where they genuinely need to be shared (e.g., token length, expiration, verification error code/message).
* Do not move backend logic into `packages/utils`.

## 7. Tests

* Add tests for the verification success case.
* Add tests for the failure cases: unknown/invalid token, expired token, already-used token.
* Preserve the existing Task 1.1 tests.

---

# Explicitly NOT Authorized

The following work MUST NOT be implemented during this task.

## Email Transport / Delivery

* Do NOT implement or configure an email-sending service (SMTP, mail transport library, etc.). `stack.md` defines no email transport and the project out-of-scope list excludes email notifications.
* Do NOT claim in registration responses that a verification email was sent. Task 1.1 deliberately returns `"Registration successful"`.

## Resend Verification

* Do NOT implement a "request another verification email" / resend-verification endpoint. It is an acceptance criterion of the Email Verification feature in `features.md` but is NOT authorized by this task and is deferred.

## Authentication and Authorization

* Do NOT implement login, logout, JWT, guards, or protected routes. These belong to Task 1.3.

## User Profile

* Do NOT implement profile columns, username, full name, bio, or profile completion. These belong to Task 1.4.

## Features Outside This Task

* Do NOT implement password reset, OAuth, account deletion, email change, contact requests, messaging, media, or any Phase 2/3/4 feature.
* Do NOT introduce Redis, Kafka, RabbitMQ, NATS, Kubernetes, or any unapproved infrastructure.
* Do NOT add dependencies without approval.

---

# Implementation References

## Approved Context

The implementation MUST remain consistent with:

```text
1-overview-project.md    — email verification is mandatory before authenticated access
2-features.md            — Email Verification feature acceptance criteria
3-architecture.md        — data model, POST /auth/verify-email, error handling, shared types
4-stack.md               — approved technologies only
5-rules.md               — coding, TypeScript, error handling, security, testing, Git rules
7-done.md                — Task 1.1 record and Task 1.2 scope
```

## Task 1.1 Base

Reuse the existing registration/auth implementation:

```text
apps/backend/src/modules/auth/auth.controller.ts
apps/backend/src/modules/auth/auth.service.ts
apps/backend/src/modules/auth/dto/register.dto.ts
apps/backend/src/modules/auth/entities/user.entity.ts
apps/backend/src/database/migrations/1788710400000-CreateUsersTable.ts
packages/types/src/auth.types.ts
packages/constants/src/validation.constants.ts
packages/constants/src/error.constants.ts
```

---

# Product Decision Boundary

Claude Code is not authorized to make product decisions.

If implementation requires choosing between multiple valid product or architectural approaches that are not already defined in the context documents:

**STOP → REPORT → ASK**

Do not silently choose an approach.

---

# Completion Criteria

The task is complete only when:

* a verification token is generated at registration and stored securely,
* `POST /auth/verify-email` validates the token and flips `is_verified` from `false` to `true`,
* expired and already-used tokens are rejected,
* shared types/constants are used where applicable,
* tests cover the success and failure cases,
* type-check, lint, tests, format-check, and the migration pass,
* the endpoint is verified against a live backend,
* no unauthorized features were implemented,
* no unapproved infrastructure or dependencies were introduced,
* no secrets were committed,
* the repository remains in a coherent runnable state.

---

# Verification Requirements

Run the repository's configured checks:

```text
npm run type-check
npm run lint
npm test
npm run format:check
npm run migration:run   (with DATABASE_URL exported from apps/backend/.env)
```

Then verify the endpoint against a live backend.

Do not invent commands that are not configured in the repository.

---

# Reporting Requirements

At the end of the task, Claude Code MUST report:

## 1. What changed

List the files and configuration that were created or modified.

## 2. What was verified

List the commands and checks that were successfully executed.

## 3. Problems

Report any existing errors, blocked commands, or failed checks.

Do not hide failures.

## 4. Scope Check

Explicitly confirm whether any work outside this file was performed.

The expected answer is:

```text
No unauthorized scope changes.
```

---

# Golden Rule

> Verify the email address, record it, report it, and stop.

Do not implement future features simply because the architecture anticipates them.

Do not start Task 1.3.