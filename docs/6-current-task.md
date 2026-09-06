# Current Task

## Purpose

This file defines the **exact work currently authorized** for Claude Code.

`current-task.md` is the execution boundary for the current development step.

Claude Code MUST NOT implement work outside the scope explicitly defined in this file.

When the task is completed and verified, the completed work MUST be recorded in `done.md`, and this file MUST be updated or replaced with the next approved task.

---

# Current Phase

## Phase 0 — Infrastructure and Project Setup

The current task is to establish and verify the project foundation for the Email-Chat-Pro monorepo.

The goal is to create or complete the minimum technical foundation required for later development without implementing product features prematurely.

---

# Current Objective

Establish the project structure and local development infrastructure for:

* Frontend application
* Backend application
* Shared types package
* Shared constants package
* Shared utilities package
* npm workspace configuration
* PostgreSQL local development environment
* Basic TypeScript configuration
* Basic development scripts
* Environment configuration structure

The project must be ready for the next development phase without implementing authentication, messaging, contacts, or other product features.

---

# Authorized Scope

Claude Code is authorized to work only on the following areas.

## 1. Repository Inspection

Before making changes:

* Inspect the existing repository.
* Inspect the existing directory structure.
* Inspect `package.json` files.
* Inspect existing TypeScript configuration.
* Inspect existing application configuration.
* Inspect existing Docker configuration.
* Inspect existing source files.
* Inspect existing scripts.
* Inspect existing dependencies.

Determine what already exists before creating anything.

### Important

If a required application, package, configuration, or directory already exists:

**modify or complete it instead of recreating or reinitializing it.**

Do not blindly run project generators.

---

# 2. Monorepo Configuration

Establish or verify npm Workspaces.

The intended workspace structure is:

```text
apps/
  frontend/
  backend/

packages/
  types/
  constants/
  utils/
```

The root project should provide the workspace configuration required for these packages.

Do not introduce another package manager unless explicitly approved.

Do not introduce a monorepo framework unless explicitly approved.

---

# 3. Frontend Foundation

Establish or verify the frontend application using:

* Next.js
* React
* TypeScript
* Tailwind CSS
* App Router

The frontend must be prepared for future development.

Only foundation-level configuration is authorized.

Do NOT implement:

* authentication pages
* login
* registration
* profile pages
* chat UI
* contact UI
* messaging UI
* product-specific business logic

unless explicitly required by an existing repository state and confirmed as necessary for the foundation.

---

# 4. Backend Foundation

Establish or verify the backend application using:

* NestJS
* Node.js
* TypeScript

The backend foundation should be prepared for future modules.

The architecture must remain compatible with:

```text
Auth
Users
Contacts
Chats
Messages
WebSocket
```

At this stage, only foundational setup is authorized.

Do NOT implement:

* registration logic
* login logic
* JWT authentication flows
* email verification
* contact requests
* messaging
* chat business logic

These belong to later tasks.

---

# 5. Shared Packages

Establish or verify:

```text
packages/types
packages/constants
packages/utils
```

## packages/types

Prepare the package for shared API contracts and shared TypeScript types.

This package is the **Single Source of Truth** for contracts shared between frontend and backend.

Do not duplicate shared API contracts inside applications.

Only foundation-level types are authorized at this stage.

Do not invent product contracts that have not yet been approved.

---

## packages/constants

Prepare the package for shared constants.

Examples of future responsibilities include:

* API constants
* error codes
* validation constants
* status constants
* WebSocket event names

Only constants required for the current foundation may be created.

Do not invent unnecessary constants.

---

## packages/utils

Prepare the package for reusable, environment-independent utilities.

Utilities must remain:

* reusable
* deterministic where appropriate
* independent from frontend and backend frameworks

Do not place application-specific business logic here.

---

# 6. PostgreSQL Development Environment

Establish or verify the local PostgreSQL environment using:

* PostgreSQL
* Docker
* Docker Compose

The intended local database port is:

```text
5432
```

The database environment must be suitable for local development.

Do not introduce:

* Redis
* Kafka
* RabbitMQ
* NATS
* Kubernetes
* distributed cache
* message broker
* WebSocket clustering

These are explicitly outside the current scope.

---

# 7. Environment Configuration

Establish the environment-variable structure required for local development.

Sensitive values MUST NOT be committed to Git.

Environment configuration may include placeholders for future values such as:

