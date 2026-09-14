# Current Task

## Purpose

This file defines the **exact work currently authorized** for Claude Code.

`current-task.md` is the execution boundary for the current development step.

Claude Code MUST NOT implement work outside the scope explicitly defined in this file.

When the task is completed and verified, the completed work MUST be recorded in `done.md`, and this file MUST be updated or replaced with the next approved task.

---

# Current Phase

## Phase 4 — Media, Polish, and Deployment

**No task is currently authorized.**

Task 4.2 — Video Messages is completed with known issues and recorded in `docs/7-done.md` (2026-09-14). Task 4.3 is the next Phase 4 task by roadmap order, but it has **not been authorized** by the maintainer.

**Task 4.2 completion:** the execution boundary defined in this file was fully implemented, verified (static), and recorded. Live endpoint checks remain blocked by the recurring environment issue (host 5432 held by the Windows PostgreSQL service; no real Cloudinary credentials) and were NOT claimed passed.

---

# Authorized Scope

## None

Task 4.2 — Video Messages is complete. Task 4.3 is **NOT authorized**.

Anything requiring implementation in Task 4.3 or later MUST wait for explicit maintainer approval:

```text
STOP → REPORT → ASK
```

The `docs/7-done.md` Task 4.3 placeholder lists the roadmap shape for the next
Phase 4 task (Internationalization — Persian, English, i18next, RTL/LTR), but
the scope is provisional and **must not** be implemented until the maintainer
authorizes Task 4.3 and defines its execution boundary.

---

# Not Authorized

The following MUST NOT be implemented until a future task authorizes it:

- **Task 4.3 — Internationalization** (Persian, English, i18next, RTL/LTR) and any later Phase 4 task (presence, rate limiting/security hardening, structured logging/Winston, performance, deployment).
- Any frontend media work, including video rendering/playback in conversations (backend-only video support was the Task 4.2 scope).
- Backend work outside an approved Task 4.3 execution boundary.
- No source-code changes of any kind for Task 4.3 or beyond without an approved boundary.

---

# Verification Requirements

Task 4.2's verification was executed and recorded in `docs/7-done.md`:

```text
- npm run build:packages: PASS
- npx tsc --noEmit (backend): PASS
- npx eslint "src/**/*.ts" --max-warnings=0 (backend): PASS
- npx jest (backend): PASS — 18 suites / 187 tests
- npm run build (nest build): PASS
- npm run format:check: PARTIAL — only the pre-existing Task 2.2 migration file,
  1789050600000-CreateMessagesTable.ts, remains unformatted (unchanged, out of
  scope)
- Live endpoint tests (current-task.md checks 1-8): NOT EXECUTED — environment
  blocker (host 5432 / no Cloudinary credentials). Not claimed passed.
```

Until Task 4.3 is authorized, no new verification is required.

---

# Product Decision Boundary

Claude Code is not authorized to make product decisions.

If a future task requires choosing between multiple valid product or architectural approaches that are not already defined in the context documents:

```text
STOP → REPORT → ASK
```

Do not silently choose an approach.

---

# Golden Rule

> Implement only the approved task, verify it, record it, report it, and stop.

Do not start Task 4.3 until it is authorized, its execution boundary is written to this file and approved, and the maintainer instructs Claude Code to proceed.