import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
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
import type {
  LoginResponse,
  LogoutResponse,
  RegisterResponse,
  ResendVerificationResponse,
  User as SharedUser,
  VerifyEmailResponse,
} from '@email-chat-pro/types'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { ResendVerificationDto } from './dto/resend-verification.dto'
import { VerifyEmailDto } from './dto/verify-email.dto'
import { User } from './entities/user.entity'
import type { JwtPayload } from './strategies/jwt.strategy'
import { EmailService } from '../email/email.service'

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
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
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
   *   stored; the plaintext token is delivered to the user's inbox via Resend
   *   (EmailService) and is never returned in the API response or logged.
   */
  async register(dto: RegisterDto): Promise<RegisterResponse> {
    const email = dto.email.toLowerCase()

    const existing = await this.usersRepository.findOne({ where: { email } })
    if (existing) {
      throw new ConflictException({
        code: ERROR_CODES.EMAIL_ALREADY_REGISTERED,
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
      return await this.deliverVerificationEmail(saved, verificationToken)
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException({
          code: ERROR_CODES.EMAIL_ALREADY_REGISTERED,
          message: ERROR_MESSAGES.EMAIL_ALREADY_REGISTERED,
        })
      }
      if (error instanceof HttpException) {
        throw error
      }
      throw new InternalServerErrorException({
        code: ERROR_CODES.INTERNAL_ERROR,
        message: ERROR_MESSAGES.INTERNAL,
      })
    }
  }

  /**
   * Sends the verification email for `user` and returns the registration result.
   * Delivery failures are handled by {@link sendVerificationEmail}.
   */
  private async deliverVerificationEmail(user: User, token: string): Promise<RegisterResponse> {
    await this.sendVerificationEmail(user, token)
    return { id: user.id, email: user.email, message: 'Registration successful' }
  }

  /**
   * Sends the verification email, clearing the stored token on failure.
   *
   * On a delivery error the stored token hash and expiry are nulled and the user
   * is persisted before the error propagates. Without this the account would
   * keep a verification token the user never received, leaving no way to
   * complete verification: the only recovery would be to register again into a
   * 409 conflict. The account itself is always kept — it is unverified, has no
   * valid token, and POST /auth/resend-verification restores it.
   *
   * Throws a 500 carrying a fixed, non-enumerating message: never the provider
   * error, the address, or the token.
   */
  private async sendVerificationEmail(user: User, token: string): Promise<void> {
    try {
      await this.emailService.sendVerificationEmail(user.email, token)
    } catch {
      user.verificationTokenHash = null
      user.verificationTokenExpiresAt = null
      await this.usersRepository.save(user)
      throw new InternalServerErrorException({
        code: ERROR_CODES.INTERNAL_ERROR,
        message: ERROR_MESSAGES.EMAIL_SEND_FAILED,
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

  /**
   * Issues a fresh verification token and re-sends the verification email
   * (features.md §Email Verification — "Users can request another verification
   * email").
   *
   * Account enumeration is deliberately avoided: an unknown address, a
   * soft-deleted or inactive account, and an already-verified account all
   * return the *same* 200 payload as a genuine resend, and none of them touch
   * the token or the mail transport. This mirrors the single-generic-401 rule
   * {@link login} already follows.
   *
   * A genuine resend rotates the stored token hash and expiry before sending, so
   * a previously issued but un-used token stops working. If delivery then fails
   * the rotated token is cleared, leaving the account recoverable by resending
   * again rather than holding a token whose mail was never delivered.
   */
  async resendVerification(dto: ResendVerificationDto): Promise<ResendVerificationResponse> {
    const email = dto.email.toLowerCase()
    const generic = { message: ERROR_MESSAGES.RESEND_VERIFICATION_SENT }

    const user = await this.usersRepository.findOne({ where: { email } })
    if (!user || user.deletedAt !== null || !user.isActive || user.isVerified) {
      return generic
    }

    const verificationToken = this.generateVerificationToken()
    user.verificationTokenHash = this.hashVerificationToken(verificationToken)
    user.verificationTokenExpiresAt = this.getVerificationTokenExpiry()
    await this.usersRepository.save(user)

    await this.sendVerificationEmail(user, verificationToken)
    return generic
  }

  /**
   * Authenticates a verified user with email + password (Task 1.3).
   *
   * - Unknown/deleted/inactive accounts and wrong passwords all return the same
   *   generic 401 so responses do not reveal whether an email is registered.
   * - Unverified accounts CANNOT authenticate (features.md — "Unverified users
   *   cannot authenticate successfully"); they get a distinct 401.
   * - On success a JWT is signed (payload `{ sub, email }`) and returned, and
   *   the controller also sets it as an httpOnly cookie.
   */
  async login(dto: LoginDto): Promise<LoginResponse> {
    const email = dto.email.toLowerCase()
    const user = await this.usersRepository.findOne({ where: { email } })

    if (!user || user.deletedAt !== null || !user.isActive) {
      throw this.unauthorized(ERROR_CODES.INVALID_CREDENTIALS, ERROR_MESSAGES.INVALID_CREDENTIALS)
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash)
    if (!passwordMatches) {
      throw this.unauthorized(ERROR_CODES.INVALID_CREDENTIALS, ERROR_MESSAGES.INVALID_CREDENTIALS)
    }

    // Reached only after the password matched, so this code confirms knowledge
    // of a real credential and discloses nothing a wrong password would not.
    if (!user.isVerified) {
      throw this.unauthorized(ERROR_CODES.EMAIL_NOT_VERIFIED, ERROR_MESSAGES.EMAIL_NOT_VERIFIED)
    }

    const payload: JwtPayload = { sub: user.id, email: user.email }
    const token = await this.jwtService.signAsync(payload)

    return { token, user: this.toUserDto(user) }
  }

  /** Ends the current session (Task 1.3). The controller clears the httpOnly cookie. */
  async logout(): Promise<LogoutResponse> {
    return { message: ERROR_MESSAGES.LOGGED_OUT }
  }

  /**
   * Maps the authenticated entity to the shared user contract (Task 1.4).
   * Optional profile fields are included when set (null → omitted).
   */
  toUserDto(user: User): SharedUser {
    return {
      id: user.id,
      email: user.email,
      isVerified: user.isVerified,
      isActive: user.isActive,
      username: user.username ?? undefined,
      fullName: user.fullName ?? undefined,
      bio: user.bio ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      profileCompleted: user.profileCompleted,
      lastSeenAt: user.lastSeenAt?.toISOString(),
      createdAt: user.createdAt.toISOString(),
    }
  }

  /**
   * Builds the 401 used by every failed login attempt.
   *
   * `code` is the structured discriminator the frontend keys off to render
   * "verify your email" vs "invalid credentials" (packages/constants
   * ERROR_CODES); `message` stays the English fallback for clients that do not
   * model the code.
   */
  private unauthorized(code: string, message: string): UnauthorizedException {
    return new UnauthorizedException({
      code,
      message,
    })
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
