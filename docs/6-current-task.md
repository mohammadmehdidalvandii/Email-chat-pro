# Current Task

## Purpose

This file defines the **exact work currently authorized** for Claude Code.

`current-task.md` is the execution boundary for the current development step.

Claude Code MUST NOT implement work outside the scope explicitly defined in this file.

When the task is completed and verified, the completed work MUST be recorded in `done.md`, and this file MUST be updated or replaced with the next approved task.

---

# Current Phase

## Phase 3 — Contacts and Search

**Task 3.2 — Contact Requests** is the currently authorized task.

The prior Phase 3 execution boundary (Task 3.1 — User Search) is completed. It is recorded in `docs/7-done.md` as **"Completed with Known Issues"** — its 8 live endpoint checks remain unexecuted because of an environment blocker (host port 5432 port conflict; see `docs/7-done.md` Known Issues). That blocker persists and is expected to block Task 3.2 live checks the same way.

---

# Authorized Scope

## Task 3.2 — Contact Requests

Implement the **Contact Requests** feature as defined in:

- `features.md` — Phase 3, Feature: Contact Request (send / persist / record creator + receiver / prevent duplicates / inform recipient / do NOT enable messaging) and Contact Request Management (view pending, accept, decline, accepted → active contact relationship, declined → no messaging, state persisted).
- `architecture.md` — §Data Model (Contact Requests), §Contact Endpoints, §Contact Request Types, §Contact Request Validation.
- The `docs/7-done.md` Task 3.2 placeholder (Send / Accept / Decline / Pending / Duplicate prevention / Self-request prevention).

### Approved Decisions (maintainer, 2026-09-13)

1. **Task 3.2 is authorized for implementation now** (this boundary replaces the Task 3.1 boundary).
2. **Chat creation on accept**: accepting a contact request creates the one-to-one chat for the participant pair **atomically** (inside the same transaction as the status update), resolving the Task 2.1 deferred chat-creation trigger for the contact-acceptance path. Chat rows are stored with normalized participants (`user_a < user_b`) and deduplicated (no duplicate chat per pair).

### Must Implement

- `POST /contacts/requests` endpoint:
  - Authentication: Required (`JwtAuthGuard`).
  - Body: `{ receiverId }` (validated as UUID).
  - Sender is the authenticated user (never from the body).
  - Response: `201` with the shared `ApiResponse` envelope containing a `ContactRequest`.
- `GET /contacts/requests/incoming` endpoint:
  - Authentication: Required.
  - Response: `200` with an array of the authenticated user's **pending** incoming `ContactRequest`s, newest first.
- `PATCH /contacts/requests/:requestId` endpoint:
  - Authentication: Required.
  - Param `requestId` validated as UUID.
  - Body: `{ status: 'accepted' | 'declined' }` (other values → 400 `VALIDATION_ERROR`).
  - Only the request's **receiver** may respond (else 403).
  - `accepted` → status updated **and** one-to-one chat created (see Approved Decision 2); `declined` → status updated, no chat.
  - Response: `200` with the updated `ContactRequest`.
- Contact request validation semantics (architecture.md §Contact Request Validation):
  - Receiver must exist and be active (deleted/inactive users → 404).
  - Sender cannot request itself → 400.
  - No duplicate requests per directed pair: an existing **pending or accepted** request → 409; an existing **declined** request → **reactivated to `pending`** on re-send (the only self-consistent reading of "Declined requests prevent future messages until new request sent" — the re-send is the new request).
  - A `23505` unique-violation race on insert → 409.
- Persistence: `contact_requests` table (migration) with `UNIQUE (sender_id, receiver_id)`, `CHECK (sender_id <> receiver_id)`, `CHECK (status IN ('pending','accepted','declined'))`, and the `idx_contacts_receiver_id` + `idx_contacts_status` indexes per architecture.md.
- Shared contracts:
  - `ContactRequestStatus`, `ContactRequest`, `CreateContactRequestInput`, `UpdateContactRequestInput` in `packages/types` — the single source of truth.
  - Shared constants in `packages/constants` where they apply (error messages, status lists).
- Messaging authorization based on an accepted contact relationship is **NOT** part of Task 3.2 (see Not Authorized).

### Scope Anchor (`architecture.md` — Contact Request Endpoints / Validation)

- Send request → the request is persisted and the recipient can see it in their pending inbox; duplicate and self-requests are prevented. (Real-time push notification of a new request via WebSocket is NOT authorized here.)
- View pending incoming requests.
- Accept → request `accepted`; the accepted contact relationship is established; the one-to-one chat is created atomically (Approved Decision 2).
- Decline → request `declined`; no chat is created; declined requests prevent messaging **until a new request is sent** (which reactivates to `pending`).
- Request state is persisted (`contact_requests` rows survive restarts).

---

# Not Authorized

The following MUST NOT be implemented in Task 3.2:

- **Contact List / GET /contacts / contact-based messaging authorization** — Task 3.3. `MessagesService` authorization must NOT be changed to require an accepted contact relationship.
- Chat creation **outside the accept path** — no explicit `POST /chats`, no implicit first-message chat creation, no resolution of any other chat-creation trigger. (Only the approved accept-path creation is authorized.)
- Any later Phase 3 tasks.
- Frontend work of any kind (contact-request UI, screens, components, services).
- WebSocket or presence changes (no notification push for incoming requests).
- Rate limiting (Phase 4).
- Media, internationalization, or any other later-phase feature.

---

# Verification Requirements

Before Task 3.2 may be recorded as complete:

```text
- npm run build:packages
- npx tsc --noEmit (backend)
- npx eslint "src/**/*.ts" --max-warnings=0 (backend)
- npx jest (backend, all suites)
- npm run build (nest build)
- npm run format:check (note: a pre-existing Task 2.2 migration file,
  1789050600000-CreateMessagesTable.ts, is known to be unformatted; it is not
  modified by this task and is out of scope)
```

Live verification (migration + backend on port 4000, started with `PORT=4000` explicitly):

```text
- npm run migration:run (contact_requests table created; constraints/indexes present)
1. POST /contacts/requests (no token)         -> 401 UNAUTHORIZED
2. register two active users, mark verified  -> tokens obtained (no email transport in the stack)
3. send request alice -> bob                 -> 201 + ContactRequest (sender=alice, receiver=bob, status=pending)
4. send request alice -> bob again           -> 409 (duplicate)
5. send request alice -> alice               -> 400 (self-request)
6. send request alice -> unknown user        -> 404 (receiver not found)
7. GET /contacts/requests/incoming as bob    -> 200, the pending request
8. GET /contacts/requests/incoming as alice  -> 200, empty (only pending incoming)
9. PATCH accept as bob                       -> 200 accepted AND a chat row exists for the (normalized) pair
10. PATCH the same request again             -> 409 (already responded)
11. PATCH decline (second request) as bob    -> 200 declined, no chat created
12. re-send alice -> bob after decline       -> 201, reactivated to pending
13. seeded verification data cleaned up
```

The Task 3.1 environment blocker (host port 5432 held by the Windows PostgreSQL service, proposed Docker container unreachable at 172.20.0.2, no admin to stop the service) is expected to block steps above. **If any live check cannot be executed, it MUST NOT be claimed passed**; record it as a known issue exactly as Task 3.1 did.

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