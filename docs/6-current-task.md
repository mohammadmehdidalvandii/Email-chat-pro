# Current Task

## Purpose

This file defines the **exact work currently authorized** for Claude Code.

`current-task.md` is the execution boundary for the current development step.

Claude Code MUST NOT implement work outside the scope explicitly defined in this file.

When the task is completed and verified, the completed work MUST be recorded in `done.md`, and this file MUST be updated or replaced with the next approved task.

---

# Current Phase

## Phase 1 — Authentication and User Profile

The current task is **Task 1.5 — Account Deletion**.

Tasks 1.1 (Registration), 1.2 (Email Verification), 1.3 (Login and Logout), and 1.4 (User Profile) are completed and verified (`docs/7-done.md`).

---

# Current Objective

Implement account deletion so authenticated users can permanently delete their account. Deletion must anonymize user identity while preserving historical message data for the benefit of other participants.

Account deletion is a critical security action: the deleted account must not be able to authenticate again, existing sessions must become invalid, and the user's profile data must be cleared — but messages must remain intact with a "Deleted User" attribution.

---

# Authorized Scope

Claude Code is authorized to work only on the following areas.

## 1. Account Deletion Endpoint

* Implement `DELETE /users/me` per `architecture.md` §API Endpoints:

  ```text
  DELETE /users/me
    Authentication: Required (JWT)
    Request:
      {
        "password": "current_password"
      }
    Response: 200
      {
        "success": true,
        "data": { "message": "Account deleted" }
      }
  ```

* The endpoint MUST require a valid JWT (`JwtAuthGuard`).
* The endpoint MUST require the user's current password for confirmation (`features.md` — "Deletion requires explicit confirmation").
* The password MUST be verified against the stored `password_hash` before deletion proceeds.
* Invalid password MUST return a `401 UNAUTHORIZED` error.

## 2. Deletion Behavior (Anonymization)

Per `architecture.md` §Account Deletion (Anonymization), when a user deletes their account:

1. Set `deleted_at = NOW()`.
2. Set `is_active = FALSE`.
3. Rename `username` to `deleted#{original_id}` (e.g., `deleted#550e8400-e29b-41d4-a716-446655440000`).
4. Clear `full_name`, `bio`, `avatar_url` (set to NULL).
5. Clear `password_hash` (prevents login).
6. Do NOT delete the `users` row — it must remain for foreign-key integrity with messages.
7. Do NOT delete any messages — historical messages are preserved.

This is an **anonymization**, not a hard delete. The row stays for referential integrity; the user identity is removed; messages remain with their original `sender_id`.

## 3. Session Invalidation

* After deletion, the user's existing JWT tokens must not be accepted by protected endpoints.
* The `GET /auth/session` endpoint (and all `JwtAuthGuard`-protected endpoints) MUST reject deleted users (`deletedAt !== null` OR `isActive === false`) with a `401 UNAUTHORIZED` response.
* The login endpoint (`POST /auth/login`) already rejects deleted/inactive accounts (Task 1.3). Verify this still works after deletion.

## 4. Deleted User Display

* In the shared `User` type and API responses, a deleted user should be distinguishable from an active user. The `isActive: false` and `deletedAt` fields communicate this state.
* The `toUserDto()` mapper must handle deleted users correctly (the existing mapper already maps `isActive` and does not include `deletedAt` in the shared contract — this behavior is correct and should be preserved).

## 5. Username Uniqueness After Deletion

* The `deleted#{uuid}` format ensures the old username is freed while the anonymized handle cannot collide with any valid username (which must match `^[a-zA-Z0-9_-]+$` and cannot contain `#`).
* The `LOWER()` unique index handles the `deleted#` prefix case-insensitively, which is fine since no valid username starts with `deleted#`.

## 6. Shared Packages

* Add shared account deletion types to `packages/types` where applicable.
* Add shared account deletion error messages to `packages/constants` where applicable.
* Do not move backend logic into `packages/utils`.

## 7. Tests

* Add tests for:
  * successful account deletion (valid password → 200, DB state confirmed),
  * deletion with wrong password → 401,
  * deletion without authentication → 401,
  * post-deletion login attempt → 401,
  * post-deletion session check → 401,
  * DB state after deletion: `deleted_at` set, `is_active` false, `password_hash` cleared, `username` anonymized, profile fields cleared, messages preserved.
* Preserve all existing Task 1.1–1.4 tests.

## 8. UserController Route Registration

* The `DELETE /users/me` route is added to `UsersController` (the existing users controller already handles `GET /users/me` and `PATCH /users/me` from Task 1.4).
* The route is protected by `@UseGuards(JwtAuthGuard)`.
* The endpoint requires the `DeleteAccountDto` body with password confirmation.

---

# Explicitly NOT Authorized

The following work MUST NOT be implemented during this task.

## Email Change

* Do NOT implement email change (`POST /users/me/change-email`). This belongs to a separate authorized task.

## Password Reset

* Do NOT implement password reset. Out of scope for Phase 1.

## Hard Delete

* Do NOT permanently delete the `users` row. The deletion is an anonymization/soft-delete per `architecture.md`. Messages reference `sender_id` via foreign key.

## Message Deletion

* Do NOT delete or modify any messages during account deletion. Historical messages are preserved.

## Frontend

* Do NOT implement frontend account deletion UI. This task is **backend-only** (consistent with Task 1.3 and Task 1.4).

## Phase 2/3/4 Features

* Do NOT implement contact requests, chats, messages, search, media, permission enforcement for messaging, or internationalization.

## Infrastructure and Dependencies

* Do NOT introduce Redis, Kafka, RabbitMQ, NATS, Kubernetes, or any unapproved infrastructure.
* Do NOT add new dependencies. Account deletion uses only existing dependencies.

---

# Implementation References

## Approved Context

The implementation MUST remain consistent with:

```text
1-overview-project.md    — soft-delete preserves message history
2-features.md            — Account Deletion acceptance criteria
3-architecture.md        — Account Deletion (Anonymization) procedure, User data model,
                           DELETE /users/me endpoint
4-stack.md               — no new dependencies for account deletion
5-rules.md               — coding, TypeScript, error handling, security, testing, Git rules
7-done.md                — Task 1.1 through Task 1.4 records
```

## Existing Code to Reuse

```text
apps/backend/src/modules/auth/auth.service.ts         — toUserDto(), login (already rejects deleted users)
apps/backend/src/modules/auth/entities/user.entity.ts  — User entity with deletedAt, isActive columns
apps/backend/src/modules/auth/guards/jwt.guard.ts     — JwtAuthGuard for route protection
apps/backend/src/modules/users/users.controller.ts    — GET/PATCH /users/me already exist
apps/backend/src/modules/users/users.service.ts       — updateProfile() pattern to follow
packages/types/src/user.types.ts                      — User, ProfileResponse types
packages/constants/src/error.constants.ts             — ERROR_CODES, ERROR_MESSAGES
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

* `DELETE /users/me` accepts a password confirmation and performs anonymization,
* wrong password returns `401 UNAUTHORIZED`,
* no authentication returns `401`,
* after deletion: login fails, session fails, username is anonymized (`deleted#uuid`),
* profile fields are cleared, `password_hash` is cleared, `deleted_at` is set, `is_active` is false,
* historical messages are preserved (no messages deleted or modified),
* shared types/constants are used where applicable,
* tests cover deletion success, wrong password, no auth, post-deletion login, post-deletion session, DB state,
* type-check, lint, tests, format-check pass,
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

> Implement account deletion, verify it, record it, report it, and stop.

Do not implement future features simply because the architecture anticipates them.

Do not start the next task.