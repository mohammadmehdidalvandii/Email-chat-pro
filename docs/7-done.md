# Done

## Purpose

This file records work that has been **completed, verified, and approved**.

It is the project's lightweight implementation history.

Claude Code MUST NOT mark a task as completed unless the task has actually been implemented and the available verification steps have been performed.

---

# Completion Rules

A task may be recorded here only when:

* The authorized scope was implemented.
* The implementation is consistent with the project context.
* Available validation commands were executed.
* Known failures were reported.
* No unauthorized features were implemented.
* No unapproved technologies or infrastructure were introduced.

If verification is incomplete, the task MUST NOT be described as fully completed.

---

# Status Definitions

Use the following statuses:

### Completed

The task was implemented and the relevant verification checks passed.

### Completed with Known Issues

The authorized task was implemented, but one or more known non-blocking issues remain.

The issues MUST be explicitly documented.

### Blocked

The task could not be completed because of a blocking problem.

The reason MUST be documented.

### Cancelled

The task was intentionally stopped or removed from the development plan.

The reason MUST be documented.

---

# Task History

## Phase 0 — Infrastructure and Project Setup

### Task 0.1 — Repository and Monorepo Foundation

**Status:** Completed with Known Issues

**Date:** 2026-09-06

**Scope:**

- Inspect existing repository.
- Establish or verify npm Workspaces.
- Establish or verify:

  - `apps/frontend`
  - `apps/backend`
  - `packages/types`
  - `packages/constants`
  - `packages/utils`

- Establish or verify frontend foundation.
- Establish or verify backend foundation.
- Establish or verify shared packages.
- Establish or verify PostgreSQL Docker environment.
- Establish or verify environment configuration structure.
- Establish or verify intended development ports.
- Establish or verify `/api/v1` API foundation.
- Establish or verify TypeScript configuration.
- Establish or verify development scripts.

**Implemented / Verified State:**

