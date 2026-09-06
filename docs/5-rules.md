# Email-Chat-Pro — Code and Development Rules

## 1. Purpose

This file defines how code must be written, changed, tested, reviewed, and committed in Email-Chat-Pro.

It answers:

> **HOW should the project be developed?**

This file does not define:

* product scope,
* feature requirements,
* system architecture,
* technology selection,
* or the current implementation task.

Those responsibilities belong to the other context files.

---

# 2. Context File Authority

The project uses these context files:

1. `overview-project.md` — What and why
2. `features.md` — What to build
3. `architecture.md` — How the system is structured
4. `stack.md` — Which technologies to use
5. `rules.md` — How to write and manage code
6. `current-task.md` — What is allowed right now
7. `done.md` — What has already been completed

The authority order is:

```text
overview-project.md
        ↓
features.md
        ↓
architecture.md
        ↓
stack.md
        ↓
rules.md
        ↓
current-task.md
        ↓
done.md
```

However, `current-task.md` is the **execution boundary**.

A feature may exist in `features.md` but must not be implemented unless the current task authorizes it.

---

# 3. Fundamental Development Rule

Before changing code, Claude Code must:

```text
READ
  ↓
UNDERSTAND
  ↓
CHECK FEATURES
  ↓
CHECK ARCHITECTURE
  ↓
CHECK STACK
  ↓
CHECK RULES
  ↓
CHECK CURRENT TASK
  ↓
INSPECT EXISTING REPOSITORY
  ↓
PLAN
  ↓
IMPLEMENT ONLY AUTHORIZED WORK
  ↓
VERIFY
  ↓
REPORT
```

If something is unclear:

```text
STOP
  ↓
Explain the ambiguity
  ↓
Ask for clarification
```

Do not guess.

---

# 4. No Autonomous Product Decisions

Claude Code must not independently decide:

* new features,
* new user flows,
* new database entities,
* new APIs,
* new infrastructure,
* new libraries,
* new architecture patterns,
* new authentication mechanisms,
* new scalability infrastructure.

If a technical problem requires a decision not covered by the context files:

```text
STOP → REPORT → ASK
```

Do not silently make the decision.

---

# 5. Current Task Is the Execution Boundary

`current-task.md` defines what Claude Code is allowed to modify.

For every task:

1. Read `current-task.md`.
2. Identify the authorized phase.
3. Identify the authorized feature/task.
4. Inspect the existing repository.
5. Implement only that scope.

Example:

If the current task is:

```text
Create the authentication module structure.
```

Claude Code must not additionally implement:

* contact requests,
* chat messaging,
* Cloudinary,
* presence,
* message history,
* unrelated UI components.

Even if those features already exist in `features.md`.

---

# 6. Inspect Before Creating

Never assume the repository is empty.

Before creating files or folders:

```text
Inspect repository
        ↓
Check existing files
        ↓
Check package.json
        ↓
Check workspace configuration
        ↓
Check tsconfig files
        ↓
Check existing modules
        ↓
Then create only what is missing
```

Never blindly run project generators against an existing project.

Do not run commands such as:

```text
npm create next-app
nest new
```

if the corresponding application already exists.

Do not reinitialize the project.

Do not delete and recreate an existing application to simplify implementation.

---

# 7. No Speculative Code

Do not create code "for later".

Examples of prohibited speculative work:

* unused services,
* unused entities,
* unused DTOs,
* future APIs,
* placeholder modules,
* unused database tables,
* unnecessary abstractions,
* unused dependencies,
* infrastructure for future scaling.

Implement what the current task requires.

---

# 8. Minimal Change Principle

Prefer the smallest correct change that satisfies the task.

When modifying an existing system:

* preserve working behavior,
* avoid unrelated refactoring,
* avoid unnecessary renaming,
* avoid unnecessary file movement,
* avoid rewriting working modules,
* avoid changing dependencies without reason.

A task should not become a general code cleanup project.

---

# 9. Naming Conventions

## Files — Backend

Use descriptive kebab-case filenames where appropriate:

```text
auth.controller.ts
auth.service.ts
auth.module.ts
user.entity.ts
message.entity.ts
create-user.dto.ts
update-user.dto.ts
auth.guard.ts
message.gateway.ts
```

---

## Files — Frontend

React components use PascalCase:

```text
LoginForm.tsx
RegisterForm.tsx
ChatWindow.tsx
MessageItem.tsx
```

Hooks:

```text
useAuth.ts
useChat.ts
useMessageHistory.ts
useContactRequests.ts
```

