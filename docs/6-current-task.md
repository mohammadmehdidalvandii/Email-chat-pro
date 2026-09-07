# Current Task

## Purpose

This file defines the **exact work currently authorized** for Claude Code.

`current-task.md` is the execution boundary for the current development step.

Claude Code MUST NOT implement work outside the scope explicitly defined in this file.

When the task is completed and verified, the completed work MUST be recorded in `done.md`, and this file MUST be updated or replaced with the next approved task.

---

# Current Phase

## Phase 1 — Authentication and User Profile

The current task is **Task 1.3 — Login and Logout**.

Tasks 1.1 (Registration) and 1.2 (Email Verification) are completed and verified (`docs/7-done.md`).

---

# Current Objective

Implement login and logout so a verified user can authenticate with their credentials, receive a JWT, and end their session.

Login is the first point where the project's **verified-account invariant** is enforced: an unverified user MUST NOT be able to authenticate successfully (`features.md` — User Login, acceptance criterion: "Unverified users cannot authenticate successfully").

Protected routes, JWT guards, and the "me" endpoints are the foundation for profile (Task 1.4) and messaging phases.

---

# Authorized Scope

Claude Code is authorized to work only on the following areas.

## 1. Login

* Implement `POST /auth/login` per `architecture.md` §API Endpoints:

  ```text
  POST /auth/login
    Request: { "email": "user@example.com", "password": "SecurePass123!" }
    Response: 200
      {
        "success": true,
        "data": {
          "user": { ... User object ... },
          "token": "jwt_token"
        }
      }
    Sets: httpOnly cookie with JWT token
  ```

* Validate credentials securely with bcryptjs against the stored `password_hash`.
* An **unverified account MUST NOT authenticate successfully** (`features.md` — User Login). The endpoint MUST return a `401` authentication error for unverified users.
* Invalid credentials MUST return a generic `401 UNAUTHORIZED` without revealing which part (email or password) was wrong.
* The login response MUST use the standardized `ApiResponse<T>` envelope and shared error architecture.

## 2. JWT-Based Authentication

* Use **Passport-JWT** (approved decision, 2026-09-07). This adds `@nestjs/passport`, `passport`, and `passport-jwt` to the backend.
* Implement the backend layout per `architecture.md`:

  ```text
  strategies/jwt.strategy.ts
  guards/jwt.guard.ts
  ```

* The JWT secret and expiration MUST come from environment configuration (never hard-coded, never committed).
* JWT expiration is a shared constant in `packages/constants` where appropriate.
* No refresh-token flow. `POST /auth/refresh-token` is **deferred** (approved decision, 2026-09-07) and MUST NOT be implemented in this task.

## 3. Authentication State

* The JWT guard protects a minimal authenticated endpoint that proves the authentication state works (e.g. the login response returns `{ user, token }` per the architecture contract).
* `@nestjs/jwt` (or equivalent approved JWT dependency) provides signing/verification. The guard validates the `Authorization: Bearer <token>` header.
* Do NOT implement user profile endpoints, `/users/me`, or profile data. Those belong to Task 1.4.

## 4. Logout

* Implement `POST /auth/logout` per `architecture.md` §API Endpoints:

  ```text
  POST /auth/logout
    Response: 200
      {
        "success": true,
        "data": { "message": "Logged out" }
      }
  ```

* Logout clears the authentication session (clears the httpOnly JWT cookie / invalidates the token on the client).
* Logout does NOT delete user data or conversations.

## 5. Access Restrictions for Unverified Accounts

* Enforce that unverified users cannot authenticate (see Login).
* JWT-registered protected routes enforce verified-account access where the current task defines a protected endpoint. No broader profile/route guard scope is added here.

## 6. Shared Packages

* Add shared login/logout request and response types to `packages/types` (single source of truth for the frontend/backend contract defined by the architecture).
* Add shared auth constants (e.g. JWT expiration, login error messages/codes) to `packages/constants` where they genuinely need to be shared.
* Do not move backend logic into `packages/utils`.

## 7. Environment Configuration

* The JWT secret and expiration are read from environment variables at runtime.
* `.env.example` receives only placeholders. Real secrets remain in the untracked `apps/backend/.env`.
* Document any new environment variables in the appropriate context file as a factual record.

## 8. Tests

* Add tests for:
  * login success (valid credentials, verified user → 200, user + token returned),
  * login with invalid credentials → 401,
  * login by an unverified user → 401,
  * logout success (→ 200, session cleared).
* Preserve all existing Task 1.1 and Task 1.2 tests.

---

# Explicitly NOT Authorized

The following work MUST NOT be implemented during this task.

## Refresh Tokens

* Do NOT implement `POST /auth/refresh-token`. Deferred (approved decision, 2026-09-07).

## User Profile

* Do NOT implement username, full name, bio, profile completion, `/users/me`, or profile endpoints. These belong to Task 1.4.

## Frontend

* Do NOT implement frontend login/logout UI, auth stores, protected pages, or frontend redirects. The frontend has no auth infrastructure installed; this task is **backend-only** (approved decision, 2026-09-07).

## Email Transport / Resend Verification

* Do NOT implement email sending or a resend-verification endpoint.

## Accounts

* Do NOT implement email change, account deletion, or password reset.

## Phase 2/3/4 Features

* Do NOT implement contact requests, chats, messages, search, media, permission enforcement for messaging, or internationalization.

## Infrastructure and Dependencies

* Do NOT introduce Redis, Kafka, RabbitMQ, NATS, Kubernetes, or any unapproved infrastructure.
* Do NOT add dependencies beyond the approved Passport-JWT set (`@nestjs/passport`, `passport`, `passport-jwt` and their required type packages).

---

# Implementation References

## Approved Context

The implementation MUST remain consistent with:

```text
1-overview-project.md    — verified account required for authenticated access
2-features.md            — User Login / User Logout acceptance criteria
3-architecture.md        — data model, POST /auth/login + /auth/logout, JWT strategy/guard layout,
                           httpOnly cookie, error handling, shared types
4-stack.md               — JWT + bcryptjs approved; new deps only via approved decisions
5-rules.md               — coding, TypeScript, error handling, security, testing, Git rules
7-done.md                — Task 1.1 and Task 1.2 records and Task 1.3 scope
```

## Task 1.1 / 1.2 Base

Reuse the existing registration/auth implementation:

```text
apps/backend/src/modules/auth/auth.controller.ts
apps/backend/src/modules/auth/auth.service.ts
apps/backend/src/modules/auth/auth.module.ts
apps/backend/src/modules/auth/dto/register.dto.ts
apps/backend/src/modules/auth/dto/verify-email.dto.ts
apps/backend/src/modules/auth/entities/user.entity.ts
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

* `POST /auth/login` validates credentials and returns `{ user, token }` + sets an httpOnly cookie,
* unverified users and invalid credentials are rejected with `401 UNAUTHORIZED`,
* `POST /auth/logout` successfully clears the session,
* a Passport-JWT strategy + guard protect at least the auth-state endpoint,
* shared types/constants are used where applicable,
* tests cover the login success and failure cases (invalid credentials, unverified user), and logout,
* type-check, lint, tests, format-check pass,
* the endpoint is verified against a live backend,
* no unauthorized features were implemented,
* no unapproved infrastructure or dependencies were introduced (beyond the approved Passport-JWT set),
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

> Implement login and logout, verify them, record them, report them, and stop.

Do not implement future features simply because the architecture anticipates them.

Do not start Task 1.4.