- npm Workspaces configured in root `package.json` (`apps/*`, `packages/*`); all five workspaces linked in `node_modules/@email-chat-pro`.
- Frontend: Next.js 15.5.25 App Router, React 19, TypeScript, Tailwind CSS v4 via `@tailwindcss/postcss`.
- Backend: NestJS 11, TypeScript, TypeORM 0.3 + `pg`, global prefix from shared `API_BASE_PATH`, CORS restricted to `http://localhost:3000`.
- Shared packages build to `dist` and are consumed by both apps: `@email-chat-pro/types` (`ApiResponse`, `PaginatedResponse`), `@email-chat-pro/constants` (`API_BASE_PATH`), `@email-chat-pro/utils` (`isValidEmail`).
- PostgreSQL 16-alpine via `docker-compose.yml` on port 5432 with healthcheck and named volume `pgdata`.
- Environment structure: root `.env.example`, `apps/backend/.env.example`, `apps/frontend/.env.example`. Only placeholders committed; `apps/backend/.env` is untracked and ignored by `.gitignore`.
- Ports confirmed as frontend 3000, backend 4000, PostgreSQL 5432. No port changes were made.
- TypeScript strict foundation in `tsconfig.base.json` (`strict`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`), extended by all workspaces.
- Root scripts available: `dev`, `build`, `build:packages`, `build:apps`, `type-check`, `lint`, `test`, `format`, `format:check`.
- Repository formatted with the project Prettier configuration (`npm run format`), which normalized end-of-file newlines across 36 files and reformatted `apps/backend/package.json` (jest arrays), `apps/frontend/eslint.config.mjs` (ignores array), and `CLAUDE.md` (Markdown bullet markers `*` → `-`). No source behavior was changed.

**Verification (executed 2026-09-06):**

- Dependencies:

  - `npm install` → PASS (`up to date, audited 860 packages`). Node v24.17.0, npm 11.13.0.

- TypeScript:

  - `npm run type-check` → PASS (shared packages built, then `tsc --noEmit` clean for backend, frontend, types, constants, utils).

- Lint:

  - `npm run lint` → PASS (backend `eslint "src/**/*.ts"`, frontend `eslint .`, no findings).

- Tests:

  - `npm test` → PASS (backend jest: 1 suite, 1 test — `app.controller.spec.ts`). Frontend and shared packages have no test scripts.

- Build:

  - `npm run build` → PASS (`nest build` for backend; `next build` for frontend, 4 static pages generated).

- Formatting:

  - `npm run format:check` → PASS after `npm run format` (`All matched files use Prettier code style!`).

- Docker/PostgreSQL:

  - `docker compose config` → PASS (valid, port 5432, volume `pgdata`).
  - `docker compose ps` → container `email-chat-pro-db` Up and healthy, `0.0.0.0:5432->5432/tcp`.
  - `docker compose exec postgres psql ...` → PASS (PostgreSQL 16.15, database `email_chat_pro`, user `email_chat_dev`).

- Runtime:

  - Backend started from `apps/backend/dist/main.js`; TypeORM connected to PostgreSQL; `GET http://127.0.0.1:4000/api/v1` → `200` with `{"success":true,"data":{"message":"Email-Chat-Pro API is running."},...}` and `Access-Control-Allow-Origin: http://localhost:3000`.
  - Frontend started with `next start`; `GET http://127.0.0.1:3000` → `200`, page renders the shared `API_BASE_PATH` value.
  - Both processes were stopped after verification.

**Files Changed (this session):**

```text
docs/7-done.md

Formatting-only (npm run format, 36 files):
.prettierrc.json
CLAUDE.md
README.md
package.json
tsconfig.base.json
docker-compose.yml
apps/backend/eslint.config.mjs
apps/backend/nest-cli.json
apps/backend/package.json
apps/backend/tsconfig.json
apps/backend/tsconfig.build.json
apps/backend/src/app.controller.spec.ts
apps/backend/src/app.controller.ts
apps/backend/src/app.module.ts
apps/backend/src/app.service.ts
apps/backend/src/config/database.config.ts
apps/backend/src/main.ts
apps/frontend/eslint.config.mjs
apps/frontend/next.config.mjs
apps/frontend/postcss.config.mjs
apps/frontend/tsconfig.json
apps/frontend/src/app/globals.css
apps/frontend/src/app/layout.tsx
apps/frontend/src/app/page.tsx
packages/constants/package.json
packages/constants/tsconfig.json
packages/constants/src/api.constants.ts
packages/constants/src/index.ts
packages/types/package.json
packages/types/tsconfig.json
packages/types/src/api.types.ts
packages/types/src/index.ts
packages/utils/package.json
packages/utils/tsconfig.json
packages/utils/src/index.ts
packages/utils/src/validators.ts
```

No application source logic was created or modified in this session. The workspace,
frontend, backend, and shared-package foundations already existed from the previous
session and were inspected and verified rather than recreated.

**Notes:**

```text
Verification only plus repository formatting. Nothing was reinitialized and no
generators were run. No Phase 1 work was started. current-task.md was not modified.
```

---

# Phase 1 — Authentication and User Profile

## Task 1.1 — Registration

**Status:** Completed with Known Issues

**Date:** 2026-09-07

**Scope:**

* User registration
* Email validation
* Password validation
* Password hashing
* User creation
* Registration error handling

**Implemented / Verified State:**

- `POST /api/v1/auth/register` accepts `{ email, password }` and creates an account.
- Email validation: RFC 5322 simplified regex, 5–255 characters, normalized to lowercase before storage. Shared rules in `@email-chat-pro/constants` (`validation.constants.ts`) and enforced by both `class-validator` (DTO) and a DB `CHECK` constraint.
- Password validation: 8–255 characters, must include an uppercase letter, a lowercase letter, a digit, and a special character (`!@#$%^&*`). Shared rules in `@email-chat-pro/constants` and enforced by `class-validator`.
- Password hashing: bcryptjs with 10 salt rounds. The plaintext password is never stored or returned; only `password_hash` is persisted.
- Email uniqueness enforced at the database level via a `UNIQUE` constraint on `users.email` (migration `CreateUsersTable1788710400000`), with a service-level pre-check and a `23505` unique-violation race handler that both map to `409 CONFLICT`.
- New users are created in the pending/unverified state: `is_verified = false`, `is_active = true`.
- All responses use the shared `ApiResponse<T>` envelope (`{ success, data?, error?, timestamp }`) with the global `HttpExceptionFilter` producing the standardized error shape. Success returns `201 Created`.
- Shared contracts: `RegisterInput` / `RegisterResponse` in `@email-chat-pro/types` (`auth.types.ts`).
- The `users` table contains only registration columns; profile columns (username, full_name, bio, avatar_url, profile_completed, last_seen_at) are deferred to Task 1.4 per the approved decision.

**Verification:**

```text
Executed 2026-09-07.

- npm run type-check:  PASS (all 5 workspaces)
- npm run lint:        PASS (backend + frontend)
- npm test:            PASS (3 suites / 9 tests:
                        app.controller.spec, auth.service.spec, auth.controller.spec)
- migration:run:       PASS (users table created; UNIQUE + CHECK constraints present)
- Endpoint (live, backend on port 4000):
  - POST /auth/register {valid}          -> 201, success:true, data{id,email,message}
  - POST /auth/register {duplicate}      -> 409 CONFLICT "Email already registered"
  - POST /auth/register {invalid email}  -> 400 VALIDATION_ERROR
  - POST /auth/register {weak password}  -> 400 VALIDATION_ERROR
  - uppercase email "CAROL@Example.com"  -> normalized to carol@example.com (201)
- DB persistence: email stored lowercase, password_hash is 60-char bcrypt ($2b$)
  prefix, no plaintext, is_verified=false, is_active=true.
```

**Files Changed:**

```text
Modified:
apps/backend/package.json               (+ @email-chat-pro/constants dep; migration scripts)
apps/backend/src/app.module.ts          (register AuthModule)
apps/backend/src/main.ts                (ValidationPipe + HttpExceptionFilter)
packages/constants/src/index.ts         (export error + validation constants)
packages/types/src/index.ts             (export auth.types)
packages/utils/package.json             (+ @email-chat-pro/constants dep)
packages/utils/src/validators.ts        (isValidPassword; shared constants)
package-lock.json                       (reify Task 1.1 deps: bcryptjs,
                                         class-validator, class-transformer,
                                         utils->constants)

Created:
packages/constants/src/error.constants.ts
packages/constants/src/validation.constants.ts
packages/types/src/auth.types.ts
apps/backend/src/common/filters/http-exception.filter.ts
apps/backend/src/database/data-source.ts
apps/backend/src/database/migrations/1788710400000-CreateUsersTable.ts
apps/backend/src/modules/auth/auth.controller.ts
apps/backend/src/modules/auth/auth.controller.spec.ts
apps/backend/src/modules/auth/auth.module.ts
apps/backend/src/modules/auth/auth.service.ts
apps/backend/src/modules/auth/auth.service.spec.ts
apps/backend/src/modules/auth/dto/register.dto.ts
apps/backend/src/modules/auth/entities/user.entity.ts
```

---

## Task 1.2 — Email Verification

**Status:** Completed with Known Issues

**Date:** 2026-09-07

**Scope:**

* Email verification flow
* Verification state
* Verification validation
* Access restrictions for unverified accounts

**Implemented / Verified State:**

- Verification token generation is initiated **at registration**. A CSPRNG token (`randomBytes(32)` → 64 hex chars, 256 bits) is generated for every new account per `current-task.md` (approved decision: token at registration only, no resend endpoint, no email transport in Task 1.2).
- The plaintext token is **never stored**: only its SHA-256 hash is persisted in `users.verification_token_hash`. The token is never returned in responses or written to logs.
- Tokens expire after **24 hours** (shared constant `VERIFICATION_TOKEN_EXPIRATION_HOURS` in `@email-chat-pro/constants`). The expiry is stored in `users.verification_token_expires_at`.
- `POST /api/v1/auth/verify-email` accepts `{ "token" }` (per `architecture.md §API Endpoints`; shared contract `VerifyEmailInput`). On success it returns `200` with `data: { message: "Email verified successfully" }` (`VerifyEmailResponse`) and:
  - flips `is_verified` from `false` to `true`,
  - records `verified_at`,
  - clears `verification_token_hash` and `verification_token_expires_at` so the token cannot be reused.
- Rejections (all HTTP 400, standardized `ApiResponse` envelope):
  - unknown token, expired token, or already-used token → `VERIFICATION_TOKEN_INVALID` ("Verification token is invalid or expired"); unknown and used tokens produce the same generic error so responses do not reveal whether a particular hash exists.
  - malformed / missing token → `VALIDATION_ERROR` (`class-validator` on the DTO, token length enforced against shared `VERIFICATION_TOKEN_LENGTH`).
- Access restrictions for unverified users: **none implemented** — no protected routes, guards, or JWT exist yet (Task 1.3), and per `current-task.md` nothing in the current context defines an enforceable restriction before authentication exists. `is_verified` is the state that Task 1.3+ will enforce.
- Shared contracts: `VerifyEmailInput` / `VerifyEmailResponse` in `@email-chat-pro/types`; `VERIFICATION_TOKEN_LENGTH`, `VERIFICATION_TOKEN_EXPIRATION_HOURS`, `ERROR_CODES.VERIFICATION_TOKEN_INVALID`, `ERROR_MESSAGES.VERIFICATION_TOKEN_REQUIRED` / `VERIFICATION_TOKEN_INVALID` in `@email-chat-pro/constants`. No new dependency was introduced (uses `node:crypto`).
- `register()` behavior is unchanged for callers: it still returns 201 with `{ id, email, message: "Registration successful" }` and does not claim a verification email was sent (there is no email transport).

**Verification:**

```text
Executed 2026-09-07.

- npm run type-check:  PASS (all 5 workspaces)
- npm run lint:        PASS (backend + frontend)
- npm test:            PASS (3 suites / 16 tests:
                        app.controller.spec, auth.service.spec (13),
                        auth.controller.spec (2))
- npm run format:check PASS
- migration:run:       PASS (AddVerificationColumns1788883200000 applied;
                        schema shows verification_token_hash varchar(64),
                        verification_token_expires_at timestamp,
                        verified_at timestamp, all nullable)
- Endpoint (live, backend on port 4000):
  1. register new account                        -> 201
  2. DB: verification_token_hash present (64-hex),
     verification_token_expires_at ~24h ahead   -> confirmed
  3. verify-email with valid token               -> 200 "Email verified successfully"
  4. DB after success: is_verified=true,
     verified_at set, hash cleared, expiry
     cleared                                    -> confirmed
  5. reusing the same token (already used)       -> 400 VERIFICATION_TOKEN_INVALID
  6. unknown token                               -> 400 VERIFICATION_TOKEN_INVALID
  7. expired token                               -> 400 VERIFICATION_TOKEN_INVALID
  8. malformed token length                      -> 400 VALIDATION_ERROR
  9. missing token body                          -> 400 VALIDATION_ERROR
- Note: verification_token_expires_at is `timestamp without time zone`
  (matching the existing created_at/updated_at pattern). The 24h expiry is
  internally consistent within the application session; a psql comparison in a
  different timezone session will show an offset because the column has no TZ.
```

**Files Changed:**

```text
Modified:
packages/constants/src/error.constants.ts       (VERIFICATION_TOKEN_* error code/messages)
packages/constants/src/validation.constants.ts  (VERIFICATION_TOKEN_LENGTH, EXPIRATION_HOURS)
packages/types/src/auth.types.ts                (VerifyEmailInput, VerifyEmailResponse)
apps/backend/src/modules/auth/entities/user.entity.ts (3 verification columns)
apps/backend/src/modules/auth/auth.service.ts   (token gen at register; verifyEmail + expiry/secure handling)
apps/backend/src/modules/auth/auth.controller.ts (POST verify-email endpoint)
apps/backend/src/modules/auth/auth.service.spec.ts  (verify success/failure/expiry/reuse tests)
apps/backend/src/modules/auth/auth.controller.spec.ts (verify-email envelope test)
docs/6-current-task.md                          (updated to the Task 1.2 execution boundary)

Created:
apps/backend/src/database/migrations/1788883200000-AddVerificationColumns.ts
apps/backend/src/modules/auth/dto/verify-email.dto.ts
```

---

## Task 1.3 — Login and Logout

**Status:** Completed with Known Issues

**Date:** 2026-09-07

**Scope:**

* Login
* JWT-based authentication
* Authentication state
* Logout
* Authentication error handling

**Implemented / Verified State:**

- **JWT infrastructure:**
  - `passport-jwt` strategy (`JwtStrategy`) configured to accept tokens from `Authorization: Bearer` header or from an httpOnly cookie (`auth_token`).
  - `JwtAuthGuard` guard (`AuthGuard('jwt')`) attaches authenticated user entity to `req.user`.
  - `JwtModule.registerAsync` configured with `JWT_SECRET` from environment (exported at runtime, never hard-coded) and `JWT_EXPIRES_IN` (defaults to `30d`).
  - `getJwtConfig()` validates that `JWT_SECRET` is present; throws on startup if missing.

- **Login endpoint** (`POST /api/v1/auth/login`):
  - Accepts `{ email, password }` validated by `LoginDto` (shared regex + length constants from `@email-chat-pro/constants`).
  - Normalizes email to lowercase, looks up user by email.
  - Returns generic `401 UNAUTHORIZED` for unknown/deleted/inactive/wrong-password.
  - Returns distinct `401 UNAUTHORIZED` with `EMAIL_NOT_VERIFIED` for unverified accounts.
  - On success: signs JWT with `{ sub: user.id, email: user.email }`, sets httpOnly cookie `auth_token` (`sameSite: lax`, `secure` in production, `path: /`), returns `200` with `{ token, user }`.
  - Shared contract: `LoginInput` / `LoginResponse` in `@email-chat-pro/types`.

- **Logout endpoint** (`POST /api/v1/auth/logout`):
  - Clears the `auth_token` cookie and returns `200` with `{ message }`.
  - Shared contract: `LogoutResponse` in `@email-chat-pro/types`.

- **Session endpoint** (`GET /api/v1/auth/session`):
  - Protected by `@UseGuards(JwtAuthGuard)`.
  - Returns `200` with `{ user }` when the token is valid and the account is active.
  - Returns `401` for missing/invalid/expired tokens or inactive accounts.
  - Shared contract: `SessionResponse` in `@email-chat-pro/types`.

- **Tests:** 26/26 passing (app.controller, auth.service [14], auth.controller [8]). Specs use `jest.mock('@nestjs/jwt', ...)` to sidestep ESM/CJS incompatibility in the test runner (see Known Issues).

**Verification:**

```text
Executed 2026-09-07.

- npm run type-check:  PASS (types, constants, utils, backend, frontend)
- npm run lint:        PASS (backend + frontend)
- npm test:            PASS (3 suites / 26 tests)
- npm run format:check PASS
- migration:run:       PASS (no new migrations; existing schema unchanged)
- Live endpoint tests (backend on port 4001, isolated):
  1.  register verified user          -> 201
  2.  register unverified user        -> 201
  3.  DB seed is_verified             -> confirmed
  4.  login wrong password            -> 401 UNAUTHORIZED
  5.  login unverified account        -> 401 EMAIL_NOT_VERIFIED
  6.  login valid (verified account)  -> 200 + token + user + Set-Cookie
  7.  session via Bearer header       -> 200 + user
  8.  session via httpOnly cookie     -> 200 + user
  9.  session no token                -> 401
  10. session invalid token           -> 401
  11. logout                          -> 200 + clears cookie
  12. post-logout session             -> 401 (cookie cleared)
```

**Files Changed:**

```text
Modified:
apps/backend/package.json                              (+ @nestjs/passport, passport, passport-jwt, @types/passport-jwt)
apps/backend/src/modules/auth/auth.controller.ts       (+ login, logout, session endpoints)
apps/backend/src/modules/auth/auth.controller.spec.ts  (+ login/logout/session tests)
apps/backend/src/modules/auth/auth.module.ts           (+ PassportModule, JwtModule.registerAsync, JwtStrategy, JwtAuthGuard providers)
apps/backend/src/modules/auth/auth.service.ts          (+ login, logout, toUserDto methods)
apps/backend/src/modules/auth/auth.service.spec.ts     (+ login/logout tests, JwtService mock)
packages/constants/src/error.constants.ts              (+ EMAIL_NOT_VERIFIED, LOGGED_OUT error messages)
packages/types/src/auth.types.ts                       (+ LoginInput, LoginResponse, LogoutResponse, SessionResponse)
packages/types/src/index.ts                            (+ user.types export)
package-lock.json                                      (reify passport dependencies)

Created:
apps/backend/src/config/jwt.config.ts                  (JWT_SECRET + JWT_EXPIRES_IN from env)
apps/backend/src/modules/auth/dto/login.dto.ts         (LoginDto with class-validator)
apps/backend/src/modules/auth/guards/jwt.guard.ts      (JwtAuthGuard)
apps/backend/src/modules/auth/strategies/jwt.strategy.ts (JwtStrategy + AUTH_COOKIE_NAME)
packages/types/src/user.types.ts                       (User type for shared contracts)
```

---

## Task 1.4 — User Profile

**Status:** Completed with Known Issues

**Date:** 2026-09-08

**Scope:**

* Profile setup
* Profile retrieval
* Profile editing
* Username
* Full name
* Bio
* Profile state

**Implemented / Verified State:**

- **Database migration** (`AddProfileColumns1788969600000`): adds `username` (varchar 30), `full_name` (varchar 100), `bio` (text), `avatar_url` (varchar 500), `profile_completed` (boolean, default false), and `last_seen_at` (timestamp, default now()) to the `users` table. Includes `CHECK` constraints for username length (3–30) and format (`^[a-zA-Z0-9_-]+$`), and a functional unique index `uq_users_username ON LOWER(username)` for case-insensitive uniqueness.
- **User entity** (`user.entity.ts`): updated with all profile columns matching the migration. All new columns are nullable (except `profile_completed` which defaults to false and `last_seen_at` which defaults to now).
- **Shared types** (`packages/types/user.types.ts`): `User` interface extended with `username?`, `fullName?`, `bio?`, `avatarUrl?`, `profileCompleted`, `lastSeenAt?`. New `UpdateProfileInput` request type and `ProfileResponse` type alias added.
- **Shared constants** (`packages/constants/validation.constants.ts`): `USERNAME_REGEX`, `USERNAME_MIN_LENGTH` (3), `USERNAME_MAX_LENGTH` (30), `FULL_NAME_MAX_LENGTH` (100), `BIO_MAX_LENGTH` (500), `AVATAR_URL_MAX_LENGTH` (500) added.
- **Shared error messages** (`packages/constants/error.constants.ts`): `USERNAME_REQUIRED`, `USERNAME_TAKEN`, `USERNAME_INVALID`, `USERNAME_TOO_SHORT`, `USERNAME_TOO_LONG`, `FULL_NAME_TOO_LONG`, `BIO_TOO_LONG`, `AVATAR_URL_TOO_LONG` added.
- **AuthService.toUserDto()**: extended to map all profile fields. Null entity values become `undefined` in the shared contract; `profileCompleted` is always present; `lastSeenAt` is ISO-stringified.
- **AuthModule**: exports `JwtAuthGuard`, `JwtStrategy`, and `AuthService` so the UsersModule can reuse them without circular dependencies.
- **UsersModule** (new): imports `TypeOrmModule.forFeature([User])` and `AuthModule`; owns `UsersController` and `UsersService`.
- **UsersService** (`users.service.ts`): `updateProfile(user, dto)` applies partial updates, enforces case-insensitive username uniqueness via `Raw` SQL (`LOWER()`), normalizes empty/whitespace-only optional fields to `null`, and sets `profileCompleted = Boolean(username && fullName)`. Handles DB unique-violation race condition (`23505`).
- **UsersController** (`users.controller.ts`):
  - `GET /users/me` → returns `ApiResponse<ProfileResponse>` with the authenticated user's profile (`JwtAuthGuard` protected).
  - `PATCH /users/me` → calls `UsersService.updateProfile()`, returns updated user via `AuthService.toUserDto()`.
- **UpdateProfileDto** (`dto/update-profile.dto.ts`): all-optional fields validated by `class-validator` using shared constants. Username enforces `@Matches(USERNAME_REGEX)`, `@MinLength(3)`, `@MaxLength(30)`.
- **AppModule**: `UsersModule` added to imports.
- **Tests**: 35/35 passing — `users.service.spec.ts` (7 tests: set fields, profileCompleted logic, own-username re-submit, case-insensitive conflict, 23505 race, normalize empty strings, rethrow non-unique), `users.controller.spec.ts` (2 tests: getMe envelope, updateMe delegation), `auth.service.spec.ts` login fixture updated with profile fields.

**Verification:**

```text
Executed 2026-09-08.

- npm run type-check:  PASS (all 5 workspaces)
- npm run lint:        PASS (backend + frontend)
- npm test:            PASS (5 suites / 35 tests)
- npm run format:check PASS
- migration:run:       PASS (AddProfileColumns1788969600000 applied;
                          username CHECK constraints, LOWER() unique index,
                          profile_completed, last_seen_at confirmed)
- Live endpoint tests: PASS
  - GET /users/me (valid JWT)            -> 200, profile with all fields
  - GET /users/me (no token)             -> 401
  - PATCH /users/me {username,fullName}  -> 200, profileCompleted=true
  - PATCH /users/me {bio}               -> 200, bio updated
  - PATCH /users/me {username} taken     -> 409 USERNAME_TAKEN
  - PATCH /users/me {username} invalid   -> 400 VALIDATION_ERROR
  - PATCH /users/me (own username)       -> 200 (no conflict)
  - Case-insensitive username conflict   -> 409 USERNAME_TAKEN
  - DB constraints:                      confirmed
    - username length CHECK enforced
    - username format CHECK enforced
    - LOWER() unique index enforced
    - profile_completed updates correctly
```

**Files Changed:**

```text
Modified:
apps/backend/src/app.module.ts                            (+ UsersModule import)
apps/backend/src/modules/auth/auth.module.ts              (+ exports for cross-module reuse)
apps/backend/src/modules/auth/auth.service.spec.ts        (+ profile fields in login fixture/assertions)
apps/backend/src/modules/auth/auth.service.ts             (+ profile fields in toUserDto)
apps/backend/src/modules/auth/entities/user.entity.ts     (+ 6 profile columns)
packages/constants/src/error.constants.ts                 (+ 8 profile error messages)
packages/constants/src/validation.constants.ts            (+ 6 profile validation constants)
packages/types/src/user.types.ts                          (+ profile fields, UpdateProfileInput, ProfileResponse)

Created:
apps/backend/src/database/migrations/1788969600000-AddProfileColumns.ts
apps/backend/src/modules/users/dto/update-profile.dto.ts
apps/backend/src/modules/users/users.controller.spec.ts
apps/backend/src/modules/users/users.controller.ts
apps/backend/src/modules/users/users.module.ts
apps/backend/src/modules/users/users.service.spec.ts
apps/backend/src/modules/users/users.service.ts
```

---

## Task 1.5 — Account Deletion

**Status:** Completed with note

**Date:** 2026-09-08

**Scope:**

* Account deletion behavior
* Authentication prevention after deletion
* Preservation of message history
* Referential integrity

**Implemented / Verified State:**

- **DELETE /users/me endpoint** (`users.controller.ts`): `JwtAuthGuard`-protected route accepting `{ password }` for explicit confirmation (features.md — "Deletion requires explicit confirmation"). Wrong password → `401 UNAUTHORIZED` (`PASSWORD_INCORRECT`); success → `200` with `{ message: "Account deleted" }`.
- **DeleteAccountDto** (`dto/delete-account.dto.ts`): `@IsString() @IsNotEmpty()` password validation via global `ValidationPipe`.
- **UsersService.deleteAccount(user, dto)** (`users.service.ts`): verifies the password with `bcrypt.compare`, then anonymizes per architecture.md §Account Deletion — sets `deleted_at = NOW()`, `is_active = false`, renames `username` to `deleted#{uuid}`, clears `full_name`/`bio`/`avatar_url` (to NULL) and `password_hash` (to `''`). The row is **not** removed; messages remain with their original `sender_id` (foreign-key integrity preserved).
- **Session invalidation**: because `is_active` is set to `false`, the existing `JwtStrategy.validate()` rejects the account on every subsequent request (401) — no token change needed. Login already rejects soft-deleted/inactive accounts (Task 1.3), so a deleted account cannot re-authenticate.
- **Username uniqueness after deletion**: `deleted#{uuid}` is 44 chars and contains `#`, so it is outside the valid username alphabet (`^[a-zA-Z0-9_-]+$`, max 30) and can never collide with a real handle; the `LOWER(username)` unique index keeps it case-insensitive. The previous handle is freed and claimable.
- **Shared types** (`packages/types/user.types.ts`): `DeleteAccountInput` (request body) and `DeleteAccountResponse` (`{ message }` payload) added.
- **Shared constants** (`packages/constants/error.constants.ts`): `PASSWORD_INCORRECT` and `ACCOUNT_DELETED` added.
- **Database migration** (`AllowAnonymizedUsername1788970200000`): the Task 1.5 spec requires storing `deleted#{uuid}` (44 chars, contains `#`), which the Task 1.4 `username` column (`varchar(30)`, CHECK 3–30 length, format `^[a-zA-Z0-9_-]+$`) could not accept — the correct-password DELETE originally failed with a DB constraint error (500). Per the product decision boundary (STOP → REPORT → ASK), this was surfaced and the maintainer approved widening + relaxing the constraints. The migration widens `username` to `varchar(64)` and replaces both CHECK constraints so the column accepts a normal username (3–30, `^[a-zA-Z0-9_-]+$`) **or** the reserved anonymized form `^deleted#[0-9a-f-]{36}$`. Input validation is unchanged: only `deleteAccount()` writes the anonymized handle; `UpdateProfileDto` still enforces the username regex/length.
- **User entity** (`user.entity.ts`): `username` column length updated `30` → `64` to match the migration.
- **Tests**: 38/38 passing — `users.service.spec.ts` (2 new: wrong password → 401 with no save, valid password → anonymized DB state + one save), `users.controller.spec.ts` (1 new: deleteMe delegation + envelope). Post-deletion login/session rejection is already covered by `auth.service.spec.ts` (soft-deleted/inactive) and the live endpoint tests; no-auth → 401 is a guard behavior verified live (no e2e harness exists in this repo).

**Verification:**

```text
Executed 2026-09-08.

- npm run type-check:  PASS (all 5 workspaces)
- npm run lint:        PASS (backend + frontend)
- npm test:            PASS (5 suites / 38 tests)
- npm run format:check PASS
- migration:run:       PASS (AddProfileColumns1788969600000 and
                          AllowAnonymizedUsername1788970200000 applied)
- Live endpoint tests: PASS
  - DELETE /users/me (wrong password)        -> 401 PASSWORD_INCORRECT
  - DELETE /users/me (correct password)      -> 200 { message: "Account deleted" }
  - DELETE /users/me (no auth)               -> 401
  - DELETE /users/me (empty body)            -> 400 VALIDATION_ERROR
  - DELETE /users/me (non-string password)   -> 400 VALIDATION_ERROR
  - DELETE /users/me (unknown field)         -> 400 VALIDATION_ERROR
  - POST /auth/login (after deletion)        -> 401 (Invalid email or password)
  - GET /auth/session (old token)            -> 401
  - GET  /users/me (old token)               -> 401
  - PATCH /users/me (old token)              -> 401
  - DB state after deletion:                 confirmed
      row preserved (not hard-deleted)
      deleted_at set, is_active=false
      username = "deleted#<uuid>" (44 chars)
      full_name / bio / avatar_url = NULL
      password_hash = "" (cleared)
  - Freed username re-claimable by new user  -> 200 (PATCH /users/me)
  - Normal username validation intact        -> 400 for "bad#name" and >30 chars
```

**Files Changed:**

```text
Modified:
apps/backend/src/modules/auth/entities/user.entity.ts     (username length 30 -> 64)
apps/backend/src/modules/users/users.controller.spec.ts   (+ deleteMe test)
apps/backend/src/modules/users/users.controller.ts        (+ DELETE /users/me)
apps/backend/src/modules/users/users.service.spec.ts      (+ deleteAccount tests)
apps/backend/src/modules/users/users.service.ts           (+ deleteAccount)
packages/constants/src/error.constants.ts                 (+ PASSWORD_INCORRECT, ACCOUNT_DELETED)
packages/types/src/user.types.ts                          (+ DeleteAccountInput, DeleteAccountResponse)

Created:
apps/backend/src/database/migrations/1788970200000-AllowAnonymizedUsername.ts
apps/backend/src/modules/users/dto/delete-account.dto.ts
```

**Note:** The username constraint adjustment recorded above is an approved schema change (maintainer decision) required to satisfy the Task 1.5 anonymization spec. No messages were touched; no `users` row was hard-deleted during implementation or verification.

---

# Phase 2 — Real-time Messaging

## Task 2.1 — Chat Foundation

**Status:** Completed

**Date:** 2026-09-09

**Scope:**

* One-to-one chat model (`chats` table)
* Two participants per chat
* Unique participant pair
* Participant-pair normalization
* Read-path query foundation

**Implemented / Verified State:**

- **Database migration** (`1788970600000-CreateChatsTable.ts`): creates the `chats` table exactly per `architecture.md` §Data Model — `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, `user_a uuid NOT NULL REFERENCES users(id)`, `user_b uuid NOT NULL REFERENCES users(id)`, `created_at`/`updated_at TIMESTAMP NOT NULL DEFAULT now()`, `CONSTRAINT uq_chats_user_a_user_b UNIQUE (user_a, user_b)`, `CONSTRAINT chk_chats_user_a_lt_user_b CHECK (user_a < user_b)`, `CONSTRAINT chk_chats_user_a_neq_user_b CHECK (user_a <> user_b)`, plus `idx_chats_user_a` and `idx_chats_user_b`.
- **Shared `Chat` type** (`packages/types/chat.types.ts`): `{ id, userA: User, userB: User, createdAt, updatedAt }` per architecture.md, exported from `packages/types/src/index.ts`. The `Message` type is intentionally NOT added (Task 2.2).
- **ChatEntity** (`modules/chats/entities/chat.entity.ts`): maps the `chats` table with scalar FK columns `userAId`/`userBId` (`user_a`/`user_b`) for the read path. The `User` relations needed for the full `Chat` shape are loaded in a later task (conversation list), not speculatively now.
- **Participant normalization helper** (`modules/chats/chat-participants.ts`): `normalizeParticipants(userA, userB)` swaps when `user1 > user2`, matching the stored `user_a < user_b` ordering (architecture.md — "Lookup normalizes pair before querying: IF user1 > user2 THEN swap").
- **ChatsService** (`modules/chats/chats.service.ts`): read-path only — `findByParticipants(userAId, userBId)` normalizes the pair and runs a single `findOne`. The service does NOT create chats and does NOT touch messages.
- **ChatsModule** (`modules/chats/chats.module.ts`): registers `ChatsService` and exports it for downstream tasks (message persistence, conversation list). Registered in `app.module.ts`; `Chat` added to the migration `data-source.ts` entities.
- **Tests**: 7 new, 45/45 total — `chat-participants.spec.ts` (4: order-kept, swapped, idempotent, UUID ids) and `chats.service.spec.ts` (3: normalized query shape, null when absent, (A,B) and (B,A) resolve to the same query).

**Chat creation trigger — deferred (approved):**

`docs/6-current-task.md` → Open Decisions flags the chat-creation trigger (explicit `POST /chats` / implicit on first message / from accepted contact) as an unresolved ambiguity requiring STOP → REPORT → ASK. The authorized Task 2.1 scope (data model + normalization + read-path repository) never creates a chat row, so the decision is not load-bearing for any deliverable here; the maintainer approved deferring it, to be resolved in the task that introduces an actual creation path (Task 2.4 or Phase 3 contact acceptance).

**Verification:**

```text
Executed 2026-09-09.

- npm run type-check:  PASS (all workspaces)
- npm run lint:        PASS (backend + frontend)
- npm test:            PASS (7 suites / 45 tests; 7 new for chats)
- npm run format:check PASS
- migration:run:       PASS (CreateChatsTable1788970600000 applied; 5 total)
- Live DB schema:      PASS — columns, FKs, UNIQUE, both CHECKs, both
                       indexes match architecture.md exactly
- Live DB behavior:    PASS
    reversed-pair insert  -> rejected by CHECK chk_chats_user_a_lt_user_b
    normalized insert     -> OK (user_a < user_b stored)
    duplicate pair        -> rejected by UNIQUE uq_chats_user_a_user_b
    lookup (A,B)          -> finds the row
    lookup (B,A)          -> finds the same stored row (none via reverse
                             ordering) — normalized lookup confirmed
    (disposable users/chats cleaned up afterward)
- Live backend:         PASS
    health GET /api/v1          -> 200 Email-Chat-Pro envelope
    POST /api/v1/auth/register  -> 201 (real DB write through the app)
    POST /api/v1/auth/login     -> 401 EMAIL_NOT_VERIFIED (expected:
                                   fresh accounts are unverified; no email
                                   transport in the stack)
    registered row confirmed in DB, then removed
    startup log: ChatsModule dependencies initialized + Nest started
```

**Files Changed:**

```text
Modified:
apps/backend/src/app.module.ts              (register ChatsModule)
apps/backend/src/database/data-source.ts    (entities + Chat)
packages/types/src/index.ts                 (+ export chat.types)

Created:
apps/backend/src/database/migrations/1788970600000-CreateChatsTable.ts
apps/backend/src/modules/chats/chat-participants.ts
apps/backend/src/modules/chats/chat-participants.spec.ts
apps/backend/src/modules/chats/chats.module.ts
apps/backend/src/modules/chats/chats.service.ts
apps/backend/src/modules/chats/chats.service.spec.ts
apps/backend/src/modules/chats/entities/chat.entity.ts
packages/types/src/chat.types.ts
```

**Note:** No messages, WebSocket, or frontend work was performed (Task 2.1 scope). Two environment notes from verification: (a) the port-5432 host conflict between the local Windows `postgresql-x64-18` service and the Docker `email-chat-pro-db` container recurred and was re-resolved by stopping the Windows service; (b) this Bash session exports `PORT=20128` (an occupied port), which shadows the project port when running `node dist/main.js` — the server must be started with `PORT=4000` explicitly. Neither is a product issue.

---

## Task 2.2 — Message Persistence

**Status:** Not Started

**Scope:**

* Text messages
* Message persistence
* Message ownership
* Message history

**Verification:**

```text
Not Started
```

---

## Task 2.3 — Real-time Messaging

**Status:** Not Started

**Scope:**

* Socket.IO connection
* Authorized chat rooms
* Real-time message delivery
* Shared WebSocket event contracts

**Verification:**

```text
Not Started
```

---

## Task 2.4 — Conversation List

**Status:** Not Started

**Scope:**

* Conversation retrieval
* Conversation ordering
* Basic conversation information

**Verification:**

```text
Not Started
```

---

# Phase 3 — Contacts and Search

## Task 3.1 — User Search

**Status:** Not Started

**Scope:**

* Search users
* Username search
* Email search
* Search result contracts

**Verification:**

```text
Not Started
```

---

## Task 3.2 — Contact Requests

**Status:** Not Started

**Scope:**

* Send contact request
* Accept request
* Decline request
* Pending requests
* Duplicate request prevention
* Self-request prevention

**Verification:**

```text
Not Started
```

---

## Task 3.3 — Contact List

**Status:** Not Started

**Scope:**

* Accepted contacts
* Contact retrieval
* Contact-based messaging authorization

**Verification:**

```text
Not Started
```

---

# Phase 4 — Media, Polish, and Deployment

## Task 4.1 — Image Messages

**Status:** Not Started

**Scope:**

* Image message support
* Cloudinary integration
* Image validation
* Image message contracts

**Verification:**

```text
Not Started
```

---

## Task 4.2 — Video Messages

**Status:** Not Started

**Scope:**

* Video message support
* Cloudinary integration
* Video validation
* Video message contracts

**Verification:**

```text
Not Started
```

---

## Task 4.3 — Internationalization

**Status:** Not Started

**Scope:**

* Persian
* English
* i18next integration
* RTL/LTR handling

**Verification:**

```text
Not Started
```

---

## Task 4.4 — Presence

**Status:** Not Started

**Scope:**

* User presence
* Last seen
* Online/offline state

**Verification:**

```text
Not Started
```

---

## Task 4.5 — Rate Limiting and Security Hardening

**Status:** Not Started

**Scope:**

* Rate limiting
* Security configuration
* Request protection
* Relevant validation

**Verification:**

```text
Not Started
```

---

## Task 4.6 — Structured Logging and Error Monitoring Foundation

**Status:** Not Started

**Scope:**

* Winston structured logging
* Backend error logging
* Safe error information
* Monitoring foundation

**Verification:**

```text
Not Started
```

---

## Task 4.7 — Performance Optimization

**Status:** Not Started

**Scope:**

* Database performance
* Query optimization
* Frontend performance
* Measured performance improvements

**Verification:**

```text
Not Started
```

---

## Task 4.8 — Deployment Preparation

**Status:** Not Started

**Scope:**

* Production configuration
* Deployment preparation
* Environment configuration
* Production build verification

**Verification:**

```text
Not Started
```

---

# Out-of-Scope Work

The following items MUST NOT be added to this file as completed work unless the product scope is explicitly changed:

* Group chats
* Channels
* Message editing
* Message deletion
* Read receipts
* Unread counters
* Typing indicators
* Voice calls
* Video calls
* Password reset
* OAuth
* Blocking
* Muting
* Reactions
* Rich text messaging
* Arbitrary file sharing
* End-to-end encryption
* Payments
* Subscriptions
* Social integrations
* Admin/moderation system
* Distributed Redis
* Message brokers
* WebSocket clustering
* Kubernetes
* Spanish localization

---

# Verification Record

For each completed task, record the actual verification performed.

Example:

```text
Task: 0.1
Date: YYYY-MM-DD

Checks:
- npm install: PASS
- TypeScript: PASS
- ESLint: PASS
- Tests: PASS
- Build: PASS
- Docker Compose: PASS

Unauthorized scope changes:
- None
```

Do not claim a check passed unless it was actually executed successfully.

## Recorded Verifications

```text
Task: 0.1
Date: 2026-09-06

Environment:
- Node.js v24.17.0
- npm 11.13.0
- Docker 29.5.3

Checks:
- npm install:        PASS (up to date, 860 packages audited)
- npm run type-check: PASS
- npm run lint:       PASS
- npm test:           PASS (backend jest, 1 suite / 1 test)
- npm run build:      PASS (nest build + next build)
- npm run format:     EXECUTED (36 files reformatted)
- npm run format:check: PASS (after format)
- docker compose config: PASS
- docker compose ps:  PASS (email-chat-pro-db Up, healthy, 5432)
- psql connectivity:  PASS (PostgreSQL 16.15 / email_chat_pro / email_chat_dev)
- Backend runtime:    PASS (GET http://127.0.0.1:4000/api/v1 → 200)
- Frontend runtime:   PASS (GET http://127.0.0.1:3000 → 200)

Unauthorized scope changes:
- None
```

```text
Task: 1.1
Date: 2026-09-07

Environment:
- Node.js v24.17.0
- npm 11.13.0
- Docker 29.5.3
- PostgreSQL 16 (email-chat-pro-db container)

Checks:
- npm run type-check:  PASS (types, constants, utils, backend, frontend)
- npm run lint:        PASS (backend + frontend)
- npm test:            PASS (3 suites / 9 tests)
- npm run build:apps:  PARTIAL (backend PASS; frontend FAILED — see Known Issues)
- migration:run:       PASS (users table created)
- Endpoint live tests: PASS (201 valid, 409 duplicate, 400 invalid email,
                       400 weak password, 201 uppercase-email normalization)
- DB persistence:      PASS (lowercase email, bcrypt hash, is_verified=false)

Unauthorized scope changes:
- None
```

```text
Task: 1.2
Date: 2026-09-07

Environment:
- Node.js v24.17.0
- npm 11.13.0
- Docker 29.5.3
- PostgreSQL 16 (email-chat-pro-db container, port 5432)

Checks:
- npm run type-check:  PASS (types, constants, utils, backend, frontend)
- npm run lint:        PASS (backend + frontend)
- npm test:            PASS (3 suites / 16 tests)
- npm run build:apps:  PARTIAL (backend PASS; frontend FAILED — see Known Issues, unchanged from Task 1.1)
- npm run format:check PASS
- migration:run:       PASS (AddVerificationColumns1788883200000 applied; columns verified via information_schema)
- Endpoint live tests: PASS (201 register; token stored hashed + ~24h expiry;
                       200 valid verify; 400 already-used; 400 unknown;
                       400 expired; 400 malformed; 400 missing token; DB
                       state after success verified)
- DB persistence:      PASS (is_verified flips true on success; verified_at set;
                       hash + expiry cleared; all confirmed at rest)

Unauthorized scope changes:
- None
```

```text
Task: 1.3
Date: 2026-09-07

Environment:
- Node.js v24.17.0
- npm 11.13.0
- Docker 29.5.3
- PostgreSQL 16 (email-chat-pro-db container, port 5432)

Checks:
- npm run type-check:  PASS (types, constants, utils, backend, frontend)
- npm run lint:        PASS (backend + frontend)
- npm test:            PASS (3 suites / 26 tests)
- npm run format:check PASS
- migration:run:       PASS (no new migrations)
- Live endpoint tests: PASS (12/12 checks: register x2, SQL seed,
                       login wrong-password 401, login unverified 401,
                       login valid 200 + token + cookie, session Bearer 200,
                       session cookie 200, session no-token 401,
                       session invalid-token 401, logout 200 + clear cookie,
                       post-logout 401)

Unauthorized scope changes:
- None
```

```text
Task: 1.4
Date: 2026-09-08

Environment:
- Node.js v24.17.0
- npm 11.13.0
- Docker 29.5.3
- PostgreSQL 16 (email-chat-pro-db container, port 5432)

Checks:
- npm run type-check:  PASS (types, constants, utils, backend, frontend)
- npm run lint:        PASS (backend + frontend)
- npm test:            PASS (5 suites / 35 tests)
- npm run format:check PASS
- migration:run:       PASS (AddProfileColumns1788969600000 applied;
                       username CHECK constraints, LOWER() unique index,
                       profile_completed, last_seen_at confirmed)
- Live endpoint tests: PASS (GET /users/me 200; GET /users/me no-token 401;
                       PATCH /users/me 200; PATCH username taken 409;
                       PATCH username invalid 400; own username re-submit 200;
                       case-insensitive conflict 409; DB constraints confirmed)

Unauthorized scope changes:
- None
```

---

# Known Issues

Document known issues that remain after a task.

Each issue should contain:

```text
Issue:
Impact:
Discovered During:
Current Status:
Next Action:
```

Do not hide known failures.

## Open Issues After Task 0.1

```text
Issue: npm audit reports 2 vulnerabilities (1 moderate, 1 high) in the
       installed transitive dependency tree.
Impact: Non-blocking for Phase 0. No verification command failed.
Discovered During: Task 0.1 dependency installation.
Current Status: Not remediated. Fixing requires dependency changes that are
       outside the authorized scope of Task 0.1.
Next Action: Awaiting a decision on whether to run `npm audit` review and
       apply updates as a separate authorized task.
```

```text
Issue: Environment variable naming differs between docs/4-stack.md and
       apps/backend/.env.example. stack.md lists JWT_EXPIRATION,
       CLOUDINARY_NAME; the example file uses JWT_EXPIRES_IN,
       CLOUDINARY_CLOUD_NAME. docs/6-current-task.md lists JWT_EXPIRES_IN.
Impact: None in Phase 0 — these values are unused placeholders. Would matter
       in Phase 1 (JWT) and Phase 4 (Cloudinary).
Discovered During: Task 0.1 environment configuration inspection.
Current Status: Not changed. Variable names may be adjusted only through an
       explicit project decision (stack.md §25).
Next Action: Confirm the canonical variable names before Phase 1 begins.
```

```text
Issue: apps/backend/.env.example sets DATABASE_URL with host `localhost`,
       while the code default in src/config/database.config.ts uses
       127.0.0.1 (documented there as deliberate, to avoid IPv6 ::1).
Impact: None observed — the backend connected successfully to PostgreSQL.
       A developer copying .env.example could hit an IPv6 resolution issue
       on some systems.
Discovered During: Task 0.1 configuration inspection.
Current Status: Left as-is. Not part of the authorized scope.
Next Action: Optional alignment of the example file, if approved.
```

```text
Issue: A stale `next start` process from an earlier session was holding
       port 3000, causing one frontend start attempt to fail with
       EADDRINUSE.
Impact: Local environment only. The process was terminated and the frontend
       then started and served successfully on port 3000.
Discovered During: Task 0.1 runtime verification.
Current Status: Resolved. No project configuration or port was changed.
Next Action: None.
```

```text
Issue: Only the backend has a test script. Frontend and shared packages have
       no configured test runner.
Impact: `npm test` exercises backend tests only.
Discovered During: Task 0.1 verification.
Current Status: Expected for Phase 0. No test tooling was added, since
       inventing scripts for uninstalled tools is not authorized.
Next Action: Decide test tooling for the frontend and shared packages when a
       later task requires it.
```

## Open Issues After Task 1.1

```text
Issue: The frontend production build fails during static-page generation with
       "Error: <Html> should not be imported outside of pages/_document" while
       prerendering /404 and /_error (Next.js build worker exits code 1). The
       reference originates in Next.js internal chunk 383.js, not in any Task
       1.1 change; the frontend source is untouched and no next-related
       dependency changed.
Impact: `npm run build:apps` is only PARTIALLY passing (backend builds;
       frontend fails). It blocks nothing in the backend-only Task 1.1, but a
       deployable frontend build is not currently achievable.
Discovered During: Task 1.1 verification (`npm run build:apps`), reproduced
       deterministically in isolation.
Current Status: Not remediated. Fixing requires Next.js/frontend-environment
       investigation that is outside the authorized scope of Task 1.1.
Next Action: Investigate the Next.js version/build-environment issue as a
       separate authorized task.
```

```text
Issue: During Task 1.1 verification, the local environment had two PostgreSQL
       instances contending for port 5432: a local Windows PostgreSQL service
       (postgresql-x64-18, postgres.exe) and the Docker container
       email-chat-pro-db. Host TCP connections reached the local service, which
       did not accept the documented credentials.
Impact: Migration and runtime connection initially failed with "password
       authentication failed for user email_chat_dev" (28P01).
Discovered During: Task 1.1 verification (migration run / endpoint tests).
Current Status: Resolved by an approved intervention — the local PostgreSQL
       service was stopped (service left Stopped; its data remains on disk) and
       the Docker email_chat_dev password was reset via the container trust
       socket to match apps/backend/.env. Docker's postgres now answers on 5432
       and the app connects successfully.
Next Action: If the local PostgreSQL service is needed later, restart it and
       ensure only one instance owns port 5432 (e.g., re-map one of them).
```

```text
Issue: The default DATABASE_URL fallback in apps/backend/src/database/
       data-source.ts and the compose default use the placeholder password
       "email_chat_dev_password", while apps/backend/.env (git-ignored, real)
       holds a different 23-character password. The migration CLI does not load
       .env, so `npm run migration:run` silently falls back to the placeholder
       and fails unless DATABASE_URL is exported from .env.
Impact: Running migrations requires the developer to export DATABASE_URL (or
       load .env); otherwise the command fails against a real dev DB.
Discovered During: Task 1.1 verification.
Current Status: Not changed in code (out of Task 1.1 scope). The migration was
       run with DATABASE_URL exported from .env.
Next Action: Optional — load .env in the migration flow, or document the export
       step, if approved.
```

## Open Issues After Task 1.2

```text
Issue: There is no email transport in the approved stack (stack.md defines
       none; overview-project.md excludes email notifications). A verification
       token is generated and its hash stored at registration, but with no
       email channel the plaintext token cannot be delivered to the user, so
       the verification flow is not usable end-to-end by a real user yet.
       Task 1.1's register response intentionally does not claim an email was
       sent; the approved Task 1.2 decision was token generation at
       registration only, with no email sending in this task.
Impact: Authentication blocking on is_verified cannot be exercised by real
       users until a delivery channel exists. Backend behavior, shared
       contracts, and the verify-email endpoint are complete and verified.
Discovered During: Task 1.2 live verification (no way to obtain the token
       except directly from the database or a seeded hash).
Current Status: Known limitation, per the approved Task 1.2 scope.
Next Action: Decide the email-delivery mechanism (library + provider) as a
       separate authorized change before the account lifecycle is exposed to
       real users.
```

```text
Issue: "Users can request another verification email" is an acceptance
       criterion of the Email Verification feature in features.md, but no
       resend/regenerate endpoint was authorized or implemented in Task 1.2.
Impact: A user who loses or expires their token has no self-service path
       (short of re-registering). Not blocking for Task 1.2.
Discovered During: Task 1.2 scope review.
Current Status: Deferred by the approved Task 1.2 decision (verify-email
       endpoint only; no resend).
Next Action: Implement a resend-verification endpoint in a later authorized
       task if approved.
```

```text
Issue: In the verify-email request-validation error path, the global
       HttpExceptionFilter joins multiple class-validator messages with ", "
       (e.g. a missing token returns "Verification token is invalid or
       expired, Verification token is required").
Impact: Cosmetic only. Status/code are correct (400 VALIDATION_ERROR); the
       combined message is slightly awkward. Pre-existing filter behavior,
       surfaced here for the first time by a DTO with two decorators.
Discovered During: Task 1.2 live verification (missing-token case).
Current Status: Not changed — the filter is outside the Task 1.2 scope.
Next Action: If approved, refine the filter to return the first (or primary)
       validation message.
```

Do not silently remove or rewrite an issue simply because it is inconvenient.

## Open Issues After Task 1.3

```text
Issue: @nestjs/jwt v12.0.1 is an ESM-only package (its package.json declares
       "type": "module"). The test runner (ts-jest) runs in CommonJS mode and
       cannot `require()` the real module at import time, producing
       "ERR_REQUIRE_ESM" at runtime.
Impact: All unit specs that import from @nestjs/jwt (auth.service.spec.ts,
       auth.controller.spec.ts) must include `jest.mock('@nestjs/jwt', ...)` at
       the top of the file to sidestep the ESM import. This mock is minimal
       (stubs JwtService as an empty class) and does not affect production builds
       (NestJS compiles to CJS in dist/ and Node 24's require(esm) handles it).
Discovered During: Task 1.3 test execution — tests failed with
       "Cannot use import statement outside a module" until the mock was added.
Current Status: Mitigated via module-level jest.mock() in affected spec files.
       Not a production issue.
Next Action: Monitor for a CJS-compatible @nestjs/jwt release, or if upgrading
       to a future NestJS version that bundles a compatible JWT module.
```

```text
Issue: The frontend production build continues to fail (carried from Task 1.1).
       The error originates in Next.js internal chunks during static-page
       generation, not in any Task 1.3 change.
Impact: `npm run build:apps` remains PARTIALLY passing (backend PASS,
       frontend FAIL). Backend tests and endpoints are unaffected.
Discovered During: Task 1.1; unchanged in Task 1.3.
Current Status: Known, not remediated. Outside Task 1.3 scope.
Next Action: Investigate as a separate authorized task.
```

```text
Issue: Logout is stateless-JWT logout: it clears the httpOnly cookie client-side
       by issuing an expired Set-Cookie (verified: `auth_token=; Expires=Thu,
       01 Jan 1970`), but the JWT itself remains cryptographically valid until
       normal expiration (~30d default). A client that retains the old token
       value and re-sends it manually is still accepted by the protected
       endpoint. There is no server-side token-invalidation store (Redis/sessions
       are not in the approved architecture).
Impact: Browsers honoring the clear cookie are logged out correctly (post-logout
       session with the cleared cookie returns 401 — verified live). The
       limitation only applies to a client that deliberately or accidentally
       replays a captured token. Consistent with the approved stateless-JWT
       architecture; no unauthorized fix was applied.
Discovered During: Task 1.3 live verification (post-logout replay check).
Current Status: Expected behavior of the approved architecture. Documented as a
       known limitation rather than "fixed" with unapproved infrastructure.
Next Action: Revisit only if an explicit rejection requirement for replayed
       tokens is added to the project scope.
```

---

# Architecture Changes

If an approved architecture change occurs, record:

```text
Change:
Reason:
Approved By:
Affected Files:
Affected Documentation:
Verification:
```

Architecture changes MUST NOT be recorded as normal implementation changes.

---

# Context Changes

If any of the following files are intentionally changed:

```text
overview-project.md
features.md
architecture.md
stack.md
rules.md
current-task.md
done.md
CLAUDE.md
```

record the change when it materially affects project behavior, scope, architecture, or development rules.

Example:

```text
Context Change:
File:
Change:
Reason:
Approved By:
```

## Recorded Context Changes

```text
Context Change: Markdown formatting only.
File: CLAUDE.md
Change: Prettier normalized unordered-list markers from `*` to `-`
       (208 lines) and added a trailing newline. No wording, rule, or
       instruction was altered.
Reason: `npm run format` applies the repository Prettier configuration
       repo-wide; CLAUDE.md is not listed in .prettierignore (docs/ is).
Approved By: Mohammad Mehdi (formatting step explicitly requested during
       Task 0.1).
```

```text
Context Change: Task 0.1 record completed.
File: docs/7-done.md
Change: Task 0.1 status moved from Pending to "Completed with Known Issues",
       with actual verification results, changed-file list, verification
       record, and open issues.
Reason: Required by the Task 0.1 completion workflow.
Approved By: Mohammad Mehdi.
```

```text
Context Change: Task 2.1 record completed.
File: docs/7-done.md
Change: Task 2.1 status moved from Not Started to "Completed", with the chats
       data model, normalization helper, read-path repository, the approved
       chat-creation-trigger deferral, actual verification results (static
       checks, migration, live DB invariants, live backend), and changed-file
       list.
Reason: Required by the Task 2.1 completion workflow.
Approved By: Mohammad Mehdi (Task 2.1 authorised; chat-creation deferral
       approved 2026-09-09).
```

```text
Context Change: Execution boundary advanced to Task 2.2 placeholder.
File: docs/6-current-task.md
Change: Replaced the Task 2.1 (Chat Foundation) execution boundary with the
       statement that Task 2.1 is completed and verified (docs/7-done.md),
       naming the next task (Task 2.2 — Message Persistence) WITHOUT defining
       its scope, and marking the file as a placeholder pending maintainer
       approval. Task 2.2 is not started.
Reason: Task 2.1 completed and verified (recorded in done.md); the normal
       lifecycle requires current-task.md to describe the next approved task,
       but Task 2.2 scope is not yet approved so it is only named.
Approved By: Mohammad Mehdi.
```

```text
Context Change: Execution boundary advanced to Task 1.5.
File: docs/6-current-task.md
Change: Replaced the Task 1.3 (Login and Logout) execution boundary with the
       Task 1.5 (Account Deletion) execution boundary — authorized scope,
       explicitly not-authorized items, and verification requirements. Task 1.4
       (User Profile) is recorded as completed in done.md.
Reason: Task 1.4 completed and verified (recorded in done.md); the normal
       lifecycle requires current-task.md to describe the next approved task.
Approved By: Mohammad Mehdi.
```

```text
Context Change: Execution boundary advanced to Task 1.2.
File: docs/6-current-task.md
Change: Replaced the stale Phase 0 task definition with the Task 1.2 (Email
       Verification) execution boundary — authorized scope, explicitly
       not-authorized items, and verification requirements. It encodes the
       approved decisions: token generation at registration only, verify-email
       endpoint only (no resend endpoint, no email transport), 24-hour token
       expiration, and no access-restriction guard until JWT/protected routes
       exist (Task 1.3).
Reason: Task 1.1 completed and verified (recorded above); the normal lifecycle
       requires current-task.md to describe the next approved task. The user
       approved this update (AskUserQuestion, 2026-09-07) before Task 1.2 was
       implemented.
Approved By: Mohammad Mehdi.
```

---

# Completion Discipline

When a task reaches completion:

1. Verify the implementation.
2. Review the changed files.
3. Confirm the task stayed within `current-task.md`.
4. Record the result here.
5. Record known issues.
6. Update the task status.
7. Update `current-task.md` for the next approved task.
8. Stop.

Claude Code MUST NOT automatically begin the next task.

---

# Golden Rule

> `done.md` records what was actually completed, not what was intended to be completed.

Never mark work as done based on assumptions.

Never mark a task as verified without running the relevant checks.

Never hide known issues.

Never record unauthorized work as completed.
