import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common'
import { createHash, randomBytes } from 'node:crypto'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  VERIFICATION_TOKEN_EXPIRATION_HOURS,
  VERIFICATION_TOKEN_LENGTH,
} from '@email-chat-pro/constants'
import type { RegisterResponse, VerifyEmailResponse } from '@email-chat-pro/types'
import { RegisterDto } from './dto/register.dto'
import { VerifyEmailDto } from './dto/verify-email.dto'
import { User } from './entities/user.entity'

/** bcrypt salt rounds defined in architecture.md §Password Validation. */
const BCRYPT_SALT_ROUNDS = 10

/**
 * Verification tokens are hashed at rest (like a bearer secret) so a database
 * compromise does not expose usable tokens. Only the hash is ever persisted;
 * the plaintext exists solely in the request that presents it.
 */
const VERIFICATION_TOKEN_HASH_ALGORITHM = 'sha256'

/**
 * PostgreSQL error code for a unique constraint violation.
 * `users.email` has a UNIQUE constraint; this is the authoritative duplicate
 * guard in case two requests pass the pre-check concurrently.
 */
const PG_UNIQUE_VIOLATION = '23505'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * Creates a new account in the unverified/pending state.
   *
   * - email is normalized to lowercase so the same mailbox cannot be registered
   *   twice under different casing (enforced by the DB UNIQUE constraint on the
   *   stored value).
   * - password is hashed with bcryptjs (salt rounds 10) and never stored in
   *   plaintext.
   * - a verification token is generated (Task 1.2) and only its SHA-256 hash is
   *   stored; the plaintext token has no delivery channel yet (no email
   *   transport in the approved stack), so it is not returned or logged.
   */
  async register(dto: RegisterDto): Promise<RegisterResponse> {
    const email = dto.email.toLowerCase()

    const existing = await this.usersRepository.findOne({ where: { email } })
    if (existing) {
      throw new ConflictException({
        code: ERROR_CODES.CONFLICT,
        message: ERROR_MESSAGES.EMAIL_ALREADY_REGISTERED,
      })
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS)
    const verificationToken = this.generateVerificationToken()
    const user = this.usersRepository.create({
      email,
      passwordHash,
      isVerified: false,
      verificationTokenHash: this.hashVerificationToken(verificationToken),
      verificationTokenExpiresAt: this.getVerificationTokenExpiry(),
    })

    try {
      const saved = await this.usersRepository.save(user)
      return {
        id: saved.id,
        email: saved.email,
        message: 'Registration successful',
      }
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException({
          code: ERROR_CODES.CONFLICT,
          message: ERROR_MESSAGES.EMAIL_ALREADY_REGISTERED,
        })
      }
      throw new InternalServerErrorException({
        code: ERROR_CODES.INTERNAL_ERROR,
        message: ERROR_MESSAGES.INTERNAL,
      })
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === PG_UNIQUE_VIOLATION
    )
  }

  /**
   * Verifies a registered email address using its verification token.
   *
   * - The presented token is hashed and looked up. Unknown token hashes —
   *   including already-used tokens, whose hash is cleared on success — are
   *   rejected with the same generic error so responses do not reveal whether a
   *   particular token exists.
   * - Expired tokens are rejected.
   * - On success `is_verified` flips `false` → `true`, `verified_at` is
   *   recorded, and the token hash and expiry are cleared so the token cannot
   *   be reused.
   */
  async verifyEmail(dto: VerifyEmailDto): Promise<VerifyEmailResponse> {
    const tokenHash = this.hashVerificationToken(dto.token)

    const user = await this.usersRepository.findOne({
      where: { verificationTokenHash: tokenHash },
    })
    if (!user) {
      throw new BadRequestException({
        code: ERROR_CODES.VERIFICATION_TOKEN_INVALID,
        message: ERROR_MESSAGES.VERIFICATION_TOKEN_INVALID,
      })
    }

    const now = new Date()
    if (
      !user.verificationTokenExpiresAt ||
      user.verificationTokenExpiresAt.getTime() <= now.getTime()
    ) {
      throw new BadRequestException({
        code: ERROR_CODES.VERIFICATION_TOKEN_INVALID,
        message: ERROR_MESSAGES.VERIFICATION_TOKEN_INVALID,
      })
    }

    user.isVerified = true
    user.verifiedAt = now
    user.verificationTokenHash = null
    user.verificationTokenExpiresAt = null

    await this.usersRepository.save(user)

    return { message: 'Email verified successfully' }
  }

  /** Generates a cryptographically secure hex token (64 chars = 256 bits). */
  private generateVerificationToken(): string {
    return randomBytes(VERIFICATION_TOKEN_LENGTH / 2).toString('hex')
  }

  /** Hashes the plaintext token so only the hash is persisted. */
  private hashVerificationToken(token: string): string {
    return createHash(VERIFICATION_TOKEN_HASH_ALGORITHM).update(token).digest('hex')
  }

  /** Returns the expiry timestamp for a freshly generated verification token. */
  private getVerificationTokenExpiry(): Date {
    return new Date(Date.now() + VERIFICATION_TOKEN_EXPIRATION_HOURS * 60 * 60 * 1000)
  }
}