Services:

```text
auth.service.ts
chat.service.ts
user.service.ts
```

---

## Shared Packages

Types:

```text
auth.types.ts
user.types.ts
message.types.ts
chat.types.ts
```

Constants:

```text
auth.constants.ts
error.constants.ts
message.constants.ts
```

Utilities:

```text
validation.utils.ts
formatting.utils.ts
error.utils.ts
```

---

# 10. Folder Naming

Directories use kebab-case.

Correct:

```text
auth
user-profile
chat-messages
contact-requests
shared-utils
```

Avoid:

```text
UserProfile
user_profile
ChatMessages
```

Existing repository conventions should be preserved when they are already established and valid.

---

# 11. Classes, Types, and Interfaces

Use PascalCase.

Examples:

```text
AuthService
UserProfile
MessagePayload
LoginRequest
ContactRequest
```

Avoid unnecessary suffixes:

```text
UserModel
UserInterface
UserImplementation
```

Use names that describe the actual concept.

---

# 12. Functions and Methods

Use camelCase.

Examples:

```text
sendMessage()
getUserById()
validateEmail()
createContactRequest()
completeProfile()
```

Names must be descriptive.

Avoid unnecessary abbreviations:

```text
getMsg()
getUsr()
procReq()
```

Prefer:

```text
getMessage()
getUser()
processRequest()
```

---

# 13. Variables

Use camelCase.

Examples:

```text
userEmail
messageCount
isLoading
currentUser
contactRequest
```

Boolean variables should normally communicate their boolean meaning:

```text
isAuthenticated
isVerified
hasMessages
canMessage
shouldRefetch
```

Avoid single-letter variables except where the meaning is genuinely obvious, such as simple loop indexes.

---

# 14. Constants

Use `UPPER_SNAKE_CASE` for true constants.

Examples:

```text
MAX_MESSAGE_LENGTH
API_TIMEOUT
JWT_EXPIRATION
DEFAULT_PAGE_SIZE
```

Do not convert every variable into uppercase merely because it does not change.

---

# 15. TypeScript Rules

TypeScript strict mode is required.

Expected configuration includes:

```json
{
  "strict": true
}
```

The project should also enable appropriate strict checks such as:

```text
noImplicitAny
strictNullChecks
strictFunctionTypes
strictBindCallApply
strictPropertyInitialization
noImplicitThis
noUnusedLocals
noUnusedParameters
noImplicitReturns
noFallthroughCasesInSwitch
```

---

# 16. No `any`

Do not use `any` unless there is an explicitly approved exceptional reason.

Wrong:

```text
const data: any = response.data
```

Prefer:

```text
const data: unknown = response.data
```

Then narrow the type safely.

Avoid using type assertions merely to silence TypeScript errors.

Wrong:

```text
const user = response.data as User
```

when the response has not actually been validated.

---

# 17. Types vs Interfaces

Use interfaces for object contracts where appropriate:

```text
interface UserProfile {
  id: string
  username: string
  fullName: string
}
```

Use type aliases for:

* unions,
* tuples,
* mapped types,
* conditional types,
* complex compositions.

Example:

```text
type MessageType = 'text' | 'image' | 'video'
```

Do not duplicate the same shared contract in multiple applications.

---

# 18. Shared Types

Shared API contracts belong in:

```text
packages/types
```

When a type is shared between frontend and backend:

```text
Frontend
    ↓
packages/types
    ↑
Backend
```

Do not independently redefine the same API contract in both applications.

If the contract changes, update the shared source of truth first.

---

# 19. Import Rules

Organize imports consistently.

Preferred order:

```text
1. External libraries

2. Shared packages

3. Application/local modules

4. Relative utilities/helpers
```

Example:

```text
import { useQuery } from '@tanstack/react-query'

import { User } from '@/packages/types'
import { ERROR_CODES } from '@/packages/constants'

import { AuthService } from '../services/auth.service'
import { Header } from '../components/Header'

import { formatUserName } from '../utils/formatting'
```

Avoid wildcard imports when named imports are available.

---

# 20. Formatting

Project formatting is handled by the repository's formatter configuration.

General expectations:

* 2-space indentation,
* no tabs,
* consistent quote style,
* consistent trailing commas,
* readable line lengths,
* no manually conflicting formatting rules.

Do not fight the project's Prettier configuration.

If Prettier is configured differently from an example in this file, the actual repository configuration takes precedence.

---

# 21. Comments

Write comments only when they explain something that is not obvious from the code.

