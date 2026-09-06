# Email-Chat-Pro — Technology Stack

## 1. Purpose

This file defines the technologies used to build Email-Chat-Pro.

It answers:

> **WITH WHAT TECHNOLOGY do we build the system?**

This file does not define:

* what features should exist,
* how the entire system is architected,
* what the current task is,
* or how individual code decisions must be implemented.

Those responsibilities belong to the other context files.

---

# 2. Technology Authority

The project uses the following technology stack:

| Area                 | Technology                     |
| -------------------- | ------------------------------ |
| Package Manager      | npm                            |
| Monorepo             | npm Workspaces                 |
| Runtime              | Node.js 22+                    |
| Frontend Framework   | Next.js                        |
| Frontend UI          | React                          |
| Frontend Language    | TypeScript                     |
| Styling              | Tailwind CSS                   |
| UI Components        | shadcn/ui                      |
| Client State         | Zustand                        |
| Server State         | TanStack Query                 |
| Forms                | React Hook Form                |
| Schema Validation    | Zod                            |
| HTTP Client          | Axios                          |
| Real-time Client     | Socket.IO Client               |
| Internationalization | i18next                        |
| Icons                | Lucide React                   |
| Backend Framework    | NestJS                         |
| Backend Language     | TypeScript                     |
| Database             | PostgreSQL                     |
| ORM                  | TypeORM                        |
| Authentication       | JWT                            |
| Password Hashing     | bcryptjs                       |
| Real-time Server     | Socket.IO                      |
| File Storage         | Cloudinary                     |
| API Documentation    | Swagger / `@nestjs/swagger`    |
| Logging              | Winston                        |
| Rate Limiting        | `@nestjs/throttler`            |
| Security Headers     | Helmet                         |
| CORS                 | NestJS/HTTP CORS configuration |
| File Upload Parsing  | Multer                         |
| Backend Validation   | class-validator                |
| Local Infrastructure | Docker + Docker Compose        |

Technologies not listed here must not be introduced without an explicit project decision.

---

# 3. Monorepo

## npm

npm is the package manager for the project.

It is responsible for:

* installing dependencies,
* running project scripts,
* managing the workspace,
* maintaining the lockfile.

The repository uses **npm Workspaces**.

Expected workspace areas:

```text
apps/frontend
apps/backend
packages/types
packages/constants
packages/utils
```

The exact repository structure is governed by `architecture.md`.

---

# 4. Runtime

## Node.js

Required runtime:

```text
Node.js 22+
```

The same major Node.js version should be used across development environments where practical.

Node.js is used primarily by:

* the Next.js application,
* the NestJS backend,
* project tooling,
* TypeScript tooling.

---

# 5. Frontend Stack

## Next.js

The frontend uses **Next.js with the App Router**.

Responsibilities include:

* application routing,
* page rendering,
* React integration,
* frontend application structure,
* server/client component boundaries where appropriate.

Next.js does not own backend business logic or database access.

---

## React

React is the primary UI library.

Responsibilities include:

* components,
* UI composition,
* client-side interaction,
* rendering application state.

React components should remain focused on presentation and interaction rather than containing large business rules.

---

## TypeScript

TypeScript is mandatory throughout the frontend.

TypeScript provides:

* static typing,
* shared API contract integration,
* safer component interfaces,
* safer service calls,
* improved refactoring.

Strict type checking is expected.

---

# 6. Styling and UI

## Tailwind CSS

Tailwind CSS is the project's primary styling system.

It is used for:

* layout,
* spacing,
* responsive design,
* typography,
* visual states,
* component styling.

Avoid introducing another CSS framework unless explicitly approved.

---

## shadcn/ui

shadcn/ui is used for reusable UI components.

It provides the foundation for components such as:

* buttons,
* inputs,
* dialogs,
* dropdowns,
* forms,
* cards,
* other accessible UI primitives.

Components may be customized to match the project design.

---

## Lucide React

Lucide React is the project's icon library.

Use it consistently instead of introducing multiple icon libraries.

---

# 7. Frontend State Management

The project separates client state from server state.

## Zustand

Zustand is used for **client/application state**.

Examples include:

* UI state,
* sidebar state,
* modal state,
* local interaction state,
* other state that does not represent remote server data.

Server data should not unnecessarily be duplicated inside Zustand.

---

## TanStack Query

TanStack Query is used for **server state**.

Responsibilities include:

* fetching API data,
* caching,
* synchronization,
* invalidation,
* refetching,
* loading states,
* server-error states.

The distinction is:

```text
Zustand
    ↓
Client / UI state

TanStack Query
    ↓
Server / API state
```

---

# 8. Forms and Validation

## React Hook Form

React Hook Form is used for form management.

It is appropriate for:

* registration,
* login,
* profile forms,
* account settings,
* other user-input forms.

Forms should avoid unnecessary re-renders and should separate form state from server state.

---

## Zod

Zod is used for schema-based validation where appropriate.

It can validate:

* frontend form input,
* structured data,
* environment configuration,
* shared validation requirements where explicitly designed.

Validation schemas should not be duplicated unnecessarily across frontend and backend.

Where a validation rule belongs to the shared contract, it should be represented through the appropriate shared package.

---

# 9. HTTP Communication

## Axios

Axios is used for REST API communication between frontend and backend.

The frontend should communicate with the backend through a centralized API layer rather than scattering raw HTTP configuration throughout components.

Responsibilities may include:

* base URL configuration,
* request configuration,
* authentication handling,
* response handling,
* standardized error handling.

The exact implementation belongs to the architecture and coding rules.

---

# 10. Real-Time Communication

## Socket.IO Client

The frontend uses Socket.IO Client for real-time communication.

Current primary use:

```text
Real-time message delivery
```

Socket.IO client is responsible for communication with the backend Socket.IO gateway.

Features such as:

* typing indicators,
* read receipts,
* unread counters,
* group messaging,

are not part of the current implementation scope unless explicitly added to `features.md`.

---

# 11. Internationalization

## i18next

The project supports:

```text
Persian (fa)
English (en)
```

Spanish is not part of the current project scope.

Internationalization should be implemented in a way that supports:

* translated UI text,
* Persian RTL layout,
* English LTR layout,
* language switching.

The exact Next.js/i18next integration is an implementation concern and should follow the current repository and project rules.

---

# 12. Backend Stack

## NestJS

The backend uses NestJS.

NestJS provides the structural foundation for:

* modules,
* controllers,
* services,
* dependency injection,
* guards,
* pipes,
* interceptors,
* WebSocket gateways.

The backend follows the modular architecture defined in `architecture.md`.

---

## TypeScript

The backend is written in TypeScript.

TypeScript is mandatory for:

* controllers,
* services,
* entities,
* DTOs,
* gateways,
* configuration,
* utilities.

Strict type checking is expected.

---

# 13. Database

## PostgreSQL

PostgreSQL is the primary database.

It stores persistent application data including:

* users,
* contact requests,
* chats,
* messages.

PostgreSQL is selected because the project requires:

* relational data,
* transactions,
* referential integrity,
* constraints,
* reliable persistence.

Local development uses Docker Compose.

Default local port:

```text
5432
```

---

# 14. ORM

## TypeORM

TypeORM is used for PostgreSQL access from the NestJS backend.

Responsibilities include:

* entity mapping,
* relationships,
* database queries,
* transactions where required,
* migrations,
* persistence operations.

The backend must not bypass the persistence architecture with arbitrary database access unless explicitly justified by the task and architecture.

---

# 15. Authentication

## JWT

JSON Web Tokens are used for authentication.

JWT is responsible for representing authenticated sessions between the client and backend.

The project requires:

* authentication,
* protected resources,
* authorization,
* invalidation behavior for deleted accounts.

Authentication implementation details must follow `architecture.md` and `rules.md`.

---

## bcryptjs

bcryptjs is used for password hashing.

Passwords must never be stored in plaintext.

The backend is responsible for:

```text
Plain password
      ↓
bcryptjs
      ↓
Password hash
      ↓
PostgreSQL
```

Password verification is performed during authentication.

---

# 16. WebSocket Server

## Socket.IO

Socket.IO is used on the backend for real-time communication.

Primary responsibility:

