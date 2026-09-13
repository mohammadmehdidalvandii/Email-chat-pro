# Current Task

## Purpose

This file defines the **exact work currently authorized** for Claude Code.

`current-task.md` is the execution boundary for the current development step.

Claude Code MUST NOT implement work outside the scope explicitly defined in this file.

When the task is completed and verified, the completed work MUST be recorded in `done.md`, and this file MUST be updated or replaced with the next approved task.

---

# Current Phase

## Phase 3 — Contacts and Search

**Task 3.1 — User Search** is the currently authorized task.

The prior Phase 2 execution boundary (Task 2.4 — Conversation List) is completed and verified (`docs/7-done.md`).

The Task 2.5 — Chat Creation working title from the previous placeholder is **removed**. There is no approved Task 2.5 in the project roadmap, and chat creation is NOT authorized here.

---

# Authorized Scope

## Task 3.1 — User Search

Implement the **User Search** feature as defined in:

- `features.md` — Phase 3, Feature: User Search
- `architecture.md` — §API Endpoints, User Endpoints (`GET /users/search`)

### Must Implement

- `GET /users/search` endpoint:
  - Authentication: Required (`JwtAuthGuard`).
  - Query params:
    - `q`: the search query (username or email).
    - `limit`: default `10`, max `50`.
  - Response: `200` with the shared `ApiResponse` envelope containing an array of matching user objects.
- Username search with **partial matching**.
- Email search with **exact matching**.
- Only eligible, active users are returned.
- Deleted / inactive users are excluded from results.
- Result count is limited to the defined limit rules (default 10, max 50).

### Shared Contracts

- Search request/response types belong in `packages/types` — the single source of truth for shared API contracts.
- Use shared validation constants from `packages/constants` where they apply.
- Do not duplicate the search API contract independently in frontend or backend.

### Scope Anchor (`features.md` — User Search acceptance criteria)

- Search by username is supported.
- Search by email is supported.
- Username search supports appropriate partial matching.
- Email search supports exact matching.
- Only eligible active users are returned.
- Deleted users are not returned.
- Search results provide the information necessary to identify a user.
- Search results are limited to a defined result count.

---

# Not Authorized

The following MUST NOT be implemented in Task 3.1:

- Contact requests (send / accept / decline) — Task 3.2.
- Contact list / contact-based messaging authorization — Task 3.3.
- Any later Phase 3 tasks.
- Chat creation (`POST /chats`) or any resolution of the chat-creation trigger.
- Frontend work of any kind (search UI, screens, components, services).
- WebSocket or presence changes.
- Rate limiting (Phase 4).
- Media, internationalization, or any other later-phase feature.

---

# Verification Requirements

Before Task 3.1 may be recorded as complete:

```text
- npm run build:packages
- npx tsc --noEmit (backend)
- npx eslint "src/**/*.ts" --max-warnings=0 (backend)
- npx jest (backend, all suites)
- npm run build (nest build)
```

Live endpoint tests (backend on port 4000, started with `PORT=4000` explicitly):

```text
1. GET /users/search (no token)            -> 401 UNAUTHORIZED
2. register active users, mark verified    -> tokens obtained (no email transport in the stack)
3. search by exact username                -> matching active user returned
4. search by partial username              -> matching active users returned
5. search by exact email                   -> matching active user returned
6. deleted user is not returned            -> excluded
7. `limit` default (10) and max (50) enforced
8. seeded verification data cleaned up
```

Do not claim a check passed unless it was actually executed successfully.

---

# Product Decision Boundary

Claude Code is not authorized to make product decisions.

If implementation requires choosing between multiple valid product or architectural approaches that are not already defined in the context documents:

**STOP → REPORT → ASK**

Do not silently choose an approach.

---

# Golden Rule

> Implement only the approved task, verify it, record it, report it, and stop.

Do not start the next task until it is completed, verified, recorded, and the next task is approved.