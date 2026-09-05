# Email-Chat-Pro — Code and Development Rules

## Single Source of Truth

All development follows these context files in order of authority:
1. overview-project.md — project scope and goals
2. features.md — what to build
3. architecture.md — how to structure it
4. stack.md — which technologies to use
5. rules.md — how to write code (this file)
6. current-task.md — what to work on now
7. done.md — what has been completed

Never start work on anything not listed in features.md. Never deviate from
architecture.md structure. Never violate rules.md standards.

## Development Phase Workflow

Every phase follows this exact process:

Step 1: Check current-task.md
Read the current phase description. This is the single source of truth for
what to build. Do not start a phase until it is explicitly listed there.

Step 2: Develop the Phase
Write code following all rules in this file (naming, structure, standards).
Test locally. Ensure all types check and lints pass.

Step 3: Commit to GitHub
Commit with message format: phase: short description (example: phase-1: auth-module-setup)
Push to GitHub. Do not merge to main until approval.

Step 4: Request Formal Approval
Post GitHub commit link. Wait for Mohammad Mehdi formal approval.
Do not proceed without explicit approval.

Step 5: Mark as Done
After approval, move phase description from current-task.md to done.md.
Add completion summary: 100 words max, describe what was built and why.

Step 6: Next Phase
Update current-task.md with next phase. Repeat cycle.

No shortcuts. Every phase requires approval before moving to next.

## Naming Conventions

File Naming

Backend NestJS:
  - Services: domain.service.ts (auth.service.ts, user.service.ts)
  - Controllers: domain.controller.ts (auth.controller.ts)
  - Entities: domain.entity.ts (user.entity.ts, message.entity.ts)
  - DTOs: create-domain.dto.ts, update-domain.dto.ts
  - Modules: domain.module.ts
  - Gateways: domain.gateway.ts
  - Guards: domain.guard.ts

Frontend Next.js:
  - Components: PascalCase.tsx (LoginForm.tsx, ChatWindow.tsx)
  - Pages: lowercase with brackets for dynamic routes
  - Hooks: use-domain.ts or useDomain.ts
  - Services: domain.service.ts or domainService.ts
  - Stores: domainStore.ts or domain-store.ts
  - Utils: domain.utils.ts or domainUtils.ts

Shared Packages:
  - Types: domain.types.ts (auth.types.ts, message.types.ts)
  - Constants: domain.constants.ts
  - Utils: domain.utils.ts

Folders:
  - Always kebab-case (auth-module, chat-messages, user-profile)
  - No underscores, no CamelCase for directories

Code Elements

Classes and Types:
  - PascalCase: LoginRequest, UserProfile, MessagePayload, AuthService
  - No prefixes or suffixes (avoid UserModel, UserInterface, UserImpl)

Functions and Methods:
  - camelCase: sendMessage, formatDate, validateEmail, getUserById
  - Descriptive names, no abbreviations (not getMsg, use getMessage)

Variables and Constants:
  - camelCase for variables: isLoading, messageCount, userEmail
  - UPPER_SNAKE_CASE for constants: MAX_MESSAGE_LENGTH, JWT_EXPIRATION, API_TIMEOUT
  - Prefix booleans: isAuthenticated, hasMessages, canDelete, shouldRefresh
  - Avoid single letters except in loops (not x, use index)

Hooks:
  - Always use prefix: useAuth, useChat, useForm, useWebSocket
  - Descriptive: useEmailVerification, useContactRequests, useMessageHistory

Database:
  - Table names: snake_case plural (users, chat_messages, contact_requests)
  - Column names: snake_case (user_id, created_at, updated_at)
  - Foreign keys: {related_table}_id (user_id, chat_id, message_id)
  - Boolean columns: is_active, has_verified, can_message

API Endpoints:
  - RESTful resource-based: /users, /messages, /contacts
  - Actions as subresources: /contacts/{id}/accept, /messages/{id}/reactions
  - Query params for filters: /messages?chatId=123&limit=50
  - No verbs in URLs (not /getUserMessages, use GET /users/{id}/messages)

## Code Style and Standards

General

Line Length: Maximum 100 characters. Break long lines for readability.

Indentation: 2 spaces. No tabs. Tab size set to 2 in all editors.

Quotes: Single quotes for strings. Double quotes only in JSON/templates.
  Example: const message = 'Hello user';
  Not: const message = "Hello user";

