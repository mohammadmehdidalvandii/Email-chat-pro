import { Inject, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Reflector } from '@nestjs/core'
import { getOptionsToken, getStorageToken, ThrottlerGuard } from '@nestjs/throttler'
import type { ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler'
import type { Request } from 'express'
import { extractJwtFromCookie } from '../../modules/auth/strategies/jwt.strategy'
import type { JwtPayload } from '../../modules/auth/strategies/jwt.strategy'

/**
 * Global rate-limit guard (Task 4.5 — Rate Limiting and Security Hardening).
 *
 * Throttles by the authenticated user's id when the request carries a valid
 * JWT (Bearer `Authorization` header or the httpOnly `auth_token` cookie), and
 * by the client IP otherwise. This makes the endpoint-specific limits in
 * `rate-limit.config.ts` per user (architecture.md — "Endpoint-Specific
 * Limits (per user)") while unauthenticated auth endpoints (login, register)
 * remain bounded per source IP.
 *
 * Global guards run before the Passport JwtAuthGuard fills `req.user`, so the
 * identity is resolved here by verifying the token itself (a stateless `sub`
 * extraction, no database access) rather than relying on `req.user`. When the
 * token is missing or invalid the request falls back to per-IP throttling.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  constructor(
    @Inject(getOptionsToken()) options: ThrottlerModuleOptions,
    @Inject(getStorageToken()) storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {
    super(options, storageService, reflector)
  }

  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const userId = this.resolveUserId(req)
    return userId !== null ? `user:${userId}` : `ip:${this.ipOf(req)}`
  }

  /** Authenticated user id from `req.user` when present, else from the JWT, else null. */
  private resolveUserId(req: Record<string, unknown>): string | null {
    const user = req.user as { id?: unknown } | undefined
    if (typeof user?.id === 'string') {
      return user.id
    }

    const token = this.extractToken(req)
    if (token === null) {
      return null
    }
    try {
      const payload = this.jwtService.verify<JwtPayload>(token)
      return payload.sub
    } catch {
      return null
    }
  }

  private extractToken(req: Record<string, unknown>): string | null {
    const headers = (req as unknown as Request).headers
    const authorization = headers?.authorization
    if (typeof authorization === 'string') {
      const bearer = /^Bearer\s+(.+)$/i.exec(authorization)
      if (bearer !== null) {
        return bearer[1]
      }
    }

    const token = extractJwtFromCookie(req as unknown as Request)
    return token === null || token.length === 0 ? null : token
  }

  private ipOf(req: Record<string, unknown>): string {
    const ip = req.ip
    return typeof ip === 'string' ? ip : 'unknown'
  }
}
