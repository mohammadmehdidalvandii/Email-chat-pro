# Current Task

## Purpose

This file defines the **exact work currently authorized** for Claude Code.

`current-task.md` is the execution boundary for the current development step.

---

# Current Phase

## Chat Messaging — Infinite Scroll
**Authorization:** Authorized for implementation (replaces Phase 5: Media Upload Experience temporarily). Media Upload is NOT complete; do not claim it complete. No backend modifications authorized unless demonstrably required after inspection.

**Date:** 2026-10-13

---

# Scope

## Goal
Replace chat message pagination in the chat window with infinite scrolling:

- Load newest messages initially (most recent first, oldest above).
- Load older messages on upward scroll using existing backend pagination (`page`/`limit`).
- Preserve scroll position when older messages are prepended.
- Prevent duplicate requests/messages; stop when no older pages remain.
- Remove obsolete pagination UI controls and obsolete pagination-specific code after verification.
- Preserve Socket.IO, unread/read receipts, attachments, auth, RTL/LTR, themes, responsive layouts.

## Execution Boundary Restrictions
- Do NOT implement or claim Image Upload / Video Upload (previous Phase 5 task not completed).
- Do NOT modify backend pagination endpoint unless inspection proves it insufficient.
- Do NOT delete unrelated pagination code used by other features.
- Do NOT commit or push changes.
- Follow `rules.md`: inspect before creating, minimal change, verify before reporting.

---
# Previous Task (NOT completed)
## Phase 5 — Media Upload Experience
Status: NOT completed. Previously authorized but interrupted. Not marked done.

---
# Authorized Work
- Inspect `useChatHistory`, message fetching hooks, backend pagination endpoint.
- Implement frontend infinite scroll for chat messages.
- Remove only verified-obsolete pagination UI/code.
- Update this file with authorization record (done above); preserve history (previous Phase 5 entry retained above).