Semicolons: No semicolons at end of statements (Prettier removes them).
  Example: const x = 5
  Not: const x = 5;

Trailing Commas: Yes in multiline objects/arrays.
  Example:
    const obj = {
      name: 'John',
      email: 'john@example.com',
    }
  Not:
    const obj = {
      name: 'John',
      email: 'john@example.com'
    }

Imports: No wildcard imports. Always use named imports.
  Correct: import { LoginService } from './login.service'
  Wrong: import * as authModule from './auth.module'

No console.log in Production

Remove all console.log, console.error, console.warn before committing.
Use Winston logger on backend, Sonner toast on frontend.
  Backend: this.logger.log('User logged in', userId)
  Frontend: toast.success('Message sent')

Error Handling

Every error must be caught and handled. Never let errors silently fail.

Backend:
  - Throw HttpException with appropriate status code
  - Always include error code and message from packages/constants
  - Log error with Winston before throwing

Frontend:
  - Catch promises with .catch() or try/catch
  - Show user-friendly toast message
  - Log error details for debugging (in development only)

Example Backend:
  try {
    const user = await this.usersService.findById(id)
    return user
  } catch (error) {
    this.logger.error('User not found', { id, error })
    throw new HttpException(ERROR_MESSAGES.USER_NOT_FOUND, HttpStatus.NOT_FOUND)
  }

Example Frontend:
  try {
    const response = await authService.login(email, password)
    return response
  } catch (error) {
    toast.error(error.message)
    throw error
  }

## TypeScript Strict Mode

Enable strict mode in all tsconfig.json files:
  "strict": true
  "noImplicitAny": true
  "strictNullChecks": true
  "strictFunctionTypes": true
  "strictBindCallApply": true
  "strictPropertyInitialization": true
  "noImplicitThis": true
  "alwaysStrict": true
  "noUnusedLocals": true
  "noUnusedParameters": true
  "noImplicitReturns": true
  "noFallthroughCasesInSwitch": true

Never use 'any' type. Use 'unknown' if you truly don't know the type.
  Wrong: const data: any = response.data
  Correct: const data: unknown = response.data

Types vs Interfaces

Use Interfaces for contracts (API responses, entity shapes):
  interface User {
    id: string
    email: string
    username: string
  }

Use Types for unions, tuples, and complex logic:
  type LoginResponse = { token: string } | { error: string }
  type Coordinates = [number, number]

All exported types go in packages/types or domain.types.ts.
Never duplicate type definitions.

Generic Type Naming

Use descriptive type parameters:
  Correct: <T extends User>
  Not: <T>
  Correct: <TResponse>
  Not: <R>

## Import Order

Always order imports in this sequence with blank lines between groups:

Group 1: External libraries
  import React, { useState } from 'react'
  import { NestFactory } from '@nestjs/core'

Group 2: Shared packages
  import { User, LoginInput } from '@/packages/types'
  import { ERROR_MESSAGES } from '@/packages/constants'

Group 3: Local modules and services
  import { AuthService } from './auth.service'
  import { LoginForm } from '../components/LoginForm'

Group 4: Relative imports (utils, helpers)
  import { formatDate } from '../utils/date'
  import { validateEmail } from '../utils/validation'

Example:
  import React from 'react'
  import { useQuery } from '@tanstack/react-query'

  import { User } from '@/packages/types'
  import { API_ENDPOINTS } from '@/packages/constants'

  import { AuthService } from '../services/auth.service'
  import { Header } from '../components/Layout/Header'

  import { formatUserName } from '../utils/formatting'

## Folder Structure Rules

Frontend

src/
  app/                 — Next.js pages (group-based routes)
  components/          — React components organized by domain
    Auth/              — login, register, email verification
    Chat/              — chat window, message list, input
    Email/             — email integration components
    Layout/            — header, sidebar, navigation
    Common/            — reusable UI components
    Providers/         — context/provider wrappers
  hooks/               — custom React hooks (useAuth, useChat, etc)
  services/            — API service layer (Axios clients)
  store/               — Zustand stores (authStore, chatStore, etc)
  types/               — local TypeScript types (if any)
  utils/               — utility functions (validators, formatters)
  styles/              — global CSS files
  config/              — configuration (i18n, api urls, env)
  constants/           — local constants (ui strings, limits)