Good:

```text
// Preserve the message record because deleted accounts must not
// remove historical conversation data.
```

Bad:

```text
// Get user
const user = await getUser()
```

Do not write comments that merely restate the code.

---

# 22. Business Logic

Business logic belongs in the appropriate backend service/domain layer.

Controllers should primarily handle:

* request routing,
* input coordination,
* authentication/authorization boundaries,
* response coordination.

Controllers should not become large business-logic containers.

Avoid:

```text
Controller
  ├── database queries
  ├── business rules
  ├── authorization logic
  ├── transformations
  └── external service logic
```

Prefer:

```text
Controller
    ↓
Service
    ↓
Persistence / External Service
```

---

# 23. Frontend Responsibilities

Frontend code is responsible for:

* presentation,
* user interaction,
* client-side validation,
* client/application state,
* server-state consumption,
* API communication,
* WebSocket event handling,
* internationalized UI.

Frontend must not become the authoritative source of backend business rules.

Client-side validation improves UX.

Backend validation protects the system.

---

# 24. Backend Authority

The backend is authoritative for:

* authentication,
* authorization,
* business rules,
* data validation,
* messaging permissions,
* contact relationships,
* persistence,
* data integrity.

Never trust the frontend for authorization decisions.

For example:

```text
Frontend says:
"I am allowed to send this message."

Backend must still verify:
"Is this user actually authorized to message this chat?"
```

---

# 25. Error Handling

Errors must be handled intentionally.

Do not silently swallow errors.

Avoid:

```text
try {
  ...
} catch {
}
```

If an error is caught, the code must either:

* handle it,
* transform it,
* log it appropriately,
* return an appropriate response,
* or rethrow it.

Do not catch errors merely to satisfy a rule.

---

# 26. Backend Error Handling

Backend errors should use the project's standardized error architecture.

Use appropriate NestJS exceptions and shared error codes.

Error responses must remain consistent with the contract defined by the architecture and shared types.

Do not expose:

* passwords,
* secrets,
* internal credentials,
* stack traces,
* sensitive database details,

to clients.

---

# 27. Frontend Error Handling

Frontend API failures should produce a useful user-facing result.

Use the project's notification/error mechanism where appropriate.

Do not display raw internal errors to users.

Avoid code such as:

```text
toast.error(error.message)
```

when `error` is `unknown` or when the raw message may expose internal details.

First normalize the error into a safe application-level message.

---

# 28. Logging

Do not use `console.log`, `console.error`, or `console.warn` as permanent application logging.

Backend:

```text
Winston
```

Frontend:

Use appropriate development logging only when necessary and remove debugging logs before committing.

Never log:

* passwords,
* JWT secrets,
* API secrets,
* authorization tokens,
* sensitive credentials.

---

# 29. Database Naming

Database tables use plural snake_case:

```text
users
chats
contact_requests
messages
```

Columns use snake_case:

```text
user_id
chat_id
created_at
updated_at
deleted_at
```

Foreign keys use:

```text
{related_table_singular}_id
```

Examples:

```text
user_id
chat_id
sender_id
receiver_id
```

Follow the database design defined in `architecture.md`.

---

# 30. Database Integrity

Do not rely only on application code for data integrity.

Use appropriate PostgreSQL constraints:

* `NOT NULL`,
* `UNIQUE`,
* `CHECK`,
* foreign keys,
* appropriate indexes.

Business logic and database constraints should complement each other.

---

# 31. Database Access

Database operations belong in the backend persistence layer.

Do not access PostgreSQL directly from frontend code.

Do not put arbitrary database queries inside controllers.

Use TypeORM according to the architecture and existing project patterns.

---

# 32. Transactions

Use database transactions when multiple related database operations must succeed or fail together.

Examples include operations where partial persistence would violate a business invariant.

Do not introduce transactions unnecessarily for every query.

---

# 33. N+1 Queries

Avoid N+1 query patterns.

Before implementing relationship loading:

1. Understand the required data.
2. Check the existing query strategy.
3. Use an appropriate TypeORM relation/query approach.
4. Verify generated behavior where performance matters.

Do not automatically eager-load every relationship.

Only load what the operation requires.

---

# 34. Soft Deletion and Account Deletion

Account deletion follows the behavior defined in `architecture.md`.

When an account is deleted:

* authentication must no longer succeed,
* profile information must no longer appear as an active profile,
* historical messages must remain,
* referential integrity must be preserved,
* deleted users must be represented according to the approved deletion model.

Do not physically delete message history merely because a user account was deleted.

