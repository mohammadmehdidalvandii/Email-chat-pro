# Email-Chat-Pro — Technology Stack

## General Tools

npm
Package manager for JavaScript. Used across both frontend and backend for
dependency management. Workspace management handled by pnpm at the monorepo level.

node.js (v22+)
Runtime environment for JavaScript on the server. Provides the foundation for
NestJS backend and build tools. Version 22 or higher required for modern async
features and performance improvements.

docker and docker-compose
Containerization tools for consistent development and deployment environments.
Docker Compose orchestrates PostgreSQL database and optionally other services
locally. Eliminates "works on my machine" problems.

npm (monorepo workspaces)
Package manager and workspace tool at the root level. Manages dependencies across
frontend, backend, and shared packages efficiently. Faster and more reliable than
npm for monorepo setups.

## Client (/frontend)

Built with Next.js and React for a modern, responsive user interface with
server-side rendering capabilities and optimal performance.

next.js (app router)
React framework for production. App Router (file-based routing) provides cleaner
project structure and better data fetching patterns. Enables server components
and server actions for hybrid rendering. Version 13+ required for app router.

typescript
Static type checking for JavaScript. Prevents runtime errors by catching type
mismatches at compile time. Used throughout frontend for components, hooks,
services, and utilities.

tailwind css
Utility-first CSS framework. Provides pre-built classes for rapid UI development
without writing custom CSS. Configured for responsive design and theme
customization.

shadcn ui
Unstyled, accessible component library built on Radix UI. Provides copy-paste
React components (buttons, forms, dialogs, etc.) for consistent UI. Fully
customizable and Tailwind-based.

zustand
Lightweight state management for client UI state (modals, sidebar toggle, theme,
filters). Simpler alternative to Redux. Stores: authStore, chatStore, uiStore,
notificationStore, userStore.

tanstack query (react-query)
Server state management and data fetching library. Handles caching, auto-refetch,
background updates, and synchronization. Eliminates need for manual loading and
error states. Integrates with Axios service.

react-hook-form
Performant form library with minimal re-renders. Integrates with validation
libraries (Zod/Yup). Used for login, signup, profile edit, message input.

zod
TypeScript-first schema validation. Validates form inputs, API responses, and
environment variables. Shared validation schemas with backend in packages/constants.

socket.io-client
WebSocket client for real-time communication with backend. Enables instant
message delivery, typing indicators, and connection status. Automatically handles
reconnection and fallbacks.

axios
HTTP client for making API requests to backend. Configured with interceptors for
authentication (JWT token injection) and error handling. Baseurl set via
environment variables.

sonner
Toast notification library. Lightweight, customizable notifications for success,
error, and info messages. Better UX than browser alerts.

sweetalert2
Modal and alert dialogs. Used for confirmations (delete account, decline request)
and important user interactions. More polished than window.confirm.

lucide-react
Icon library with 800+ icons. Used throughout UI for visual consistency. All
icons sourced from single library instead of multiple icon packs.

react-window
Virtual scrolling library for rendering large lists efficiently. Optimizes
performance for chat message history and user search results. Only renders
visible items.

i18next (next-i18next)
Internationalization framework. Supports multiple languages (Persian, English, Spanish).
Translation files stored in public/locales/. User language preference saved and
detected from browser.

## Server (/backend)

Built with NestJS for a scalable, maintainable backend architecture with
modular organization and dependency injection.

nest.js
Progressive Node.js framework for building efficient, scalable server-side
applications. Provides structure with modules, controllers, services. Built-in
support for WebSocket, middleware, guards, interceptors, pipes.

node.js (v22+)
JavaScript runtime for server. Same version as frontend for consistency.
Provides async/await, streaming, and clustering capabilities for the backend.

typescript
Static typing for backend. Used in all NestJS modules, services, entities,
DTOs, and utilities. Ensures type safety and better IDE support for API contracts.

postgresql
Relational database for data persistence. Used for users, messages, contacts,
chat history. ACID compliance ensures data integrity. Port 5432 (dockerized).

