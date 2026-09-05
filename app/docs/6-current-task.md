# Email-Chat-Pro — Current Task Tracking

This file tracks the current phase of development. Each phase has prerequisites,
subtasks, acceptance criteria, and guidelines. When a subtask is complete, move
it to done.md with a professional summary.

Before starting any phase:
  1. Read all context files (overview-project.md, stack.md, rules.md, features.md, architecture.md)
  2. Review the phase description in this file
  3. Understand prerequisites and dependencies
  4. Check File Review section
  5. Follow all Key Guidelines
  6. Test according to Testing Checklist
  7. Commit according to Commit Strategy
  8. Request code review per Code Review Points

---

## Phase 0: Infrastructure and Project Setup

Status: IN PROGRESS
Priority: Critical
Estimated Duration: 4-6 hours

Phase Overview

Set up monorepo structure with all dependencies, folder layouts, and development
environment. This phase is the foundation for all subsequent phases. No feature
code is written in Phase 0; only infrastructure.

Prerequisites

  - Node.js v22+ installed locally
  - Docker and Docker Compose installed
  - Git initialized and ready for commits
  - GitHub repository created and cloned locally
  - Package manager pnpm installed globally

Dependencies

  - Phase 0 has no dependencies (starting phase)
  - All other phases depend on Phase 0 completion

Context Files to Review

  - overview-project.md: Read "Architecture overview" section
  - stack.md: Understand each tool and its purpose
  - rules.md: Read "Folder Structure Rules" section
  - architecture.md: Understand "Folder Layout" section
  - features.md: Understand what Phase 0 includes

Key Guidelines

  - Follow naming conventions from rules.md exactly
  - Use folder structure from architecture.md as template
  - Do not write any business logic (auth, messaging, etc)
  - All dependencies must be latest stable versions
  - Use pnpm instead of npm for package management
  - Docker Compose must work without manual configuration
  - All .env files must have .env.example template

Subtasks (Phase 0)