---

# 35. API Rules

REST APIs must follow resource-oriented naming.

Prefer:

```text
GET    /users
GET    /users/{id}
POST   /users
PATCH  /users/{id}
DELETE /users/{id}
```

Avoid action verbs embedded in resource URLs when a RESTful resource/action structure is available.

Do not create endpoints for features that are outside the approved scope.

Exact endpoint design belongs to the current architecture and task.

---

# 36. API Contracts

API request and response contracts should be defined through:

```text
packages/types
```

when shared by frontend and backend.

Do not independently invent request/response shapes inside components or controllers.

If an API contract changes:

```text
Update shared contract
        ↓
Update backend
        ↓
Update frontend
        ↓
Run type checks
        ↓
Run tests
```

---

# 37. REST vs WebSocket

Use REST for appropriate request/response operations.

Use Socket.IO for approved real-time behavior.

Current real-time messaging must respect the architecture:

```text
Client
  ↓
Socket.IO
  ↓
NestJS Gateway
  ↓
Authorization
  ↓
Message/Chat Service
  ↓
PostgreSQL
```

Do not use WebSocket merely because it is technically possible.

---

# 38. WebSocket Authorization

Every protected WebSocket operation must verify authorization.

A socket connection does not automatically mean the user is authorized to access every chat.

For message operations, verify:

* authenticated user,
* valid chat,
* user participation,
* messaging permission.

Do not trust client-supplied chat/user relationships.

---

# 39. Message Persistence

For message sending:

```text
Validate
   ↓
Authorize
   ↓
Persist
   ↓
Deliver / Broadcast
```

The system must not treat an unpersisted message as successfully stored.

Historical messages must survive server restarts.

---

# 40. Contact-Based Messaging Rule

Messaging permissions must follow the approved product rule.

A user cannot directly message another user without the required contact relationship.

Backend authorization must enforce this rule.

Frontend restrictions alone are insufficient.

---

# 41. State Management Rules

Use:

```text
Zustand
    ↓
Client/application state

TanStack Query
    ↓
Server state
```

Do not duplicate server state in Zustand without a clear reason.

Avoid creating multiple competing sources of truth.

---

# 42. React Rules

React components should have focused responsibilities.

Avoid:

* huge components,
* mixed API/business logic/UI logic,
* duplicated state,
* unnecessary effects,
* unnecessary re-renders.

Prefer composition and small focused components when it improves maintainability.

Do not create abstractions merely to reduce line count.

---

# 43. React Effects

Do not use `useEffect` for ordinary derived values that can be calculated during rendering.

Avoid using effects merely to synchronize state that could be derived directly.

Use effects for actual side effects such as:

* subscriptions,
* event listeners,
* external synchronization,
* WebSocket lifecycle,
* browser APIs.

---

# 44. Forms

Use React Hook Form for project forms where appropriate.

Validation should be explicit and reusable.

Do not duplicate validation logic across:

* input components,
* submit handlers,
* API services,

when the same rule can be represented cleanly through the approved validation layer.

---

# 45. Authentication Rules

Authentication implementation must follow the architecture.

Passwords:

* must be hashed,
* must never be logged,
* must never be stored as plaintext.

JWT secrets:

* must come from environment configuration,
* must never be hard-coded,
* must never be committed.

Authentication must remain a backend responsibility.

---

# 46. Environment Variables

Never hard-code secrets.

Sensitive values belong in environment configuration.

Examples:

```text
DATABASE_URL
JWT_SECRET
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

Never commit actual secret values.

`.env.example` may contain placeholders.

Example:

```text
JWT_SECRET=replace-with-development-secret
```

but never a real production secret.

---

# 47. Dependency Rules

Before adding a dependency:

1. Check whether the project already has a library that solves the problem.
2. Check `stack.md`.
3. Check whether the dependency is actually necessary.
4. Check whether the task authorizes the change.
5. If it introduces a new technology, request approval.

Do not install packages simply because they are popular.

Do not install duplicate libraries for the same responsibility.

---

# 48. No Unapproved Infrastructure

Do not introduce:

```text
Redis
Kafka
RabbitMQ
NATS
Kubernetes
WebSocket clustering
distributed caches
message brokers
```

unless the approved project scope and architecture explicitly require them.

Do not add infrastructure to solve hypothetical future scaling problems.

---

# 49. Testing Rules

Testing is part of implementation, not an optional final step.

Tests should cover important behavior introduced by the task.

At minimum, where applicable:

```text
Unit tests
Integration tests
End-to-end tests
```

---

# 50. Unit Tests

Unit tests should focus on isolated logic such as:

* services,
* validators,
* utilities,
* pure transformations,
* important business rules.

Naming:

```text
domain.service.spec.ts
```

Tests should describe behavior rather than implementation details.

---

# 51. Integration Tests

Integration tests should verify interactions between important components.

Examples:

* registration,
* authentication,
* contact requests,
* message persistence,
* authorization rules.

Do not mock every dependency when the purpose of the test is to verify integration.

---

# 52. End-to-End Tests

E2E tests should verify important user workflows.

Examples:

```text
Register
  ↓
