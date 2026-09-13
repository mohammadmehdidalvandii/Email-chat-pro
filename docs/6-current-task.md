# Current Task

## Purpose

This file defines the **exact work currently authorized** for Claude Code.

`current-task.md` is the execution boundary for the current development step.

Claude Code MUST NOT implement work outside the scope explicitly defined in this file.

When the task is completed and verified, the completed work MUST be recorded in `done.md`, and this file MUST be updated or replaced with the next approved task.

---

# Current Phase

## Phase 3 — Contacts and Search

**Task 3.3 — Contact List** is the currently authorized task.

The prior Phase 3 execution boundary (Task 3.2 — Contact Requests) is completed. It is recorded in `docs/7-done.md` as **"Completed with Known Issues"** — the `contact_requests` migration could not be applied against any reachable PostgreSQL. That environment blocker (host port 5432 held by the Windows PostgreSQL service, proposed Docker container unreachable at 172.20.0.2, no admin to stop the service) persists and is expected to block Task 3.3 live checks the same way.

---

# Authorized Scope

## Task 3.3 — Contact List & Messaging Access Control

Implement the **Contact List** feature and **contact-based messaging authorization** as defined in:

- `features.md` — Phase 3, Feature: Contact List (accepted contacts are displayed; contact name/avatar come from the User contract; selecting a contact can open the corresponding conversation) and Feature: Messaging Access Control (backend verifies the contact relationship before accepting a message; users without an accepted relationship cannot send messages; backend enforcement remains authoritative even if frontend restrictions are bypassed).
- `architecture.md` — §Contact Endpoints (`GET /contacts` → `data: [ ... User objects (contacts) ... ]`), §Data Model (Contact Requests — "Only accepted requests allow messaging").
- The `docs/7-done.md` Task 3.3 placeholder (Accepted contacts / Contact retrieval / Contact-based messaging authorization).

### Approved Decisions (carried from Task 3.2)

1. **Chat creation on accept** (Approved Decision 2, Task 3.2): the one-to-one chat is created when a contact request is accepted — so, in the approved model, a chat only exists between accepted contacts. Task 3.3's messaging gate is the authoritative backend enforcement of that rule.

### Contact relationship semantics (self-consistent reading of architecture.md)

`contact_requests` is one-directional (sender → receiver), but an **accepted** request establishes a **mutual** relationship: after receiver B accepts sender A's request, the chat exists and both participants message in it. Therefore:

- The messaging gate accepts when an accepted request exists in **either direction** for the pair (a strictly directed gate would prevent the accepter from messaging, which contradicts the accepted-chat model).
- `GET /contacts` returns the counterpart of every accepted request where the user is the sender OR the receiver (deduplicated per contact).

### Must Implement

- `GET /contacts` endpoint:
  - Authentication: Required (`JwtAuthGuard`).
  - Response: `200` with the shared `ApiResponse` envelope containing the authenticated user's accepted contacts as `User` objects (the existing shared contract; no new types).
  - Derivation: accepted `contact_requests` rows in either direction, deduplicated, sorted by username (stable list — ordering is not defined by architecture).
  - Pending / declined requests do NOT make two users contacts.
- Contact-based messaging authorization:
  - `MessagesService.sendMessage` verifies the chat's participant pair shares an accepted contact relationship (either direction) before persisting the message.
  - No relationship → `403 FORBIDDEN` with `CONTACT_RELATIONSHIP_REQUIRED` (new shared constant in `packages/constants`).
  - The REST path is the only message-send path (Task 2.3 — WebSocket `message:send` is not handled; REST persists and broadcasts), so gating `sendMessage` covers all message sending.
  - History reads (`getHistory`) remain participant-scoped; reading is not "messaging" in the feature scope, which prevents *sending* between non-contacts.
- No new data model, migration, or shared type is needed: contacts derive from the existing accepted `contact_requests` rows (chat created on accept), and the contact response is the existing shared `User` contract.

### Scope Anchor (`features.md` — Contact List / Messaging Access Control)

- Accepted contacts are returned; name/avatar come from the `User` contract (last-message / last-activity previews belong to the Conversation List, Task 2.4).
- Backend verifies the contact relationship before accepting a message.
- Users without an accepted relationship cannot send messages (403).
- Backend enforcement remains authoritative even if frontend restrictions are bypassed.
- Pending / declined requests do not enable messaging.

---

# Not Authorized

The following MUST NOT be implemented in Task 3.3:

- Any later Phase 3 tasks (Task 3.3 is the final Phase 3 task).
- Frontend work of any kind (contact-list UI, screens, components, services).
- WebSocket or presence changes (no contact online/offline push, no presence-derived gating).
- Rate limiting, media, internationalization, or any other later-phase feature.
- Enriching `GET /contacts` beyond the architecture contract (architecture returns `User` objects; last-message/last-activity previews are the Conversation List's job).
- Gating `getHistory` — only message sending is gated by the contact relationship.
- Blocking, muting, contact deletion, or any contact-management behavior not defined in the architecture.
- Any migration / schema change (the accepted-relationship state already lives in `contact_requests`).

---

# Verification Requirements

Before Task 3.3 may be recorded as complete:

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

Live verification (backend on port 4000, started with `PORT=4000` explicitly):

```text
- npm run migration:run (contact_requests table from Task 3.2 must exist first)
1. register two active users, mark verified  -> tokens obtained (no email transport)
2. alice -> bob contact request, bob accepts -> chat created for the pair
3. GET /contacts as alice                    -> 200, [bob] (User object)
4. GET /contacts as bob                      -> 200, [alice] (User object)
5. POST message to the chat as alice         -> 201 (gate passes)
6. POST message to the chat as bob           -> 201 (either-direction gate passes)
7. send message in a chat between non-contacts -> 403 (CONTACT_RELATIONSHIP_REQUIRED)
8. seeded verification data cleaned up
```

The same environment blocker is expected to block steps above. **If any live check cannot be executed, it MUST NOT be claimed passed**; record it as a known issue exactly as prior tasks did.

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