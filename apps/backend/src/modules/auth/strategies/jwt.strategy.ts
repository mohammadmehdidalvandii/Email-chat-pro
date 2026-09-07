import { Injectable, UnauthorizedException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { PassportStrategy } from '@nestjs/passport'
import type { Request } from 'express'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { Repository } from 'typeorm'
import { getJwtConfig } from '../../../config/jwt.config'
import { User } from '../entities/user.entity'

/**
 * Name of the httpOnly cookie that carries the JWT after login (Task 1.3).
 */
export const AUTH_COOKIE_NAME = 'auth_token'

/**
 * Payload signed into the JWT. `sub` is the user id so a token remains valid
 * even if the email casing/format were ever normalized differently later.
 */
export interface JwtPayload {
  sub: string
  email: string
}

/**
 * Passport-JWT strategy (architecture.md §Authentication — JWT).
 *
 * Accepts the token either from the `Authorization: Bearer` header (for API
 * clients) or from the httpOnly `auth_token` cookie (for browser clients).
 * `validate` returns the authenticated user entity, which Nest attaches to
 * `req.user`; the guard's `handleRequest` already rejects falsy users, so an
 * unknown, deleted, or inactive account is rejected with 401.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        extractJwtFromCookie,
      ]),
      ignoreExpiration: false,
      secretOrKey: getJwtConfig().secret,
    })
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: payload.sub } })
    if (!user || !user.isActive) {
      throw new UnauthorizedException()
    }
    return user
  }
}

/**
 * Reads the JWT from the httpOnly cookie set at login. Added as a manual
 * extractor because the approved stack does not include cookie-parser.
 */
function extractJwtFromCookie(req: Request): string | null {
  const header = req.headers.cookie
  if (!header) return null

  const match = new RegExp(`(?:^|;\\s*)${AUTH_COOKIE_NAME}=([^;]+)`).exec(header)
  if (!match) return null

  try {
    return decodeURIComponent(match[1])
  } catch {
    return null
  }
}