```text
Authenticated users
        ↓
Socket.IO Gateway
        ↓
Authorized chat
        ↓
Real-time message delivery
```

Chat rooms must respect authorization rules.

A user must not receive events from conversations they are not authorized to access.

---

# 17. File Storage

## Cloudinary

Cloudinary is used for media storage and delivery.

Current planned media scope includes:

* image messages,
* video messages,
* profile pictures.

Media functionality belongs to the later project phase defined in `features.md`.

Cloudinary credentials must be provided through environment variables and must never be committed to the repository.

---

# 18. File Upload Handling

## Multer

Multer is used when the backend needs to process multipart/form-data uploads.

Typical flow:

```text
Frontend
   ↓
multipart/form-data
   ↓
NestJS
   ↓
Multer
   ↓
Validation
   ↓
Cloudinary
```

File size and file-type validation must be enforced according to the project's validation rules.

---

# 19. API Documentation

## Swagger

The backend uses:

```text
@nestjs/swagger
```

Swagger documents the REST API.

The documentation should remain synchronized with the implemented API contracts.

The exact Swagger route is an implementation/configuration detail and may be defined by the current project configuration.

---

# 20. Validation

## class-validator

NestJS backend DTO validation uses `class-validator` where appropriate.

Responsibilities include validation of incoming backend requests.

The backend remains the authoritative validation boundary even when the frontend performs client-side validation.

Client-side validation improves user experience.

Backend validation protects the system.

---

# 21. Logging

## Winston

Winston is used for structured backend logging.

Logging should support:

* application events,
* errors,
* important backend operations,
* debugging information appropriate for the environment.

Logs must not contain sensitive information such as:

* passwords,
* JWT secrets,
* API secrets,
* private credentials,
* unnecessary personal data.

---

# 22. Security

## Helmet

Helmet is used to configure appropriate HTTP security headers.

---

## CORS

CORS is configured by the backend to allow the authorized frontend origin.

Development configuration:

```text
Frontend → localhost:3000
Backend  → localhost:4000
```

Production origins must be explicitly configured rather than allowing arbitrary origins.

---

## Rate Limiting

The backend uses:

```text
@nestjs/throttler
```

Rate limits are configuration values.

They must not be treated as permanent architecture constants.

Different endpoints may have different limits based on their risk and expected traffic.

Exact values belong to configuration rather than this stack definition.

---

# 23. Local Infrastructure

## Docker

Docker is used for local infrastructure.

---

## Docker Compose

Docker Compose is used primarily for the local PostgreSQL environment.

Expected local database:

```text
PostgreSQL
    ↓
localhost:5432
```

The project should not introduce Redis, Kafka, RabbitMQ, Kubernetes, or other distributed infrastructure unless explicitly added to the approved project scope.

---

# 24. Port Configuration

The canonical local development ports are:

| Service            |   Port |
| ------------------ | -----: |
| Frontend — Next.js | `3000` |
| Backend — NestJS   | `4000` |
| PostgreSQL         | `5432` |

Therefore:

```text
Browser
   │
   ├── localhost:3000
   │       ↓
   │    Next.js
   │
   └── localhost:4000
           ↓
        NestJS API
           ↓
     PostgreSQL:5432
```

The backend is the API and WebSocket server.

---

# 25. Environment Configuration

Sensitive configuration must be provided through environment variables.

Examples include:

### Frontend

```text
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_WS_URL
```

### Backend

```text
DATABASE_URL
NODE_ENV
JWT_SECRET
JWT_EXPIRATION
CLOUDINARY_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

The exact environment variable names may be adjusted only through an explicit project decision.

Rules:

* `.env` files containing secrets must not be committed.
* `.env.example` should document required configuration without real secrets.
* Secrets must never be hard-coded.
* Public frontend variables must never contain backend secrets.

---

# 26. Shared Packages

## packages/types

`packages/types` is the Single Source of Truth for shared API contracts.

It contains shared TypeScript contracts required by both frontend and backend.

Examples:

```text
API request types
API response types
Message contracts
User contracts
Chat contracts
WebSocket event payloads
```

Frontend and backend should consume these contracts instead of independently redefining the same API structures.

---

## packages/constants

`packages/constants` contains shared constants.

Examples include:

```text
Error codes
Status values
Validation-related constants
WebSocket event names
API-related constants
```

Constants that are purely internal to one application should remain inside that application.

---

## packages/utils

`packages/utils` contains reusable, environment-independent utilities.

Examples:

```text
Formatters
Pure validators
Shared error helpers
Reusable transformation utilities
```

Utilities should not contain frontend-specific or backend-specific infrastructure logic.

---

# 27. Dependency Direction

The stack follows this general dependency direction:

```text
Frontend
   ↓
