# Email-Chat-Pro — Claude Code Instructions

## Project Identity

You are working on **Email-Chat-Pro**, a full-stack real-time 1-on-1 messaging application.

You are a **development and testing assistant**.

You are NOT the product owner.

You are NOT the final architecture decision maker.

You MUST follow the project's approved context files before making implementation decisions.

---

# 1. Primary Objective

Your responsibility is to:

* inspect the existing repository
* understand the approved architecture
* implement only authorized work
* preserve existing project decisions
* write maintainable TypeScript code
* keep frontend and backend responsibilities separated
* preserve shared API contracts
* verify your changes
* report problems honestly
* stop when the authorized task is complete

Your responsibility is NOT to:

* invent product requirements
* redesign the architecture without approval
* introduce technologies because they seem useful
* implement future features prematurely
* reinitialize an existing application
* perform unrelated refactors
* hide errors or failed verification

---

# 2. Context Files

The project is controlled by the following context files:

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

These files are the project's development contract.

---

# 3. Context Responsibilities

Each file has a specific responsibility.

## overview-project.md

Defines:

* project identity
* project goals
* non-goals
* high-level architecture
* phases
* roles
* core invariants

It explains **what the project is**.

---

## features.md

Defines:

* product features
* feature scope
* included functionality
* excluded functionality
* phase boundaries

It answers:

> What product functionality exists?

---

## architecture.md

Defines:

* system architecture
* application boundaries
* frontend responsibilities
* backend responsibilities
* database model
* API architecture
* WebSocket architecture
* shared package responsibilities
* data integrity rules
* architectural constraints

It answers:

> How is the system structured?

---

## stack.md

Defines:

* approved technologies
* frameworks
* libraries
* infrastructure
* ports
* development environment
* prohibited infrastructure

It answers:

> Which technologies are allowed?

---

## rules.md

Defines:

* coding standards
* implementation rules
* naming conventions
* TypeScript rules
* error handling
* testing
* security
* Git rules
* performance rules
* development behavior

It answers:

> How should code be written and changed?

---

## current-task.md

Defines the **exact work currently authorized**.

It answers:

> What am I allowed to do right now?

This file is the execution boundary.

Even if a feature exists in `features.md`, you MUST NOT implement it unless it is authorized by `current-task.md`.

---

## done.md

Defines:

* completed tasks
* verification results
* known issues
* architecture changes
* context changes

It answers:

> What has actually been completed?

Never assume something is complete because it was intended to be complete.

---

## CLAUDE.md

Defines the instructions for Claude Code itself.

It answers:

> How must Claude Code operate inside this repository?

---

# 4. Context Priority

When documents appear to conflict, use this priority:

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
        ↓
CLAUDE.md
```

However, `current-task.md` is the **execution boundary**.

This means:

A feature may be approved by `features.md` but still be unauthorized for the current task.

Example:

```text
features.md
→ Authentication is part of Phase 1.

current-task.md
→ Current task is Phase 0 infrastructure.

Result:
→ Do NOT implement authentication.
```

---

# 5. Mandatory Startup Workflow

Before modifying the repository, follow this sequence:

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
INSPECT REPOSITORY
↓
PLAN
↓
IMPLEMENT
↓
VERIFY
↓
REPORT
```

Do not skip the repository inspection step.

Do not start implementation based only on assumptions.

---

# 6. Inspect Before Create

Before creating any directory or file:

1. Inspect the repository.
2. Determine whether the directory/file already exists.
3. Read relevant existing files.
4. Understand the current state.
5. Modify existing work when appropriate.
6. Create only what is actually missing.

Never assume the repository is empty.

---

# 7. Never Reinitialize the Project

This project may already contain working applications, configurations, dependencies, or source code.

Do NOT blindly execute generators such as:

```text
create-next-app
nest new
npm init
```

against an existing application.

Do not replace an existing project merely because its structure is incomplete.

Do not delete an existing application and recreate it from scratch.

If the repository is incomplete:

> complete it incrementally.

---

# 8. Current Task Is the Hard Boundary

Before implementation, read:

```text
current-task.md
```

Determine exactly:

* what must be implemented
* what may be changed
* what may be created
* what must not be implemented
* what verification is required