Verify email
  ↓
Complete profile
  ↓
Search user
  ↓
Send contact request
  ↓
Accept request
  ↓
Send message
  ↓
Receive message
```

The exact E2E scope depends on the current phase.

---

# 53. Verification Before Commit

Before committing a task, run the checks relevant to the repository.

Expected checks include:

```text
npm run lint
npm run type-check
npm run test
npm run build
```

If a script does not exist in the current repository, do not invent it merely to satisfy this document.

Instead:

1. inspect `package.json`,
2. identify the available equivalent command,
3. run the appropriate verification.

---

# 54. Do Not Hide Failing Tests

Never:

* disable a failing test,
* skip a test without reason,
* weaken assertions merely to make tests pass,
* suppress TypeScript errors,
* add `eslint-disable` without justification,
* ignore build errors.

If a test fails:

```text
Investigate
  ↓
Fix root cause
  ↓
Run again
```

---

# 55. Git Branch Rules

Do not commit directly to `main` unless explicitly authorized.

Use focused branches such as:

```text
feature/auth-module
feature/real-time-messaging
fix/message-persistence
refactor/database-schema
docs/update-context
```

One logical task should normally remain focused within one branch.

---

# 56. Commit Rules

Commit messages use:

```text
type: description
```

Examples:

```text
feat: add registration flow
fix: validate message authorization
refactor: simplify user service
test: add contact request tests
docs: update architecture documentation
chore: update dependencies
```

Commits should be:

* focused,
* understandable,
* related to the actual change.

Avoid huge commits containing unrelated changes.

---

# 57. Pull Request Rules

Before requesting review:

1. Verify the implementation.
2. Run available checks.
3. Review the diff.
4. Remove debugging code.
5. Confirm no secrets were committed.
6. Confirm the change matches `current-task.md`.
7. Confirm no unrelated files were modified.
8. Push the branch.
9. Request review.

Do not merge before required approval.

---

# 58. Code Review Rules

A reviewer should verify:

* task scope,
* architecture compliance,
* stack compliance,
* naming,
* type safety,
* error handling,
* security,
* tests,
* database integrity,
* API contracts,
* unnecessary complexity,
* accidental feature additions.

If the implementation violates an approved context rule, fix the implementation rather than weakening the rule.

---

# 59. Documentation Rules

Update documentation when a change materially affects:

* architecture,
* API contracts,
* setup,
* development commands,
* environment variables,
* important project behavior.

Do not modify context files merely to justify an implementation that should not have been made.

Context files describe the intended system.

They are not a place to hide deviations.

---

# 60. Architecture Changes

If implementation requires changing architecture:

```text
STOP
  ↓
Explain why the current architecture is insufficient
  ↓
Propose the change
  ↓
Get approval
  ↓
Update architecture.md
  ↓
Implement
```

Do not silently modify the architecture through code.

---

# 61. Stack Changes

If implementation requires a technology not approved in `stack.md`:

```text
STOP
  ↓
Explain why it is required
  ↓
Explain alternatives considered
  ↓
Request approval
  ↓
Update stack.md if approved
  ↓
Implement
```

---

# 62. Feature Changes

If a requested implementation is not listed in `features.md`:

```text
STOP
  ↓
Identify missing feature
  ↓
Request product decision
  ↓
Update features.md if approved
  ↓
Update current-task.md
  ↓
Implement
```

Do not silently add the feature.

---

# 63. Contradiction Protocol

If two context files appear to conflict:

Do not guess.

Use the authority order:

```text
overview
  >
features
  >
architecture
  >
stack
  >
rules
```

Then report the conflict.

Example:

```text
Conflict detected:
features.md excludes X,
but architecture.md contains X.

