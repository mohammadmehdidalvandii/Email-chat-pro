# Current Task

## Purpose

This file defines the **exact work currently authorized** for Claude Code.

`current-task.md` is the execution boundary for the current development step.

Claude Code MUST NOT implement work outside the scope explicitly defined in this file.

When the task is completed and verified, the completed work MUST be recorded in `done.md`, and this file MUST be updated or replaced with the next approved task.

---

# Current Phase

## Phase 2 — Real-time Messaging

**Task 2.1 — Chat Foundation** is **completed and verified** (`docs/7-done.md`).

---

# Next Task

The next task is **Task 2.2 — Message Persistence**. It has **NOT been started**.

> This file is a placeholder for the **next approved task**. It was set when Task 2.1 completed. Task 2.2's scope has NOT been approved and is intentionally NOT defined here. The task owner should review and confirm the Task 2.2 scope before implementation begins.

Claude Code MUST NOT begin implementing Task 2.2 until it has been explicitly re-approved.

Claude Code MUST NOT invent Task 2.2 requirements from memory or from `features.md`/`architecture.md` (e.g. the `messages` table, message entity, message DTOs, or message CRUD).

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