import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

/**
 * Guard that requires a valid JWT (Passport strategy name `jwt`).
 *
 * On success `req.user` holds the authenticated user entity returned by the
 * strategy's `validate`. Unauthenticated requests are rejected with 401.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
