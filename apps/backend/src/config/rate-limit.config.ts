import type { ThrottlerModuleOptions, ThrottlerOptions } from '@nestjs/throttler'
import { ERROR_MESSAGES } from '@email-chat-pro/constants'

/**
 * Rate-limit configuration (architecture.md §Rate Limiting Strategy).
 *
 * Exact limits are defined by the architecture and are configuration values,
 * not constants invented here (features.md — "Exact limits are defined in the
 * technical configuration and must not be invented during implementation").
 *
 * The global limit applies to every route. Route-specific limits (login,
 * register, message sending, search, media upload) override the global default
 * for that route only. All times are in milliseconds.
 *
 * Endpoint-specific limits are per authenticated user; requests without a
 * valid token (auth flows, unauthenticated traffic) are throttled per client
 * IP instead (see AppThrottlerGuard).
 */

/** Global default: 100 requests / 15 minutes per tracker (architecture.md §Global). */
export const GLOBAL_THROTTLE: ThrottlerOptions = {
  name: 'default',
  limit: 100,
  ttl: 15 * 60 * 1000,
}

/** Route-specific throttle overrides (architecture.md §Endpoint-Specific Limits). */
export const endpointThrottles = {
  /** POST /auth/login — 5 attempts / 15 minutes. */
  LOGIN: { default: { limit: 5, ttl: 15 * 60 * 1000 } },
  /** POST /auth/register — 3 attempts / hour. */
  REGISTER: { default: { limit: 3, ttl: 60 * 60 * 1000 } },
  /** POST /chats/:chatId/messages — 100 / hour. */
  SEND_MESSAGE: { default: { limit: 100, ttl: 60 * 60 * 1000 } },
  /** GET /users/search — 50 / hour. */
  SEARCH_USERS: { default: { limit: 50, ttl: 60 * 60 * 1000 } },
  /** POST /files/upload — 5 / hour. */
  UPLOAD_FILE: { default: { limit: 5, ttl: 60 * 60 * 1000 } },
} as const

/**
 * Options for ThrottlerModule.forRootAsync.
 *
 * `errorMessage` fixes the throttled response message to the architecture's
 * 429 text (architecture.md §Error Handling); the shared code/message are
 * turned into the standardized envelope by HttpExceptionFilter.
 */
export function throttlerModuleOptions(): ThrottlerModuleOptions {
  return {
    throttlers: [GLOBAL_THROTTLE],
    errorMessage: ERROR_MESSAGES.TOO_MANY_REQUESTS,
  }
}