```text
DATABASE_URL
JWT_SECRET
JWT_EXPIRES_IN
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

However:

**Do not implement or configure features that are not part of the current task merely because an environment variable exists.**

Provide appropriate example/environment-template files when needed.

Never place real secrets in source code or committed configuration.

---

# 8. Ports

The intended development ports are:

```text
Frontend:   3000
Backend:    4000
PostgreSQL: 5432
```

If the existing repository already uses these ports, preserve them.

If a conflict exists, report it before making an architectural change.

Do not silently change the project's intended ports.

---

# 9. API Foundation

Prepare the backend for the API base path:

```text
/api/v1
```

The intended local API base URL is:

```text
http://localhost:4000/api/v1
```

Only foundational configuration is authorized.

Do not implement product endpoints unless explicitly required by the current repository state and task.

---

# 10. Basic Development Tooling

Verify or establish the minimum development scripts required to work with the monorepo.

Examples may include:

```text
dev
build
lint
type-check
test
```

Only create scripts that are appropriate for the technologies actually present in the repository.

Do not invent scripts that reference tools that are not installed.

---

# 11. TypeScript Foundation

TypeScript configuration should be suitable for strict development.

The intended standard is:

```text
strict: true
```

Frontend, backend, and shared packages should use compatible TypeScript configuration.

Avoid unnecessary configuration duplication where shared configuration is appropriate.

Do not weaken TypeScript strictness to hide errors.

---

# 12. Dependency Installation

Install only dependencies required by the approved stack and the current foundation.

Approved technologies are defined in:

```text
stack.md
```

Do not install libraries merely because they might be useful later.

Do not replace an approved technology with another technology without explicit approval.

---

# 13. Docker Configuration

Docker Compose should provide the local PostgreSQL development environment.

The configuration must be simple and development-focused.

Do not create production Kubernetes/Docker orchestration.

Do not add unnecessary infrastructure services.

---

# 14. Initial Verification

After implementation, Claude Code MUST verify the foundation.

At minimum, inspect and run the repository's available validation commands for:

* dependency installation
* TypeScript
* linting
* build
* tests
* Docker configuration

Only run commands that actually exist in the repository.

If a command does not exist, do not invent it.

---

# Explicitly NOT Authorized

The following work MUST NOT be implemented during this task.

## Authentication

Do not implement:

* registration
* login
* logout
* JWT authentication flow
* password hashing logic
* email verification
* email change
* account deletion
* protected routes

---

## User Features

Do not implement:

* profile management
* username search
* profile editing
* avatar upload

---

## Contacts

Do not implement:

* contact requests
* accepting requests
* declining requests
* contact lists
* contact authorization logic

---

## Messaging

Do not implement:

* chat creation
* message creation
* message persistence
* message history
* conversation lists
* real-time messaging

---

## WebSocket

Do not implement product-level WebSocket behavior.

Socket.IO may be prepared at the foundation level if required by the existing architecture, but no messaging behavior should be implemented.

---

## Media

Do not implement:

* Cloudinary uploads
* image messages
* video messages

---

## Advanced Infrastructure

Do not introduce:

* Redis
* Kafka
* RabbitMQ
* NATS
* Kubernetes
* distributed caching
* WebSocket clustering
* message brokers
* service discovery
* microservices

---

## Product Features Outside Phase 0

Do not implement any feature that belongs to Phase 1, Phase 2, Phase 3, or Phase 4 unless explicitly moved into this task through an approved change.

---

# Repository Creation Rule

Claude Code MUST inspect the repository before creating files or directories.

If the required structure does not exist, Claude Code may create it.

For example, if this structure is missing:

```text
apps/frontend
apps/backend
packages/types
packages/constants
packages/utils
```

Claude Code may create the missing directories and files.

However:

**Claude Code MUST NOT reinitialize the entire project simply because the desired structure is incomplete.**

Do not blindly execute:

```text
create-next-app
nest new
npm init
```

against an existing project.

Use the existing repository as the source of truth.

---

# Change Minimization

Changes must remain limited to the current task.

Do not perform unrelated:

* refactors
* dependency upgrades
* formatting changes
* architectural changes
* naming changes
* file moves
* feature implementations

If an unrelated issue is discovered:

1. Do not silently fix it.
2. Report it.
3. Continue only if it does not block the current task.

---

# Architecture Protection

The implementation MUST remain consistent with:

```text
overview-project.md
features.md
architecture.md
stack.md
rules.md
```

If these documents conflict:

**STOP and report the conflict.**

Do not resolve architectural conflicts by guessing.

---

# Product Decision Boundary

Claude Code is not authorized to make product decisions.

If implementation requires choosing between multiple valid product or architectural approaches that are not already defined in the context documents:

**STOP → REPORT → ASK**

Do not silently choose an approach.

---

# Completion Criteria

The task is complete only when:

* npm workspace structure is established or verified
* frontend foundation is established or verified
* backend foundation is established or verified
* shared packages are established or verified
* PostgreSQL Docker environment is established or verified
* required environment structure exists
* intended ports are configured
* API base path foundation is configured
* TypeScript foundation is valid
* required development scripts are available
* dependencies are consistent with `stack.md`
* validation commands have been executed where available
* no unauthorized product features were implemented
* no unapproved infrastructure was introduced
* no secrets were committed
* the repository remains in a coherent runnable state

---

# Reporting Requirements

At the end of the task, Claude Code MUST report:

## 1. What changed

List the files, directories, configuration, and infrastructure that were created or modified.

## 2. What was verified

List the commands and checks that were successfully executed.

## 3. Problems

Report any:

* existing errors
* blocked commands
* dependency conflicts
* configuration problems
* Docker problems
* TypeScript problems
* lint problems
* test problems

Do not hide failures.

## 4. Scope Check

Explicitly confirm whether any work outside `current-task.md` was performed.

The expected answer is:

```text
No unauthorized scope changes.
```

if nothing outside the task was implemented.

---

# Next Step

After this task is successfully completed and verified:

1. Record the completed work in `done.md`.
2. Review the repository state.
3. Stop.
4. Wait for the next approved task.

Do not automatically continue into Phase 1.

---

# Golden Rule

> Build the foundation, verify it, report it, and stop.

Do not implement future features simply because the architecture anticipates them.
