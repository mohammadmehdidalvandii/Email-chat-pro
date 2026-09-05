# Email-Chat-Pro — Working with Claude

## Project Overview

Email-Chat-Pro is a real-time 1-on-1 messaging platform where users communicate
via email-based accounts. This is a full-stack learning project built with
Next.js (frontend), NestJS (backend), and PostgreSQL (database).

The project is structured as a monorepo using pnpm workspaces with clear
separation of concerns:

- **Frontend** (apps/frontend): Next.js React application on localhost:3000
- **Backend** (apps/backend): NestJS API server on localhost:4000
- **Database**: PostgreSQL running on localhost:5432 (Docker)
- **Shared**: TypeScript types, constants, and utilities in packages/

## Project Structure

```
email-chat-pro/
├── apps/
│   ├── frontend/          # Next.js application
│   │   ├── public/locales/    # i18n translations
│   │   ├── src/
│   │   │   ├── app/           # Next.js pages
│   │   │   ├── components/    # React components (domain-based)
│   │   │   ├── hooks/         # Custom hooks
│   │   │   ├── services/      # API clients
│   │   │   ├── store/         # Zustand stores
│   │   │   ├── types/         # Local types
│   │   │   ├── utils/         # Utilities
│   │   │   ├── styles/        # Global CSS
│   │   │   └── config/        # Configuration
│   │   └── [config files]
│   │
│   └── backend/           # NestJS application
│       ├── src/
│       │   ├── modules/       # Feature modules
│       │   ├── common/        # Shared utilities
│       │   ├── config/        # Configuration
│       │   ├── database/      # Database setup
│       │   ├── constants/     # Constants
│       │   ├── utils/         # Utilities
│       │   └── main.ts        # App bootstrap
│       └── [config files]
│
├── packages/              # Shared code
│   ├── types/             # TypeScript types (API contracts)
│   ├── constants/         # Error messages, validation rules
│   └── utils/             # Shared utility functions
│
├── docs/                  # Context engineering files
│   ├── overview-project.md
│   ├── stack.md
│   ├── architecture.md
│   ├── features.md
│   ├── rules.md
│   ├── current-task.md
│   └── done.md
│
└── [root configs]

```

## Context Files (Single Source of Truth)

All development decisions are documented in context files. Always refer to them
in this priority order:

1. **overview-project.md** — Project goals, scope, user flows
2. **features.md** — What to build (phase-by-phase)
3. **architecture.md** — How to structure the system
4. **stack.md** — Which technologies to use
5. **rules.md** — How to write code (naming, patterns, standards)
6. **current-task.md** — What to work on now
7. **done.md** — What has been completed

If a rule or decision isn't in these files, it doesn't exist yet and should be
added before implementing.

## Development Workflow

### Starting a New Phase

1. Read all context files (especially features.md for current phase)
2. Open current-task.md and locate the current phase
3. Review prerequisites and dependencies
4. Read "Context Files to Review" section
5. Understand all subtasks for the phase
6. Create a new Git branch: `git checkout -b feature/phase-X-name`
7. Implement subtasks one by one
8. After each subtask: commit with proper message format
9. When phase complete: request code review from Mohammad Mehdi

### During Development

Follow these rules STRICTLY:

- **Read context files first** — Before writing any code, read relevant docs
- **Follow naming conventions** (rules.md) — Exactly
- **Follow folder structure** (architecture.md) — Exactly
- **No console.log** — Use Winston (backend) or Sonner (frontend)
- **Handle errors explicitly** — Never silent failures
- **Type safety** — TypeScript strict mode everywhere
- **Test before committing** — npm run type-check, npm run lint
- **Write clean commits** — Format: type: description
- **Keep commits small** — One logical change per commit
- **Push frequently** — Don't work locally for hours without pushing

### Code Review Process

Before requesting review:

1. All code committed and pushed to GitHub
2. npm run type-check passes (zero TS errors)
3. npm run lint passes (zero linting errors)
4. npm run build succeeds
5. All tests pass (if any)
6. No console.log or debug code
7. All acceptance criteria met
8. Docs updated if needed

Code review will be performed by Mohammad Mehdi. Approval required before
merging to main.

### After Approval

1. Phase moved from current-task.md to done.md
2. Write 100-150 word summary in done.md
3. Commit: "docs: Phase X complete"
4. Delete feature branch
5. Pull latest main
6. Begin next phase

## Important Rules

### Naming Conventions (from rules.md)

Files:
  - Backend: domain.service.ts, domain.entity.ts, domain.dto.ts
  - Frontend: PascalCase.tsx for components, camelCase.ts for utilities
  - Folders: kebab-case (auth-module, chat-messages)

Code:
  - Components: PascalCase (LoginForm.tsx)
  - Hooks: usePrefix (useAuth.ts)
  - Functions: camelCase (sendMessage)
  - Constants: UPPER_SNAKE_CASE (MAX_MESSAGE_LENGTH)
  - Types: PascalCase (User, LoginInput)
  - Booleans: is/has/can prefix (isLoading, hasMessages)

### Folder Structure (from architecture.md)