I will not implement X until the conflict is resolved.
```

---

# 64. Existing Code vs Documentation

If the repository implementation differs from the approved documentation:

Do not automatically rewrite the repository.

First determine:

1. Is the existing implementation correct?
2. Is it part of the current task?
3. Is the documentation outdated?
4. Is the code an accidental deviation?

If the answer requires a project decision:

```text
STOP → REPORT → ASK
```

---

# 65. Performance Rules

Do not optimize blindly.

Before optimization:

1. Identify the actual bottleneck.
2. Measure where practical.
3. Determine whether the problem is frontend, backend, database, network, or infrastructure.
4. Apply the smallest appropriate optimization.
5. Verify the result.

Do not introduce caching, Redis, queues, or complex architecture simply because they might improve performance someday.

---

# 66. Security Rules

Never commit:

* passwords,
* private keys,
* JWT secrets,
* API keys,
* Cloudinary secrets,
* database credentials,
* access tokens.

Never expose secrets through:

* frontend environment variables,
* API responses,
* logs,
* error messages,
* Git history.

Authorization must always be enforced on the backend.

---

# 67. Data Integrity Rules

The following invariants must never be violated:

```text
Verified account required for normal authenticated access.

Accepted contact relationship required for messaging.

Messages remain persistent.

Deleted accounts cannot authenticate.

Deleted account message history remains preserved.

Shared API contracts remain consistent.

Database relationships remain valid.
```

If a proposed implementation violates one of these:

```text
STOP
```

---

# 68. Scope Protection

The following are outside the current scope unless explicitly added:

```text
Group chats
Channels
Message editing
Message deletion
Read receipts
Unread counters
Typing indicators
Voice calls
Video calls
Password reset
OAuth
Blocking
Muting
Message reactions
Rich text
Arbitrary file sharing
E2E encryption
Payments
Subscriptions
Admin/moderation
Distributed Redis
Message brokers
WebSocket clustering
Spanish localization
```

Do not implement them.

---

# 69. Phase Completion

A phase is not complete merely because the code exists.

Before declaring a phase complete:

```text
Feature implementation
        ↓
Type check
        ↓
Lint
        ↓
Tests
        ↓
Build
        ↓
Manual verification where applicable
        ↓
Review diff
        ↓
Commit
        ↓
Push
        ↓
Approval
        ↓
Update done.md
        ↓
Prepare next current-task.md
```

---

# 70. Done File

After a phase receives approval:

* move the completed task from `current-task.md` to `done.md`,
* record what was implemented,
* record important verification results,
* keep the summary concise.

Do not mark work as done before the required approval.

---

# 71. Claude Code Final Workflow

For every task, Claude Code must follow:

```text
1. READ
   Read all relevant context files.

2. UNDERSTAND
   Identify the actual requirement.

3. CHECK FEATURES
   Confirm the feature is approved.

4. CHECK CURRENT TASK
   Confirm the task is authorized now.

5. INSPECT REPOSITORY
   Understand the existing implementation.

6. CHECK ARCHITECTURE
   Determine where the change belongs.

7. CHECK STACK
   Use approved technologies only.

8. PLAN
   Create a minimal implementation plan.

9. IMPLEMENT
   Modify only authorized files.

10. VERIFY
    Run relevant lint, type-check, tests, and build.

11. REVIEW
    Inspect the final diff for unintended changes.

12. REPORT
    Explain what changed, what was verified,
    and any remaining issue.

13. STOP
    If approval or clarification is required.
```

---

# 72. Golden Rules

These rules have the highest practical importance during implementation:

```text
1. Never guess when context is unclear.

2. Never implement outside current-task.md.

3. Never add a feature because it seems useful.

4. Never introduce a technology without approval.

5. Never reinitialize an existing project.

6. Always inspect the repository before creating files.

7. Never duplicate shared API contracts.

8. Never trust the frontend for authorization.

9. Never expose secrets.

10. Never hide failing tests or type errors.

11. Never make unrelated refactors during a focused task.

12. Never silently change architecture.

13. Preserve database integrity.

14. Preserve message history.

15. Keep changes minimal and reversible.

16. When uncertain:
    STOP → REPORT → ASK.
```

---

# 73. Final Principle

Claude Code is a development assistant, not the product owner or architect.

Its job is to:

```text
Understand
   ↓
Follow
   ↓
Implement
   ↓
Test
   ↓
Report
```

It must not:

```text
Guess
   ↓
Expand scope
   ↓
Redesign architecture
   ↓
Add infrastructure
   ↓
Proceed without approval
```

The final authority for product and architecture decisions remains with the project owner.

When uncertainty exists, the correct action is:

> **STOP → REPORT → ASK**
