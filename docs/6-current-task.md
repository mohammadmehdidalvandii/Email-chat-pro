# Current Task

## Purpose

This file defines the **exact work currently authorized** for Claude Code.

`current-task.md` is the execution boundary for the current development step.

Claude Code MUST NOT implement work outside the scope explicitly defined in this file.

When the task is completed and verified, the completed work MUST be recorded in `done.md`, and this file MUST be updated or replaced with the next approved task.

---

# Current Phase

## Phase 2 — Real-time Messaging

The current task is **Task 2.1 — Chat Foundation**.

Task 1.5 (Account Deletion) is completed and verified (`docs/7-done.md`).

> This file is a placeholder for the **next approved task**. It was set when Task 1.5 completed. The task owner should review and confirm this scope before implementation begins. Claude Code MUST NOT begin implementing this task until it has been re-approved.

---

# Current Objective

Implement the **one-to-one chat model** foundation: a persisted `chats` table where every chat has exactly two participants and at most one chat exists per participant pair, following `architecture.md` §Data Model — Chats Table.

The chat **data model** is the only deliverable of this task. Message persistence (Task 2.2), real-time messaging (Task 2.3), and the conversation list (Task 2.4) build on top of this foundation.

---

# Authorized Scope

Claude Code is authorized to work only on the following areas.

## 1. Chats Data Model

* Create a `chats` table via a TypeORM migration per `architecture.md` §Data Model:

  ```text
  chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a UUID NOT NULL REFERENCES users(id),
    user_b UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_a, user_b),
    CHECK (user_a < user_b),
    CHECK (user_a != user_b)
  )
  ```

* Add indexes per the architecture: `idx_chats_user_a ON chats(user_a)`, `idx_chats_user_b ON chats(user_b)`.
* Enforce the **unique participant pair** invariant: `UNIQUE (user_a, user_b)` guarantees one chat per user pair; `CHECK (user_a < user_b)` normalizes so `(A,B)` and `(B,A)` map to the same row.
* Add a shared `ChatEntity`-equivalent backend entity.
* Add `Chat` types to `packages/types` (shared contract) where applicable.

## 2. Participant Normalization Helper

* A lookup must normalize a pair before querying: if `user1 > user2` then swap, matching the stored `user_a < user_b` ordering (architecture.md — Schema Reasoning for Chats).

## 3. Repository Query Foundation (read path only)

* Where a repository is added, keep it to the read path required by the model (e.g., finding the chat for a normalized participant pair), consistent with the architecture's `GET /chats` conversation-list shape. Do NOT persist messages in this task.

---

# Explicitly NOT Authorized

The following work MUST NOT be implemented during this task.

## Message Persistence (Task 2.2)

* Do NOT create the `messages` table, message entity, message DTOs, or message CRUD.

## Real-time Messaging (Task 2.3)

* Do NOT introduce Socket.IO parts, chat/message gateways, or WebSocket event contracts.

## Conversation List (Task 2.4)

* Do NOT build the full `GET /chats` conversation list with message aggregates and recent-activity sorting.

## Contacts and Search (Phase 3)

* Do NOT implement contact requests, contact acceptance, or the contact relationship gating on chat creation.

## Frontend

* Do NOT implement any frontend chat UI, stores, or services at this phase boundary. The phase stubs in the frontend (`chats/page.tsx`, `chats/[chatId]/page.tsx`) are placeholders.

## Infrastructure and Dependencies

* Do NOT introduce Redis, Kafka, RabbitMQ, NATS, Kubernetes, or any unapproved infrastructure.
* Do NOT add new dependencies beyond what `stack.md` approves.

---

# Open Decisions (ask before implementing)

The following concerns the chats lifecycle and may need a maintainer decision when implementation begins:

* **Chat creation trigger** — whether a chat is created explicitly (POST /chats), implicitly on first message, or from an accepted contact. The architecture's Chats Table defines the model but `2-features.md` lists "Dependency: Accepted Contact Relationship" for conversations while contacts are a Phase 3 feature. If this ambiguity is unresolved at implementation time: **STOP → REPORT → ASK**.

---

# Implementation References

## Approved Context

The implementation MUST remain consistent with:

```text
1-overview-project.md    — messaging is one-to-one; phases
2-features.md            — Conversation / Chat Window (Phase 2, Critical)
3-architecture.md        — Data Model: Chats Table; API: GET /chats; WebSocket: /chats
4-stack.md               — approved technologies and ports
5-rules.md               — coding, TypeScript, error handling, security, testing, Git rules
7-done.md                — Task 1.1 through Task 1.5 records
```

## Existing Code to Reuse

```text
apps/backend/src/modules/auth/auth.module.ts    — cross-module exports pattern
apps/backend/src/modules/auth/guards/jwt.guard.ts — JwtAuthGuard for route protection
apps/backend/src/database/migrations/           — existing migration patterns
packages/types/                                 — shared contract package
packages/constants/                             — shared constants package
apps/backend/src/modules/users/                 — module structure pattern (Task 1.4/1.5)
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

* the `chats` table matches `architecture.md` §Data Model (columns, FK, UNIQUE pair, CHECKs, indexes),
* exactly one chat exists per participant pair regardless of argument order,
* the pair-normalization helper returns the stored row for both `(A,B)` and `(B,A)` lookups,
* shared `Chat` types are added where applicable,
* no message persistence, WebSocket, or frontend work was performed,
* migrations run cleanly on the local database,
* type-check, lint, tests, format-check pass where configured,
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

Then verify the chat model against a live backend where applicable.

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

> Implement the chat foundation, verify it, record it, report it, and stop.

Do not start Task 2.2 until this task is completed, verified, and recorded.