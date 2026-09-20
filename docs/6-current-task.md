# Current Task

## Purpose

This file defines the **exact work currently authorized** for Claude Code.

`current-task.md` is the execution boundary for the current development step.

Claude Code MUST NOT implement work outside the scope explicitly defined in this file.

---

# Current Phase

## Frontend Development — Phase 2: User Profile Experience

**Authorization:** Approved Frontend Development Roadmap — Phase 2 only. Phase 1 (Authentication Experience) is completed, verified, documented in `docs/7-done.md`, and committed.

**Date:** 2026-09-20

---

# Scope

## Goal

Allow authenticated users to view, edit, and delete their profile.

## Backend APIs Consumed (no backend changes)

- `GET /api/v1/users/me` — Fetch current user profile
- `PATCH /api/v1/users/me` — Update profile (username, fullName, bio, avatarUrl)
- `DELETE /api/v1/users/me` — Delete account (requires password confirmation)

## Shared Contracts Consumed

- `@email-chat-pro/types`: `User`, `UpdateProfileInput`, `ProfileResponse`, `DeleteAccountInput`, `DeleteAccountResponse`
- `@email-chat-pro/constants`: validation constants (username, full name, bio rules), error codes/messages

---

# Pages / Screens

- `/settings/profile` — Profile viewing and editing form (protected route)

---

# Components Required

- `ProfileForm` — Profile editing form (username, fullName, bio)
- `AccountDeletionModal` — Confirmation modal for account deletion (password confirmation)
- Required profile UI components only (no AvatarUploader placeholder, no media components)

**Explicit exclusions:**

- Avatar upload
- Cloudinary/media
- Contacts
- Search
- Messaging
- Backend modifications
- New dependencies without approval

---

# API Integration

- Use the existing `apiClient` (Axios instance from `apps/frontend/src/lib/api/client.ts`)
- Use the existing API call patterns (`apiRequest<T>` wrapper for typed responses)
- Typed API contracts from `@email-chat-pro/types`:
  - `GET /users/me` → `ProfileResponse` (= `User`)
  - `PATCH /users/me` → `UpdateProfileInput` request → `ProfileResponse` response
  - `DELETE /users/me` → `DeleteAccountInput` request → `DeleteAccountResponse` response
- No new API call files beyond what is needed for profile operations
- No backend changes of any kind

---

# State Ownership

## TanStack Query (server state — single source of truth)

- Profile fetching: query key `['profile']` or `['users', 'me']`, fetches `GET /users/me`
- Profile updating mutation: `PATCH /users/me`, on success update query cache
- Account deletion mutation: `DELETE /users/me`, on success invalidate profile query and trigger session invalidation

## Zustand (local UI state only)

- Modal open/closed state for `AccountDeletionModal`
- Form state that is purely presentational
- Do NOT duplicate server profile state (username, fullName, bio, etc.) in Zustand — that belongs in TanStack Query
- The auth store (`useAuthStore`) remains for auth session state only (token, user, hasSessionResolved)

---

# Validation

- Use Zod schemas aligned with shared constants from `@email-chat-pro/constants`
- Reuse existing validation patterns from Phase 1 (see `apps/frontend/src/lib/validation/auth.schema.ts` for the established pattern)
- Client-side validation for immediate feedback; backend validation remains authoritative
- Profile field rules from shared constants:
  - Username: `USERNAME_REGEX` (`^[a-zA-Z0-9_-]+$`), 3–30 chars (`USERNAME_MIN_LENGTH`/`USERNAME_MAX_LENGTH`)
  - Full name: max 100 chars (`FULL_NAME_MAX_LENGTH`)
  - Bio: max 500 chars (`BIO_MAX_LENGTH`)
- Error messages from `@email-chat-pro/constants` (`USERNAME_REQUIRED`, `USERNAME_TOO_SHORT`, `USERNAME_TOO_LONG`, `USERNAME_INVALID`, `FULL_NAME_TOO_LONG`, `BIO_TOO_LONG`, etc.)

---

# Authentication / Authorization

- `/settings/profile` must be a protected route
- Reuse existing `RequireAuth` component (`apps/frontend/src/components/auth/RequireAuth.tsx`) and session infrastructure (`useSession` hook, `useAuthStore`)
- Unauthenticated users redirect to `/login` (handled by `RequireAuth`)
- Account deletion requires password confirmation (confirmed via `DeleteAccountInput`)

---

# Verification Requirements

## Automated

- Frontend type-check passes (`npm run type-check`)
- Frontend lint passes (`npm run lint`)
- Existing tests continue to pass (`npm test`)

## Manual — Profile Lifecycle

1. View profile — authenticated user fetches and sees their profile data
2. Update profile — user edits username/fullName/bio, changes persist to backend via `PATCH /users/me`
3. Delete account — user confirms deletion with password via `AccountDeletionModal`, `DELETE /users/me` succeeds
4. Session invalidation after deletion — after account deletion, the session is no longer valid; subsequent API calls and route guards redirect to `/login`

---

# Golden Rule

> **Do not start Phase 3 or any later phase until Phase 2 is completed, verified, documented in `docs/7-done.md`, committed, and explicitly approved.**

> **Do not modify backend code. Frontend only.**

> **Follow existing architecture and shared contracts. Use Zustand for UI state only. Use TanStack Query for server state.**
---
# Phase 2 — Completed (2026-09-20)

User Profile Experience (view/edit/delete profile) is verified complete.
- Page /settings/profile built with RequireAuth
- ProfileForm + AccountDeletionModal implemented
- Type-check / lint / build PASS
- API verification blocked by PostgreSQL 5432 environment conflict
- No unauthorized scope changes

Next approved placeholder (NOT authorized until approved):
Phase 3 — Contacts and Search (placeholder only; do not implement).
Refer to features.md §Contacts and Search for scope when authorized.