Frontend:
  - app/ — Next.js pages
  - components/ — Domain-based components
  - hooks/ — Custom hooks
  - services/ — API clients
  - store/ — Zustand stores
  - types/ — Local types
  - utils/ — Utilities

Backend:
  - modules/ — Feature modules
  - common/ — Shared utilities
  - config/ — Configuration
  - database/ — Database setup
  - constants/ — Constants
  - utils/ — Utilities

### Validation (from rules.md)

Email:
  - Format: RFC 5322 simplified
  - Min 5, Max 255 characters
  - Unique per user

Username:
  - Format: [a-zA-Z0-9_-]
  - Min 3, Max 30 characters
  - Case-insensitive

Password:
  - Min 8 characters
  - At least one uppercase, lowercase, digit, special char
  - Hashed with bcryptjs

### API Response Format (from architecture.md)

Success:
  ```json
  {
    "success": true,
    "data": { ... },
    "timestamp": "2024-01-15T10:30:00Z"
  }
  ```

Error:
  ```json
  {
    "success": false,
    "error": {
      "code": "ERROR_CODE",
      "message": "Human readable message"
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
  ```

## Getting Started

### Prerequisites

- Node.js v22+
- Docker and Docker Compose
- Git
- pnpm (npm install -g pnpm)

### Initial Setup

```bash
# Clone repository
git clone <repo-url>
cd email-chat-pro

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with your values (database credentials, etc)

# Start PostgreSQL
docker-compose up -d

# Start development servers
pnpm run dev

# Frontend: http://localhost:3000
# Backend: http://localhost:4000
# API Docs: http://localhost:4000/api/docs
```

### Available Commands

```bash
# Development
npm run dev              # Start all services
npm run frontend:dev     # Start frontend only
npm run backend:dev      # Start backend only

# Building
npm run build            # Build all projects
npm run frontend:build   # Build frontend
npm run backend:build    # Build backend

# Quality checks
ppm run type-check       # TypeScript strict check
ppm run lint             # ESLint check
ppm run format           # Prettier format
ppm run format:check     # Check formatting

# Testing (when available)
npm run test             # Run all tests
npm run test:e2e         # End-to-end tests

# Database
npm run db:migrate       # Run migrations
npm run db:seed          # Seed database (optional)
```

### Git Workflow

```bash
# Start new phase
git checkout -b feature/phase-0-infrastructure

# Make changes, commit frequently
git commit -m "chore: setup monorepo with pnpm"
git commit -m "feat: initialize Next.js frontend"

# Push to GitHub
git push origin feature/phase-0-infrastructure

# Create Pull Request on GitHub
# Request review from Mohammad Mehdi
# Address feedback, push new commits
# Merge after approval
```

## Common Tasks

### Adding a New Dependency

Frontend:
```bash
cd apps/frontend
npm add package-name
```

Backend:
```bash
cd apps/backend
npm add package-name
```

Shared package:
```bash
cd packages/types  # or constants, utils
pnpm add package-name
```

### Creating a New Component

1. Create file: apps/frontend/src/components/Domain/ComponentName.tsx
2. Follow component pattern from existing components
3. Import types from @/packages/types
4. Import constants from @/packages/constants
5. Use hooks from src/hooks/
6. Test locally with npm run dev

### Creating a New API Endpoint

1. Create controller in apps/backend/src/modules/domain/
2. Create service in same folder
3. Add DTO in dto/ subfolder
4. Add entity in entities/ subfolder if needed
5. Export types in @/packages/types
6. Test with Swagger docs at /api/docs
7. Verify response format matches architecture.md

### Debugging

Frontend:
- Browser DevTools (F12)
- Console logs in development only
- Check Redux DevTools for Zustand stores
- TanStack Query DevTools for server state

Backend:
- Terminal logs (Winston)
- Debug breakpoints in VS Code
- Check /api/docs for endpoint testing
- Database logs from Docker

## When Stuck

1. Check context files (docs/)
2. Read relevant section in rules.md
3. Check architecture.md for patterns
4. Look at existing code examples
5. Ask Mohammad Mehdi for clarification
6. Document the solution in appropriate context file

## Phases

Phase 0: Infrastructure (4-6 hours)
  - Monorepo setup
  - Frontend and backend initialization
  - Docker PostgreSQL
  - Configuration and documentation

Phase 1: Authentication (8-10 hours)
  - User registration and email verification
  - Login/logout with JWT
  - Profile management
  - Account deletion

Phase 2: Real-time Messaging (10-12 hours)
  - Socket.IO server
  - Message persistence
  - Chat UI components
  - Image/video support

Phase 3: Contact Management (8-10 hours)
  - User search
  - Contact requests
  - Messaging restrictions
  - Contact lists

Phase 4: Advanced Features (12-15 hours)
  - Internationalization (Persian, English, Spanish)
  - Rate limiting
  - Performance optimization
  - Typing indicators
  - Online status
  - Password reset
  - Activity logging

## Contact

For questions about:
- Code decisions → Check context files first
- Architecture → Read architecture.md
- Naming → Check rules.md
- Features → Check features.md and current-task.md
- General guidance → Ask Mohammad Mehdi

## Last Updated

2025-01-15

This document should be updated as the project evolves. Changes to workflow,
guidelines, or standards should be documented here and in relevant context files.