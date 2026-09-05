# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current repository state

**There is no source code yet.** The repo contains only the seven planning docs in `app/docs/`.
`app/backend/`, `app/frontend/`, and `app/package/{types,constants,utils}/` exist but are empty.
There is no root `package.json`, no `pnpm-workspace.yaml`, no `docker-compose.yml`, no `.gitignore`,
and no README.

Phase 0 (infrastructure and project setup) is `IN PROGRESS` with all ten subtasks still `[ ] Pending`.
`app/docs/7-done.md` is an unfilled template — nothing has been completed and approved yet.

Consequence: the build/lint/test commands below are **specified by the docs but do not exist yet**.
Creating them is Phase 0 work. Do not assume any command runs until the corresponding subtask is done.

## The docs are the specification, and they are authoritative

Everything about this project — what to build, where files go, which library to use, how to format a
line of code — is fixed in `app/docs/`. Read them before writing anything:

| File | Role |
| --- | --- |
| `1-overview-project.md` | Scope, goals, user stories, non-goals, "done means" criteria |
| `2-stack.md` | Every approved dependency and why it was chosen; env vars |
| `3-rules.md` | Naming, code style, TS config, import order, git/PR/review process |
| `4-features.md` | The complete feature list, per phase, with acceptance criteria |
| `5-architecture.md` | Folder layout, SQL schema, shared types, all REST endpoints, all Socket.IO events |
| `6-current-task.md` | The active phase and its subtasks — the only valid work queue |
| `7-done.md` | Completed and approved phases (template only, so far) |

Two hard rules from `3-rules.md`:

- **Never build a feature that is not listed in `4-features.md`.** If the user asks for one, the
  feature must be added to that file first.
- **When docs conflict, precedence is: overview > features > architecture > stack > rules.** This
  matters in practice (see Known doc conflicts below).

## Phase-gate workflow

Work proceeds one phase at a time, and each phase requires explicit human approval before the next
starts. Only Mohammad Mehdi (Product Owner / reviewer) can approve or merge.

1. Read the active phase in `6-current-task.md`. Do not start work not listed there.
2. Implement, following `3-rules.md` and `5-architecture.md`.
3. Commit as `type: description` (`feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`) on a
   feature branch — never directly to `main`. Branches: `feature/auth-module`, `fix/message-persistence`.
4. Push, open a PR, and wait for formal approval. Do not proceed without it.
5. After approval, move the phase from `6-current-task.md` to `7-done.md` with a 100–150 word summary.

Before requesting review, all four must pass: `type-check`, `lint`, `test`, `build`.

## Commands (per `2-stack.md` / `6-current-task.md` — to be created in Phase 0)

```bash
pnpm install                 # pnpm is the package manager; workspaces at root
pnpm dev                     # start all services
pnpm frontend                # frontend only
pnpm backend                 # backend only
docker-compose up            # PostgreSQL on localhost:5432
pnpm type-check              # must be zero errors
pnpm lint
pnpm build
pnpm test                    # unit
pnpm test:integration
pnpm test:e2e                # must pass with two browser windows side by side
```

Unit test files are named `domain.service.spec.ts` and use nested `describe` blocks
(`describe('AuthService') > describe('validatePassword') > it(...)`). Run a single Jest test with
`pnpm test -- -t 'should return true for valid password'` once the backend exists.

## Architecture in brief

Two independent halves that talk over exactly two channels, so either can be replaced alone:

- **REST (HTTP)** — auth, profile, user search, contacts, file upload. Base `/api/v1`.
- **Socket.IO** — message delivery, typing indicators, presence. Namespace `/chats`, one room per
  chat (`chat:<uuid>`), joined only by the two participants.

Backend is NestJS with feature modules (`auth`, `users`, `chat`, `messages`, `contacts`, `websocket`,
`files`), each holding its own `controller` / `service` / `module` / `dto/` / `entities/`. Cross-module
code goes in `common/` (decorators, exceptions, pipes, middleware, interceptors), never into a
sibling module.

Frontend is Next.js App Router with route groups `(auth)` and `(dashboard)`. Components are grouped
by domain (`Auth/`, `Chat/`, `Layout/`, `Common/`, `Providers/`) — not by type. **Zustand holds UI
state only; TanStack Query owns all server state.** Keep that split.

`app/package/{types,constants,utils}` are the single source of truth shared by both halves:
`types` for API contracts (never duplicate a type locally), `constants` for every error message and
WebSocket event name, `utils` for shared validators/formatters.