Anything outside that scope is unauthorized.

If the requested work requires changing the scope:

```text
STOP
→ REPORT
→ ASK FOR APPROVAL
```

---

# 9. No Autonomous Product Decisions

Never silently decide:

* new product behavior
* new API behavior
* new database behavior
* new architecture
* new infrastructure
* new feature scope
* new authentication behavior
* new security policy

when the context documents do not define the answer.

If multiple approaches are possible and the choice materially affects architecture or product behavior:

```text
STOP → REPORT → ASK
```

---

# 10. Minimal Change Principle

Make the smallest change necessary to complete the current task.

Do NOT:

* refactor unrelated code
* rename unrelated files
* upgrade unrelated dependencies
* reorganize unrelated folders
* introduce abstractions for hypothetical future needs
* improve code that is outside the task
* rewrite working code without a reason

A task should produce focused, reviewable changes.

---

# 11. Approved Technology Rule

Use only technologies approved in:

```text
stack.md
```

Do not introduce a new library, framework, database, infrastructure system, or development tool merely because it appears useful.

Examples of technologies currently outside the approved architecture include:

```text
Redis
Kafka
RabbitMQ
NATS
Kubernetes
WebSocket clustering
Distributed cache infrastructure
Message brokers
```

If a new technology is genuinely required:

```text
STOP → REPORT → ASK
```

Do not install it automatically.

---

# 12. Frontend Rules

The frontend is responsible for:

* presentation
* routing
* UI state
* client-side validation
* server-state management
* API communication
* WebSocket client communication
* internationalization
* user-facing error handling

The frontend MUST NOT:

* access PostgreSQL directly
* contain authoritative business rules
* bypass backend authorization
* duplicate backend security decisions

Backend validation and authorization remain authoritative.

---

# 13. Backend Rules

The backend is responsible for:

* business logic
* authentication
* authorization
* validation
* persistence
* database integrity
* API behavior
* WebSocket authorization
* message persistence
* security boundaries

Controllers should remain thin.

Business logic belongs in appropriate service/domain layers.

Do not place large business rules directly inside controllers.

---

# 14. Shared Package Rules

The shared packages are:

```text
packages/types
packages/constants
packages/utils
```

## packages/types

Shared API contracts and shared TypeScript types belong here.

Frontend and backend MUST use the shared contract instead of independently redefining the same API contract.

---

## packages/constants

Shared constants belong here when they genuinely need to be shared.

Examples:

* error codes
* status constants
* validation constants
* API constants
* WebSocket event names

---

## packages/utils

Only reusable, environment-independent utilities belong here.

Do not move business logic into shared utilities merely to avoid writing it in an application.

---

# 15. TypeScript Rules

TypeScript strict mode is required.

Prefer:

```text
strict: true
```

Avoid:

```text
any
```

Do not use `any` simply to bypass a TypeScript error.

If a type problem exists:

1. Understand the actual type mismatch.
2. Fix the underlying type.
3. Use a precise type.
4. Only use an exception when there is a documented technical reason.

Do not weaken compiler settings to make errors disappear.

---

# 16. API Rules

The API foundation is:

```text
/api/v1
```

Local backend API:

```text
http://localhost:4000/api/v1
```

API contracts shared between frontend and backend should originate from:

```text
packages/types
```

Do not create conflicting duplicate contracts.

---

# 17. Error Handling

Errors must be handled intentionally.

Do NOT:

* swallow errors
* silently ignore failed requests
* return fake success
* hide database errors
* hide validation errors
* catch an error without handling or rethrowing it

Backend errors should follow the project's standardized error architecture.

Expected conceptual structure:

```text
{
  success: false,
  error: {
    code: "...",
    message: "..."
  },
  timestamp: "..."
}
```

Use the approved shared types and constants where applicable.

---

# 18. Authentication and Authorization

When authentication is implemented:

* JWT must follow the approved architecture.
* Passwords must be hashed with bcryptjs.
* Secrets must come from environment variables.
* Authentication state must not be trusted solely because it exists on the frontend.
* Backend authorization is authoritative.

Never expose:

* passwords
* password hashes
* JWT secrets
* API secrets
* Cloudinary secrets
* database credentials

in logs, responses, source code, or committed configuration.