typeorm
Object-Relational Mapping library. Abstracts SQL queries into TypeScript entities
and methods. Migrations for database schema versioning. Relationships between
users, messages, and contacts defined in entities.

jwt (jsonwebtoken + @nestjs/jwt + passport-jwt)
JSON Web Tokens for stateless authentication. User logs in, receives JWT, sends
it in Authorization header for protected endpoints. Tokens stored in httpOnly
cookies. Passport strategy handles token validation.

bcryptjs
Password hashing library. User passwords hashed with salt rounds before storage.
Never stores plain passwords. Verified during login.

socket.io
WebSocket server for real-time bidirectional communication. Handles events like
message sending, typing indicators, connection status. Implements namespaces and
rooms for chat isolation.

cloudinary
Cloud file hosting service. Used for image and video uploads in messages.
Handles compression, resizing, and CDN delivery. API key and secret stored in
environment variables.

swagger (@nestjs/swagger)
API documentation tool. Auto-generates interactive API docs from NestJS
controllers. Accessible at /api/docs. Shows all endpoints, request/response
schemas.

winston
Structured logging library. Logs API requests, errors, and important events.
Logs formatted as JSON for easy parsing and analysis. Log files stored locally
or sent to external service.

rate-limiting (@nestjs/throttler + express-rate-limit)
Protects API from abuse. Limits requests per IP/user. Auth endpoints allow
fewer requests (5 attempts per 15 minutes). API endpoints allow more (1000 per
15 minutes). Prevents brute force attacks.

cors
Cross-Origin Resource Sharing. Configured to allow frontend (localhost:4000)
to communicate with backend (localhost:3000). In production, restricted to
specific domains.

multer
Middleware for handling file uploads. Parses multipart/form-data from client.
Files processed and sent to Cloudinary. File size and type validation applied.

helmet
Security middleware. Sets HTTP security headers (X-Frame-Options, X-Content-Type-Options,
etc.). Protects against common web vulnerabilities.

class-validator
Decorator-based validation for DTOs. Validates incoming request data in pipes.
Works alongside Zod for comprehensive validation.

## Port Configuration

Frontend (Next.js)
Runs on localhost:4000. Client-side application served from this port. API calls
directed to backend on localhost:3000. Configured via NEXT_PUBLIC_API_URL in .env.

Backend (NestJS)
Runs on localhost:3000. REST API endpoints and Socket.IO server accessible from
this port. Backend connects to PostgreSQL on localhost:5432 (dockerized).

PostgreSQL Database
Runs on localhost:5432 inside Docker container. Only accessible from backend
application. Database name, user, password configured via DATABASE_URL in .env.

## Environment Variables

All sensitive configuration stored in .env files (not committed to git).

Frontend (.env.local)
NEXT_PUBLIC_API_URL: Backend API address (http://localhost:3000)
NEXT_PUBLIC_WS_URL: WebSocket server address (http://localhost:3000)

Backend (.env)
DATABASE_URL: PostgreSQL connection string
NODE_ENV: Environment (development/production)
JWT_SECRET: Secret key for signing JWT tokens
JWT_EXPIRATION: Token expiration time
CLOUDINARY_NAME: Cloudinary account name
CLOUDINARY_API_KEY: Cloudinary API key
CLOUDINARY_API_SECRET: Cloudinary API secret (sensitive)

Example .env.example files provided in repo root for reference. Never commit
actual .env files.

## Shared Packages (/packages)

types
TypeScript interfaces for API contracts, entities, and DTOs. Shared between
frontend and backend. Single source of truth for data structures.

constants
Error messages, validation rules, status codes, event names. Used across
frontend and backend for consistency.

utils
Shared validator functions, error handlers, formatters. Reusable logic not
specific to frontend or backend.

## Development Environment Setup

Local development uses Docker Compose to run PostgreSQL. One command spins up
the full stack. Frontend hot-reloads on file changes. Backend auto-restarts
on file changes with tsx (TypeScript runner).

.env.example provides template for required variables. Copy to .env and fill
in actual values. TypeScript ensures type safety of environment variable access.

All npm scripts defined in root package.json for consistency: npm run dev (start
all), npm run frontend (start frontend only), npm run backend (start backend only).