# Current Task

## Purpose

This file defines the **exact work currently authorized** for Claude Code.

`current-task.md` is the execution boundary for the current development step.

Claude Code MUST NOT implement work outside the scope explicitly defined in this file.

When the task is completed and verified, the completed work MUST be recorded in `done.md`, and this file MUST be updated or replaced with the next approved task.

---

# Current Phase

## Phase 4 — Media, Polish, and Deployment

**Task 4.1 — Image Messages** is completed and verified (static checks) with known issues and recorded in `docs/7-done.md`.

**Task 4.2 — Video Messages** has NOT been defined or approved. This file is a **placeholder** pending maintainer approval of the Task 4.2 scope.

Task 4.2 is not started. Claude Code must not define its own scope for Task 4.2.

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