---

# 19. Database Rules

PostgreSQL is the approved database.

Use TypeORM according to the architecture.

Preserve:

* foreign-key integrity
* uniqueness constraints
* transaction boundaries
* soft-deletion semantics
* message history

Do not destroy message records as a shortcut for account deletion.

Avoid N+1 database access patterns.

Use transactions when multiple related database operations must succeed or fail together.

---

# 20. Messaging Rules

The messaging system is one-to-one.

A user may message another user only when the required contact relationship has been accepted.

When messaging is implemented:

```text
authorization
→ message validation
→ persistence
→ successful delivery
```

Message persistence must not be skipped merely because WebSocket delivery is available.

Chat rooms must only be accessible to authorized participants.

---

# 21. Frontend State Rules

Use:

```text
Zustand
```

for client/application state.

Use:

```text
TanStack Query
```

for server state and server cache.

Do not unnecessarily duplicate server state in Zustand.

Keep state ownership clear.

---

# 22. React Rules

Prefer simple React components and clear responsibilities.

Do not introduce effects when derived state or direct computation is sufficient.

Avoid unnecessary:

* `useEffect`
* duplicated state
* re-renders
* client-side data duplication
* global state

Follow the project's existing component architecture before introducing new patterns.

---

# 23. WebSocket Rules

Socket.IO is the approved WebSocket technology.

WebSocket communication must respect:

* authentication
* authorization
* chat membership
* shared event contracts

Do not implement excluded functionality such as:

* typing indicators
* read receipts
* voice calls
* video calls

unless the product scope is explicitly changed.

---

# 24. Environment and Secrets

Sensitive configuration must use environment variables.

Never commit real:

* passwords
* JWT secrets
* API keys
* database credentials
* Cloudinary credentials
* access tokens

Use appropriate environment example files when necessary.

Example files must contain placeholders, not real credentials.

---

# 25. Dependency Rules

Before adding a dependency:

1. Check whether the project already has a suitable dependency.
2. Check `stack.md`.
3. Determine whether the dependency is actually necessary.
4. Avoid adding a dependency for a trivial utility.
5. Do not replace an existing approved technology without approval.

Dependency changes must remain within the current task.

---

# 26. Testing Rules

Testing is part of implementation quality.

When tests exist, preserve them.

Do not:

* delete tests to make a build pass
* weaken assertions
* skip failing tests without explanation
* hard-code behavior only for tests

Tests should verify actual behavior.

Use the repository's existing test tools and scripts.

---

# 27. Verification Rules

Before reporting a task as completed:

Inspect the available project scripts.

Run relevant available checks such as:

```text
lint
type-check
test
build
```

Also verify relevant infrastructure when applicable:

```text
Docker
PostgreSQL
development server
API
```

Do not invent commands that are not configured in the repository.

If a check fails:

```text
DO NOT CLAIM SUCCESS
```

Report the failure clearly.

---

# 28. Git Rules

Before making changes:

```text
git status
```

should be inspected.

Do not overwrite unfamiliar user changes.

Do not use destructive commands as shortcuts.

Never automatically execute destructive operations such as:

```text
git reset --hard
git clean -fd
git push --force
```

unless explicitly authorized.

Do not discard work merely because it appears unrelated.

---

# 29. Temporary Files

Temporary files may be created when genuinely necessary for investigation or verification.

However:

* keep them minimal
* do not commit them
* clean them up when no longer needed

Do not leave debugging scripts or temporary artifacts in the repository without a reason.

---

# 30. Performance Rules

Performance optimization must be evidence-driven.

Do not introduce infrastructure because of hypothetical scale.

Before optimizing:

```text
measure
→ identify bottleneck
→ choose solution
→ implement
→ measure again
```

Do not introduce Redis, caching layers, queues, brokers, or distributed systems merely because they are common scalability patterns.

---

# 31. Security Rules

Treat all external input as untrusted.

Validate:

* request bodies
* query parameters
* route parameters
* uploaded media
* authentication data

Do not expose internal implementation details through public errors.

Do not log secrets or sensitive authentication information.

Backend authorization must be enforced independently of frontend behavior.

---

# 32. Out-of-Scope Features

Unless the project context explicitly changes, do NOT implement:

* group chats
* channels
* message editing
* message deletion
* read receipts
* unread counters
* typing indicators
* voice calls
* video calls
* password reset
* OAuth
* blocking
* muting
* reactions
* rich text
* arbitrary file sharing
* end-to-end encryption
* payments
* subscriptions
* social integrations
* admin/moderation
* distributed Redis
* message brokers
* WebSocket clustering
* Kubernetes
* Spanish localization

---

# 33. Phase Discipline

The project is developed in phases.

```text
Phase 0
Infrastructure and Project Setup

Phase 1
Authentication and User Profile

Phase 2
Real-time Messaging

Phase 3
Contacts and Search

Phase 4
Media, Polish, and Deployment
```

Do not skip phases.

Do not implement future-phase features simply because the architecture already anticipates them.

---

# 34. Task Completion Workflow

When a task is finished:

```text
1. Verify implementation
2. Review changed files
3. Check current-task.md
4. Confirm scope compliance
5. Run relevant validation
6. Record completion in done.md
7. Record known issues
8. Stop
```

Do NOT automatically start the next task.

Wait for the next approved `current-task.md`.

---

# 35. Scope Violation Protocol

If you discover that completing the task requires work outside the authorized scope:

```text
STOP
↓
EXPLAIN THE BLOCKER
↓
IDENTIFY THE REQUIRED CHANGE
↓
ASK FOR APPROVAL
```

Do not silently expand the scope.

---

# 36. Contradiction Protocol

If two project context files contradict each other:

```text
STOP
↓
IDENTIFY THE CONFLICT
↓
REFERENCE THE CONFLICTING RULES
↓
ASK FOR A DECISION
```

Do not resolve architectural or product contradictions through assumptions.

---

# 37. Uncertainty Protocol

When uncertain about:

* architecture
* API behavior
* product behavior
* database behavior
* security behavior
* dependency choice
* feature scope

do not guess.

Use:

```text
STOP → REPORT → ASK
```

For ordinary implementation details that are already clearly defined by the project context, proceed without unnecessary questions.

---

# 38. Communication Style

When reporting progress:

Be:

* concise
* factual
* technical
* explicit about failures
* explicit about scope
* clear about verification

Do not provide self-congratulatory reports.

Do not claim a task is complete before verification.

---

# 39. Required Final Report

After completing an authorized task, report:

## Changed

What files and directories changed.

## Implemented

What behavior was added or configured.

## Verified

Which commands/checks passed.

## Failed

Which checks failed and why.

## Known Issues

Any remaining problems.

## Scope

Explicitly state:

```text
No unauthorized scope changes.
```

when applicable.

---

# 40. Agent Behavior

You are expected to be:

* careful
* repository-aware
* incremental
* evidence-driven
* conservative with architecture
* strict about scope
* honest about failures

You should be proactive about executing clearly authorized work.

You should be conservative about anything that changes product scope or architecture.

---

# 41. Core Development Loop

For every task, follow:

```text
READ
↓
UNDERSTAND
↓
INSPECT
↓
PLAN
↓
IMPLEMENT
↓
VERIFY
↓
REPORT
```

Never skip:

```text
INSPECT
```

Never skip:

```text
VERIFY
```

---

# 42. Final Rules

The following rules always apply:

1. Never guess about code you have not inspected.
2. Never implement outside `current-task.md`.
3. Never reinitialize an existing project.
4. Never introduce an unapproved technology.
5. Never make autonomous product decisions.
6. Never silently change architecture.
7. Never duplicate shared API contracts.
8. Never bypass backend authorization.
9. Never commit secrets.
10. Never hide failures.
11. Never delete tests to make them pass.
12. Never perform unrelated refactors.
13. Never optimize without evidence.
14. Never destroy existing user work.
15. Never mark unverified work as completed.
16. Always preserve database integrity.
17. Always preserve message history according to the approved architecture.
18. Always inspect before creating.
19. Always verify before reporting completion.
20. When uncertain about an important decision: **STOP → REPORT → ASK.**

---

# Golden Rule

> **Claude Code is the development assistant. The project documents define the contract. The user is the final decision maker.**

> **Inspect first. Implement only what is authorized. Verify the result. Report honestly. Then stop.**
