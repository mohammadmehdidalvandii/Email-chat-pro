# Email-Chat-Pro

Full-stack real-time 1-on-1 messaging platform — npm workspaces monorepo.

```
apps/frontend        Next.js (App Router)  → localhost:3000
apps/backend         NestJS                → localhost:4000/api/v1
packages/types       @email-chat-pro/types       shared API contracts
packages/constants   @email-chat-pro/constants   shared constants
packages/utils       @email-chat-pro/utils       shared utilities
PostgreSQL           Docker Compose       → localhost:5432
```

## Prerequisites

- Node.js 22+
- npm
- Docker + Docker Compose

## Setup

```sh
npm install                      # install all workspaces
docker compose up -d             # start local PostgreSQL
```

## Development

```sh
npm run dev                      # build shared packages, then run frontend + backend
npm run build:packages           # build shared packages only
```

- Frontend: <http://localhost:3000>
- Backend API: <http://localhost:4000/api/v1>

## Verification

```sh
npm run type-check
npm run lint
npm test
npm run build
npm run format:check
```

## Environment

Copy the example files and fill in local values (never commit real secrets):

- `.env.example` → `.env` (PostgreSQL / Docker Compose)
- `apps/frontend/.env.example` → `apps/frontend/.env.local`
- `apps/backend/.env.example` → `apps/backend/.env`