Backend

src/
  modules/             — feature modules
    auth/              — authentication module
      auth.controller.ts
      auth.service.ts
      auth.module.ts
      dto/
        login.dto.ts
        register.dto.ts
      entities/
        user.entity.ts
      strategies/
        jwt.strategy.ts
    users/             — user management
    chat/              — chat logic
    messages/          — message entities and logic
    websocket/         — WebSocket gateway
    files/             — file upload service
  common/              — shared backend utilities
    decorators/        — custom decorators
    exceptions/        — exception classes
    pipes/             — validation pipes
    middleware/        — middleware functions
  config/              — configuration files
  database/            — database setup, migrations
  utils/               — utility functions
  constants/           — error messages, constants
  main.ts              — app bootstrap

Never mix concerns. Each module handles one domain. Shared logic goes to
common/ or packages/.

## API Contracts

All API endpoints must follow RESTful conventions.

Request Format

All requests use JSON. Content-Type: application/json.
Request body follows this format:
  {
    "data": { ... },
    "metadata": { ... }
  }

Response Format

All responses follow standard format:
  Success (200, 201):
    {
      "success": true,
      "data": { ... },
      "message": "Operation completed"
    }

  Error (400, 401, 404, 500):
    {
      "success": false,
      "error": {
        "code": "USER_NOT_FOUND",
        "message": "User with this email does not exist"
      },
      "timestamp": "2024-01-15T10:30:00Z"
    }

Status Codes

200 OK — Request successful, data returned
201 Created — Resource created successfully
400 Bad Request — Invalid input or validation error
401 Unauthorized — Missing or invalid authentication
403 Forbidden — User authenticated but not authorized
404 Not Found — Resource does not exist
409 Conflict — Resource already exists or conflict
422 Unprocessable Entity — Validation failed
500 Internal Server Error — Server error
503 Service Unavailable — Service temporarily unavailable

Endpoint Naming

GET /users — List all users
GET /users/{id} — Get specific user
POST /users — Create new user
PATCH /users/{id} — Update user
DELETE /users/{id} — Delete user

GET /users/{id}/messages — List user's messages
POST /users/{id}/contacts — Send contact request
PATCH /contacts/{id}/accept — Accept contact request

Sub-resources use the pattern: /{resource}/{id}/{sub-resource}

## Database Rules

Schema Design

Every table must have:
  id: UUID primary key
  created_at: timestamp (auto-set to now)
  updated_at: timestamp (auto-set to now, auto-update on change)
  deleted_at: timestamp nullable (for soft deletes)

Relationships

Foreign keys must be explicit:
  CREATE TABLE messages (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    chat_id UUID NOT NULL REFERENCES chats(id),
    created_at TIMESTAMP DEFAULT NOW(),
    ...
  )

Data Integrity

Use database constraints:
  NOT NULL for required fields
  UNIQUE for unique values (email, username)
  CHECK for valid values (status in ('active', 'inactive'))
  DEFAULT for default values

Never rely on application code alone for data integrity.

Soft Deletes

Use deleted_at column instead of physical deletion:
  UPDATE users SET deleted_at = NOW() WHERE id = ?
  SELECT * FROM users WHERE deleted_at IS NULL

This preserves data and relationships. When user is deleted, messages remain
but attributed to "Deleted User".

Indexes

Add indexes for frequently queried columns:
  CREATE INDEX idx_users_email ON users(email)
  CREATE INDEX idx_messages_chat_id ON messages(chat_id)
  CREATE INDEX idx_messages_created_at ON messages(created_at)

No N+1 queries. Always join or load relationships eagerly.

## Testing Requirements

Unit Tests

Write tests for:
  - Service methods (business logic)
  - Utility functions
  - Validators and formatters

Naming: domain.service.spec.ts

Test format:
  describe('AuthService', () => {
    describe('validatePassword', () => {
      it('should return true for valid password', () => {
        expect(authService.validatePassword('correct')).toBe(true)
      })

      it('should return false for invalid password', () => {
        expect(authService.validatePassword('wrong')).toBe(false)
      })
    })
  })

Integration Tests

Test complete features:
  - User registration with email verification
  - Login and JWT token generation
  - Message sending and receiving
  - Contact request flow

Run before every commit.

End-to-End Tests