Subtask 0.1: Monorepo Setup with pnpm Workspaces
  Status: [ ] Pending
  Description: Create monorepo root with pnpm-workspace.yaml. Configure pnpm
  settings. Initialize root package.json. Setup path aliases (@/packages/*, @/apps/*).
  
  Acceptance Criteria:
    - pnpm-workspace.yaml created with apps/ and packages/ workspaces
    - Root package.json configured
    - Path aliases working in both TS paths
    - pnpm install succeeds with no errors
    - Root tsconfig.base.json extends to all apps
    - ESLint and Prettier configs at root apply to all projects
  
  Files to Create:
    - pnpm-workspace.yaml
    - package.json (root)
    - tsconfig.base.json
    - .eslintrc.json (root)
    - .prettierrc
  
  Estimated Duration: 45 minutes
  
  Testing:
    - pnpm install completes
    - pnpm list shows all workspaces
    - TypeScript resolves path aliases
  
  Commits:
    - "chore: setup monorepo with pnpm workspaces"
    - "chore: configure root tsconfig and linting"

Subtask 0.2: Frontend App Initialization (Next.js)
  Status: [ ] Pending
  Description: Create apps/frontend with Next.js app router. Install all frontend
  dependencies from stack.md. Setup initial Next.js configuration.
  
  Acceptance Criteria:
    - Next.js app created in apps/frontend
    - App Router structure ready (no pages yet)
    - TypeScript strict mode enabled
    - Tailwind CSS configured
    - ShadCN UI initialized
    - All frontend dependencies installed
    - next.config.ts configured
    - tailwind.config.ts configured
    - tsconfig.json configured with strict mode
  
  Dependencies to Install:
    - next, react, react-dom
    - typescript
    - tailwind-css, autoprefixer, postcss
    - @shadcn/ui
    - zustand, @tanstack/react-query
    - react-hook-form, zod, @hookform/resolvers
    - socket.io-client, axios
    - sonner, react-window, lucide-react
    - sweetalert2
    - i18next, next-i18next
    - eslint, prettier, @types/node, @types/react
  
  Files to Create:
    - apps/frontend/package.json
    - apps/frontend/next.config.ts
    - apps/frontend/tsconfig.json
    - apps/frontend/tailwind.config.ts
    - apps/frontend/postcss.config.js
    - apps/frontend/.eslintrc.json
    - Initial folder structure from architecture.md
  
  Estimated Duration: 1 hour
  
  Testing:
    - npm run dev starts frontend on port 3000
    - Next.js compiles without errors
    - TypeScript strict check passes
    - ESLint shows no errors
  
  Commits:
    - "feat: initialize Next.js frontend app"
    - "feat: configure Tailwind CSS and ShadCN UI"
    - "feat: setup TypeScript strict mode and linting"

Subtask 0.3: Backend App Initialization (NestJS)
  Status: [ ] Pending
  Description: Create apps/backend with NestJS. Install all backend dependencies
  from stack.md. Setup initial NestJS configuration.
  
  Acceptance Criteria:
    - NestJS CLI app created in apps/backend
    - All backend dependencies installed
    - TypeScript strict mode enabled
    - nest-cli.json configured
    - TypeORM configured (PostgreSQL)
    - Swagger configured
    - Winston logger configured
    - Rate limiting configured
    - CORS configured
    - Helmet configured
    - tsconfig.json configured with strict mode
  
  Dependencies to Install:
    - @nestjs/core, @nestjs/common, @nestjs/platform-express
    - @nestjs/typeorm, typeorm, pg (PostgreSQL driver)
    - @nestjs/jwt, @nestjs/passport, passport, passport-jwt
    - @nestjs/websockets, @nestjs/platform-socket.io, socket.io
    - @nestjs/swagger, swagger-ui-express
    - @nestjs/throttler
    - bcryptjs
    - class-validator, class-transformer
    - winston, helmet, cors
    - zod
    - typescript, @types/node, @types/express
    - eslint, prettier, ts-loader
  
  Files to Create:
    - apps/backend/package.json
    - apps/backend/nest-cli.json
    - apps/backend/tsconfig.json
    - apps/backend/.eslintrc.json
    - apps/backend/src/main.ts (bootstrap)
    - apps/backend/src/app.module.ts
    - Initial module structure from architecture.md
  
  Estimated Duration: 1 hour
  
  Testing:
    - npm run start:dev starts backend on port 4000
    - NestJS compiles without errors
    - TypeScript strict check passes
    - ESLint shows no errors
  
  Commits:
    - "feat: initialize NestJS backend app"
    - "feat: configure TypeORM and PostgreSQL"
    - "feat: setup authentication and security modules"

Subtask 0.4: Shared Packages Setup
  Status: [ ] Pending
  Description: Create packages/types, packages/constants, and packages/utils.
  Setup TypeScript compilation and path aliases for shared packages.
  
  Acceptance Criteria:
    - packages/types/package.json created
    - packages/constants/package.json created
    - packages/utils/package.json created
    - Each package has tsconfig.json
    - Each package has index.ts (exports all)
    - Path alias @/packages/types working
    - Path alias @/packages/constants working
    - Path alias @/packages/utils working
    - Build process for each package working
  
  Files to Create:
    - packages/types/package.json
    - packages/types/tsconfig.json
    - packages/types/src/index.ts
    - packages/constants/package.json
    - packages/constants/tsconfig.json
    - packages/constants/src/index.ts
    - packages/utils/package.json
    - packages/utils/tsconfig.json
    - packages/utils/src/index.ts
  
  Estimated Duration: 30 minutes
  
  Testing:
    - Import from @/packages/types in both apps works
    - TypeScript finds types without errors
    - pnpm build compiles all packages
  
  Commits:
    - "feat: create shared packages (types, constants, utils)"
    - "feat: setup package path aliases"

Subtask 0.5: Docker and PostgreSQL Setup
  Status: [ ] Pending
  Description: Create docker-compose.yml with PostgreSQL service. Configure
  database connection, environment variables, and health checks.
  
  Acceptance Criteria:
    - docker-compose.yml created with PostgreSQL 15+
    - Volume mounted for data persistence (/var/lib/postgresql/data)
    - Environment variables configured (POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD)
    - Health check configured for database
    - Port 5432 exposed
    - Backend can connect to database
    - Database accessible via psql or database client
  
  Files to Create:
    - docker-compose.yml (root)
    - .env.example with database credentials
    - Backend database connection config
  
  Estimated Duration: 30 minutes
  
  Testing:
    - docker-compose up starts PostgreSQL
    - Database accessible on localhost:5432
    - Backend can connect and run migrations
    - docker-compose down stops cleanly
    - Volume persists data across restart
  
  Commits:
    - "chore: add docker-compose with PostgreSQL"
    - "chore: configure database connection"

Subtask 0.6: Environment and Configuration Files
  Status: [ ] Pending
  Description: Create .env.example templates and environment configuration files.
  Setup environment variable validation schema.
  
  Acceptance Criteria:
    - .env.example file in root with all required variables
    - Backend .env.example with database, JWT, Cloudinary vars
    - Frontend .env.example with API URLs
    - Environment variable validation schema
    - TypeScript can read environment variables safely
    - .env files in .gitignore
    - All secrets documented in .env.example
  
  Files to Create:
    - .env.example (root)
    - apps/backend/.env.example
    - apps/frontend/.env.example
    - Backend env validation (backend/src/config/validation.schema.ts)
    - Frontend env loading (frontend/src/config/env.ts)
  
  Estimated Duration: 30 minutes
  
  Testing:
    - Backend validates .env on startup
    - Frontend loads NEXT_PUBLIC_* variables
    - Type safety for environment variables
  
  Commits:
    - "chore: add .env.example templates"
    - "chore: setup environment validation"

Subtask 0.7: Frontend Folder Structure
  Status: [ ] Pending
  Description: Create all frontend folders according to architecture.md. No files
  written yet (only folder structure). Create folder layout for pages, components,
  hooks, services, stores, etc.
  
  Acceptance Criteria:
    - All folders from architecture.md created in apps/frontend/src
    - Folder organization matches architecture.md exactly
    - Subfolders for components (Auth, Chat, Layout, Common, Providers)
    - Config and constants folders ready
    - No code files yet (folders only)
  
  Estimated Duration: 15 minutes
  
  Testing:
    - All folders exist as per architecture.md
    - No build errors (empty folders)
  
  Commits:
    - "chore: create frontend folder structure"

Subtask 0.8: Backend Folder Structure and Modules
  Status: [ ] Pending
  Description: Create all backend folders according to architecture.md. Create
  empty module structure (no code yet).
  
  Acceptance Criteria:
    - All folders from architecture.md created in apps/backend/src
    - Folder organization matches architecture.md exactly
    - Module folders created (auth, users, chat, messages, contacts, websocket, files)
    - Common folder for shared backend utilities
    - Config and database folders ready
    - Empty module.ts for each module
  
  Estimated Duration: 15 minutes
  
  Testing:
    - All folders exist as per architecture.md
    - NestJS can compile without module code
  
  Commits:
    - "chore: create backend folder structure"
    - "chore: initialize empty NestJS modules"

Subtask 0.9: GitHub Repository Setup and CI/CD Basics
  Status: [ ] Pending
  Description: Configure GitHub repository with .gitignore, README, and basic
  CI/CD (optional: GitHub Actions for linting/type-checking).
  
  Acceptance Criteria:
    - Comprehensive .gitignore (node_modules, .env, build outputs, etc)
    - Root README.md with project overview
    - GitHub branch protection rules (main)
    - .gitattributes for line endings
    - Optional: GitHub Actions workflow for type-check and lint
  
  Files to Create:
    - .gitignore (comprehensive)
    - README.md (root)
    - .gitattributes
    - Optional: .github/workflows/ci.yml
  
  Estimated Duration: 30 minutes
  
  Testing:
    - git status shows correct ignored files
    - README readable and clear
    - GitHub Actions (if used) runs successfully
  
  Commits:
    - "chore: add .gitignore and repository setup"
    - "docs: add comprehensive README"
    - "chore: setup GitHub Actions CI" (optional)

Subtask 0.10: Documentation and Setup Instructions
  Status: [ ] Pending
  Description: Create setup documentation for developers. Include how to install,
  run locally, and debug.
  
  Acceptance Criteria:
    - docs/SETUP.md with installation steps
    - docs/DEVELOPMENT.md with how to run locally
    - docs/DEBUGGING.md with debugging tips
    - docs/DATABASE.md with database setup and migrations
    - Database initialization script (optional)
    - Example .env files are clear and complete
  
  Files to Create:
    - docs/SETUP.md
    - docs/DEVELOPMENT.md
    - docs/DEBUGGING.md
    - docs/DATABASE.md
  
  Estimated Duration: 30 minutes
  
  Testing:
    - Follow SETUP.md → project runs locally
    - npm run dev starts all services
    - Database initializes correctly
  
  Commits:
    - "docs: add setup and development documentation"

Phase 0 Acceptance Criteria (Overall)

All of the following must be true to mark Phase 0 as complete:

  - Monorepo structure created and working
  - Frontend and backend apps initialize without errors
  - All dependencies installed successfully
  - Docker Compose starts PostgreSQL
  - Folder structure matches architecture.md
  - All configuration files in place
  - Environment variables documented
  - TypeScript strict mode enabled everywhere
  - ESLint and Prettier configured globally
  - Path aliases (@/packages/*, @/apps/*) working
  - npm run dev starts frontend on port 3000
  - npm run start:dev starts backend on port 4000
  - PostgreSQL running on port 5432
  - pnpm install succeeds (no conflicts)
  - No TypeScript errors
  - No linting errors
  - All commits follow format from rules.md
  - Code review approved by Mohammad Mehdi

Testing Checklist for Phase 0

  ✓ pnpm install completes without errors
  ✓ npm run dev (frontend) starts on 3000
  ✓ npm run start:dev (backend) starts on 4000
  ✓ docker-compose up starts PostgreSQL on 5432
  ✓ TypeScript strict mode passes (npm run type-check)
  ✓ ESLint passes (npm run lint)
  ✓ Prettier check passes (npm run format)
  ✓ Path aliases resolve correctly
  ✓ Shared packages compile
  ✓ No console errors or warnings
  ✓ .env.example is complete and clear

Commit Strategy for Phase 0

Commits should follow the format: type: description (from rules.md)

Types for Phase 0:
  - chore: infrastructure changes
  - feat: new package or tool setup
  - docs: documentation
  - config: configuration files

Example commits:
  chore: setup monorepo with pnpm workspaces
  feat: initialize Next.js frontend app
  feat: initialize NestJS backend app
  feat: create shared packages
  chore: add docker-compose with PostgreSQL
  chore: configure environment variables
  docs: add setup and development documentation

Each subtask should have at least one commit. Larger subtasks may have 2-3
commits (feature + configuration + testing).

Code Review Points for Phase 0

Before requesting review, ensure:

  ✓ All subtasks completed
  ✓ npm run type-check passes (no TS errors)
  ✓ npm run lint passes (no linting errors)
  ✓ npm run build succeeds (both apps)
  ✓ Docker Compose runs without errors
  ✓ .env.example is complete
  ✓ README.md is clear and accurate
  ✓ All commits follow message format
  ✓ No console.log statements left
  ✓ No security issues (secrets, API keys in code)
  ✓ Folder structure matches architecture.md
  ✓ All dependencies are necessary and up-to-date
  ✓ TypeScript path aliases work correctly

Reviewer (Mohammad Mehdi) will check:
  - Does Phase 0 match features.md Phase 0 requirements?
  - Is the structure aligned with architecture.md?
  - Are all naming conventions from rules.md followed?
  - Can the project be run locally as described?
  - Are there any breaking changes or issues?
  - Is documentation clear for Phase 1 developers?

Breaking Changes

Phase 0 is infrastructure only. No breaking changes expected. All subsequent
phases depend on this foundation, so any misconfiguration here will impact later
phases.

If issues discovered during Phase 0:
  1. Document the issue clearly
  2. Create a fix commit: fix: description
  3. Request code review again
  4. Do not proceed to Phase 1 until Phase 0 fully approved

---

## Phase 1: Authentication and User Profile Management

Status: NOT STARTED
Prerequisites: Phase 0 completion and approval
Estimated Duration: 8-10 hours

This phase will implement user registration, email verification, login/logout,
profile management, and JWT authentication.

To begin Phase 1:
  - Phase 0 must be approved and merged
  - Review: overview-project.md, features.md (Phase 1), architecture.md, rules.md
  - Create new GitHub branch: feature/phase-1-auth
  - Update this file with Phase 1 subtasks once approved

---

## Phase 2: Real-time Messaging Core

Status: NOT STARTED
Prerequisites: Phase 1 completion and approval
Estimated Duration: 10-12 hours

This phase will implement chat interface, message sending, WebSocket server, and
message persistence.

To begin Phase 2:
  - Phase 1 must be approved and merged
  - Review: features.md (Phase 2), architecture.md (WebSocket Events)
  - Create new GitHub branch: feature/phase-2-messaging

---

## Phase 3: Contact Management and Search

Status: NOT STARTED
Prerequisites: Phase 2 completion and approval
Estimated Duration: 8-10 hours

This phase will implement user search, contact requests, and messaging restrictions.

To begin Phase 3:
  - Phase 2 must be approved and merged
  - Review: features.md (Phase 3), architecture.md (Contact Requests)
  - Create new GitHub branch: feature/phase-3-contacts

---

## Phase 4: Internationalization, Rate Limiting, Performance

Status: NOT STARTED
Prerequisites: Phase 3 completion and approval
Estimated Duration: 12-15 hours

This phase will implement i18n, rate limiting, performance optimization, and
advanced features (online status, typing indicators, etc).

To begin Phase 4:
  - Phase 3 must be approved and merged
  - Review: features.md (Phase 4), stack.md (i18next), architecture.md (Rate Limiting)
  - Create new GitHub branch: feature/phase-4-polish

---

## Guidelines for Development

During Development:

  1. Always reference context files (overview-project.md, features.md, architecture.md, rules.md)
  2. Follow naming conventions from rules.md exactly
  3. Follow folder structure from architecture.md
  4. No console.log in production code
  5. Handle errors explicitly (never silent failures)
  6. Write tests (unit, integration where applicable)
  7. Keep commits small and focused
  8. Push to GitHub frequently
  9. Do not merge to main without approval
  10. Update done.md when phase completes

Before Requesting Code Review:

  1. All type checks pass (npm run type-check)
  2. All linting passes (npm run lint)
  3. All tests pass (npm run test)
  4. Build succeeds (npm run build)
  5. No console.log or debug code
  6. All commits follow message format
  7. All acceptance criteria met
  8. Documentation updated if needed
  9. README updated if needed

After Approval:

  1. Move phase from current-task.md to done.md
  2. Write 100-word summary in done.md describing what was built
  3. Create commit: "docs: Phase X complete" (with summary in commit message)
  4. Delete feature branch after merge
  5. Pull latest main
  6. Begin next phase