### Data model invariants

These are the non-obvious parts of the schema in `5-architecture.md`:

- **`chats` stores the pair normalized as `user_a < user_b`**, enforced by `CHECK (user_a < user_b)`
  plus `UNIQUE (user_a, user_b)`. Every lookup must swap the ids before querying, or `(3,7)` and
  `(7,3)` will not find the same row.
- **A chat row only exists after a contact request is accepted.** Messaging requires an `accepted`
  row in `contact_requests`; the backend must verify this before persisting a message, and a
  `declined` request blocks messaging until a new request is sent.
- **Account deletion is anonymization, not deletion.** Set `deleted_at`, set `is_active = false`,
  rename username to `deleted#{original_id}`, clear `full_name`/`bio`/`avatar_url`/`password_hash`.
  Messages keep their original `sender_id` and surface as "Deleted User" in API responses. This is
  why usernames may not begin with `deleted`.
- **Messages are never edited or deleted.** `created_at` is server time and the sole ordering key;
  `idx_messages_chat_created (chat_id, created_at DESC)` is the hot path for the last-50 fetch.
- Every table carries `id UUID` PK, `created_at`, `updated_at`, and nullable `deleted_at`.
- DB is `snake_case` (`user_id`, `is_active`, plural table names); shared TS types are `camelCase`
  (`userId`, `isActive`). TypeORM entities are the mapping layer.
- Put integrity in the database (`NOT NULL`, `UNIQUE`, `CHECK`), not only in application code.

## Code style — the surprising parts

`3-rules.md` is prescriptive. The ones most likely to be violated by habit:

- **No semicolons** (Prettier strips them). Single quotes. 2 spaces. 100-char lines. Trailing commas
  in multiline literals.
- **Never `any`** — use `unknown`. Strict mode is fully on, including `noUnusedLocals`,
  `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`.
- **No wildcard imports.** Imports come in four groups separated by blank lines: external libs →
  shared packages (`@/packages/*`) → local modules/services → relative utils.
- **No `console.*` anywhere.** Backend uses the Winston logger, frontend uses Sonner toasts.
- `interface` for contracts and entity shapes; `type` for unions and tuples. Descriptive generic
  parameters (`<TResponse>`, not `<R>`).
- Every error is caught. Backend: log with Winston, then throw `HttpException` with a code and
  message from `packages/constants`. Frontend: catch, show a toast, rethrow.
- Folders are always kebab-case. Backend files are `domain.service.ts`, `domain.entity.ts`,
  `create-domain.dto.ts`; frontend components are `PascalCase.tsx`; hooks are `use`-prefixed.
- REST URLs contain no verbs — actions are subresources (`PATCH /contacts/requests/:id`, not
  `/acceptContact`). Every response is wrapped: `{ success, data }` or
  `{ success: false, error: { code, message }, timestamp }`.
- Comments explain *why*, never *what*. JSDoc on exported functions.

## Known doc conflicts — resolve with the owner, don't silently pick

1. **Ports.** `2-stack.md` says frontend `4000` / backend `3000`. `5-architecture.md` and
   `6-current-task.md` say frontend `3000` / backend `4000`, and the documented API base URL is
   `http://localhost:4000/api/v1`. Architecture outranks stack, so **frontend 3000, backend 4000**
   is the reading to use — but `2-stack.md` still needs correcting.
2. **Workspace paths.** All docs describe `apps/frontend`, `apps/backend`, `packages/*` at the repo
   root. On disk the directories are `app/frontend`, `app/backend`, `app/package/{types,constants,utils}`
   (singular `app`, singular `package`). Phase 0 must settle which layout is real before
   `pnpm-workspace.yaml` and the `@/packages/*` aliases are written.
3. **Languages.** `2-stack.md` and `5-architecture.md` include Spanish locales; `1-overview-project.md`
   "done means" only requires Persian (fa-IR) and English (en-US). Spanish is Medium priority in
   `4-features.md`.
4. **Password reset** is listed under out-of-scope non-goals in `1-overview-project.md` ("no password
   reset emails") but has endpoints in `5-architecture.md` and a Phase 4 feature in `4-features.md`.
   Features outrank overview, so it is in scope for Phase 4.

## Documentation upkeep

Completing work means updating the docs too: new endpoints go into `5-architecture.md`, phase
completions move to `7-done.md`, and every package/app folder needs its own README (what it does,
how to install, how to run, key files).