Test user workflows with real browser:
  - Sign up, verify email, complete profile
  - Search user, send request, accept
  - Send message, receive in real time
  - Refresh page, message history still there

Must pass with two browser windows side by side.

Test Commands

npm run test — Run all unit tests
npm run test:integration — Run integration tests
npm run test:e2e — Run end-to-end tests
All must pass before commit.

## Documentation Requirements

Code Comments

Add comments only when why is unclear, never for obvious code.
  Wrong:
    // Get user by id
    const user = await usersService.findById(id)

  Correct:
    // Fetch user with all related messages (N+1 prevention requires eager load)
    const user = await usersService.findByIdWithMessages(id)

JSDoc for Exported Functions

  /**
   * Validates email format and checks if already registered.
   * @param email - User email to validate
   * @returns true if valid and not registered, false otherwise
   */
  async validateEmailForSignup(email: string): Promise<boolean> {
    ...
  }

README Files

Every package and app folder must have README.md:
  - What this package does
  - How to install dependencies
  - How to run/build
  - Key files and their purpose
  - Any setup required

Phase Documentation

When completing a phase, update relevant docs:
  - Add new endpoints to architecture.md
  - Add new files to rules.md examples
  - Update setup instructions if needed

## Git and Commit Rules

Commit Message Format

Format: type: description

Types:
  feat: New feature
  fix: Bug fix
  refactor: Code restructuring (no logic change)
  docs: Documentation update
  style: Formatting (spaces, quotes, etc)
  test: Test additions or fixes
  chore: Build, dependency updates

Example commits:
  feat: add contact request endpoint
  fix: jwt token expiration validation
  refactor: extract message formatting to utils
  docs: update API endpoints in architecture.md

Commit Guidelines

  - One logical change per commit (not multiple features)
  - Write descriptive messages (at least 5 words)
  - Reference related issues or features: feat: add login #12
  - Test before committing (no broken builds)
  - Run linter: npm run lint
  - Run type check: npm run type-check
  - Keep commits small and focused

Branch Naming

  feature/auth-module
  feature/real-time-messaging
  fix/message-persistence
  docs/api-documentation
  refactor/database-schema

Branch Rules

  - One feature per branch
  - Delete branch after merge
  - Keep branch up to date with main
  - Do not commit directly to main

Pull Request Process

  1. Create feature branch
  2. Commit changes with proper messages
  3. Push to GitHub
  4. Create pull request with description
  5. Link related features.md items
  6. Wait for code review
  7. Address feedback
  8. Merge after approval

## Code Review and Approval

Before Code Review

All of the following must pass:
  npm run lint — No linting errors
  npm run type-check — No TypeScript errors
  npm run test — All tests pass
  npm run build — Build succeeds

Code Quality Checks

Reviewer checks:
  - Code follows all naming conventions
  - Code follows all folder structure rules
  - Proper error handling (no silent failures)
  - No console.log statements
  - All new types exported and shared properly
  - Tests cover main logic paths
  - Documentation updated if needed
  - Commits have proper messages

Approval Requirements

Code review approval required from: Mohammad Mehdi
Only Mohammad Mehdi can approve and merge pull requests.

Changes requested: Address all comments, push new commits, request review again.

Approval means: Code is correct, follows all rules, ready for production.

## Phase Completion Checklist

Before marking phase as done:

Code
  ✓ All features in phase completed
  ✓ All tests passing
  ✓ Type checking passes
  ✓ Linting passes
  ✓ Code review approved
  ✓ Committed to GitHub with proper message

Documentation
  ✓ Code comments where needed
  ✓ README updated if needed
  ✓ API endpoints documented (if applicable)
  ✓ Architecture updated (if applicable)

Testing
  ✓ Unit tests written
  ✓ Integration tests pass
  ✓ Manual testing with two browsers pass

Completion
  ✓ GitHub commit approved
  ✓ Phase moved from current-task.md to done.md
  ✓ 100-word summary written describing what was built

## When in Doubt

Always refer back to these files in this order:
  1. features.md — Is this feature supposed to be built?
  2. architecture.md — Where does this code go?
  3. stack.md — Which tool to use?
  4. rules.md — How to write it? (this file)
  5. overview-project.md — Does this align with goals?
  6. current-task.md — Am I on the right phase?
  7. done.md — Has this been done before?

Never assume. Always check context files. When rules conflict, follow this
priority: overview > features > architecture > stack > rules.