Shared Packages

Backend
   ↓
Shared Packages

Backend
   ↓
PostgreSQL
```

Shared packages must remain independent from the application layers.

They must not depend on:

* Next.js,
* NestJS,
* browser APIs,
* server-specific infrastructure.

---

# 28. Technology Selection Rules

When implementing a task:

1. Prefer technologies already defined in this file.
2. Do not introduce a new library merely for convenience.
3. Do not replace an approved technology without explicit approval.
4. Avoid duplicate libraries with overlapping responsibilities.
5. Use the simplest approved technology that satisfies the requirement.
6. A new dependency requires an explicit reason and approval.
7. A dependency must not be added only because an agent prefers it.

---

# 29. Explicitly Not in the Stack

The following technologies are intentionally not part of the current system architecture:

```text
Redis
Kafka
RabbitMQ
NATS
Kubernetes
WebSocket clustering
Message brokers
Distributed cache infrastructure
```

They must not be introduced as speculative scalability solutions.

If future requirements justify one of them, the project scope and architecture must be updated first.

---

# 30. Technology and Phase Boundaries

Not every technology needs to be actively implemented in Phase 0.

For example:

```text
Phase 0
├── npm / Workspaces
├── Next.js
├── React
├── TypeScript
├── NestJS
├── PostgreSQL
├── TypeORM
└── Docker Compose

Phase 1
├── JWT
├── bcryptjs
├── React Hook Form
├── Zod
└── Axios

Phase 2
└── Socket.IO

Phase 3
└── Search / Contacts using existing stack

Phase 4
├── Cloudinary
├── i18next
├── Winston
├── Rate Limiting
└── Performance / deployment-related tooling
```

The actual implementation order is controlled by `current-task.md`.

---

# 31. Stack Decision Rule

`stack.md` defines the approved technology choices.

If implementation requires a technology that is not listed here:

```text
STOP
  ↓
Identify the missing technology
  ↓
Explain why it is required
  ↓
Request approval
  ↓
Update stack.md if approved
  ↓
Continue implementation
```

The development agent must not silently add infrastructure or dependencies.

---

# 32. Final Stack Summary

```text
                         Email-Chat-Pro
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
          Frontend                             Backend
              │                                   │
       Next.js + React                       NestJS
       TypeScript                            TypeScript
       Tailwind                              PostgreSQL
       shadcn/ui                             TypeORM
       Zustand                               JWT
       TanStack Query                        bcryptjs
       React Hook Form                       Socket.IO
       Zod                                   Cloudinary
       Axios                                 Swagger
       Socket.IO Client                      Winston
       i18next                               Throttler
              │                              Helmet / CORS
              │                              Multer
              │                              class-validator
              │                                   │
              └──────────── Shared Packages ──────┘
                              │
                    packages/types
                    packages/constants
                    packages/utils

                    Infrastructure
                          │
                 npm Workspaces
                          │
                   Docker Compose
                          │
                    PostgreSQL
```

## Stack Invariants

* Frontend runs on port `3000`.
* Backend runs on port `4000`.
* PostgreSQL runs on port `5432`.
* Node.js version is `22+`.
* npm Workspaces is the monorepo mechanism.
* TypeScript is used across the project.
* PostgreSQL is the persistent database.
* TypeORM is the backend ORM.
* Zustand is for client/application state.
* TanStack Query is for server state.
* Socket.IO is the real-time communication technology.
* `packages/types` is the shared API-contract source of truth.
* Persian and English are the supported languages.
* New technologies require explicit approval.
* The stack must remain aligned with `features.md` and `architecture.md`.
