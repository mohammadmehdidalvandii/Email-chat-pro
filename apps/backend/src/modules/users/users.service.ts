import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Raw, Repository } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import { ERROR_CODES, ERROR_MESSAGES } from '@email-chat-pro/constants'
import { User } from '../auth/entities/user.entity'
import { DeleteAccountDto } from './dto/delete-account.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'

/**
 * PostgreSQL error code for a unique constraint violation.
 * The `users.username` case-insensitive unique index is the authoritative
 * duplicate guard in case two requests pass the pre-check concurrently.
 */
const PG_UNIQUE_VIOLATION = '23505'

/**
 * User profile logic (Task 1.4 — User Profile).
 *
 * Business logic for the `/users/me` endpoints: applies a partial profile
 * update, enforces case-insensitive username uniqueness, and tracks profile
 * completion. Persistence goes through TypeORM; uniqueness pre-checks are a
 * clean-error convenience while the DB unique index remains authoritative.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * Applies a partial profile update and persists the changes.
   *
   * - `username` uniqueness is case-insensitive ("Milad" == "milad"). If the
   *   requested username matches the user's own current username (ignoring
   *   case) no conflict is raised.
   * - optional free-text fields are normalized: empty/whitespace-only values
   *   are stored as NULL to keep the nullable columns clean.
   * - `profile_completed` becomes true once the required profile fields
   *   (username + full name) are present (features.md — Profile Setup).
   */
  async updateProfile(user: User, dto: UpdateProfileDto): Promise<User> {
    if (dto.username !== undefined) {
      await this.assertUsernameAvailable(user, dto.username)
      user.username = dto.username
    }
    if (dto.fullName !== undefined) {
      user.fullName = this.normalizeOptional(dto.fullName)
    }
    if (dto.bio !== undefined) {
      user.bio = this.normalizeOptional(dto.bio)
    }
    if (dto.avatarUrl !== undefined) {
      user.avatarUrl = this.normalizeOptional(dto.avatarUrl)
    }

    user.profileCompleted = Boolean(user.username && user.fullName)

    try {
      return await this.usersRepository.save(user)
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException({
          code: ERROR_CODES.CONFLICT,
          message: ERROR_MESSAGES.USERNAME_TAKEN,
        })
      }
      throw error
    }
  }

  /**
   * Permanently deletes the user's account by anonymizing their identity
   * (architecture.md §Account Deletion — Anonymization).
   *
   * The row is NOT removed (foreign-key integrity with messages must be
   * preserved). Instead:
   *  1. `deleted_at` is set to NOW().
   *  2. `is_active` is set to false (prevents JWT authentication).
   *  3. `username` is renamed to `deleted#{uuid}` (frees the old handle,
   *     outside the valid username alphabet so it cannot collide).
   *  4. `full_name`, `bio`, `avatar_url` are cleared.
   *  5. `password_hash` is cleared (prevents login).
   *
   * Historical messages remain intact with their original `sender_id`.
   */
  async deleteAccount(user: User, dto: DeleteAccountDto): Promise<void> {
    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash)
    if (!passwordMatches) {
      throw new UnauthorizedException({
        code: ERROR_CODES.UNAUTHORIZED,
        message: ERROR_MESSAGES.PASSWORD_INCORRECT,
      })
    }

    user.deletedAt = new Date()
    user.isActive = false
    user.username = `deleted#${user.id}`
    user.fullName = null
    user.bio = null
    user.avatarUrl = null
    user.passwordHash = ''

    await this.usersRepository.save(user)
  }

  /**
   * Rejects a username already taken by another account (case-insensitive).
   * The user's own current username is always allowed, including a re-submit
   * with different casing.
   */
  private async assertUsernameAvailable(user: User, username: string): Promise<void> {
    if (username.toLowerCase() === user.username?.toLowerCase()) {
      return
    }
    const existing = await this.usersRepository.findOne({
      where: {
        // Case-insensitive exact match, mirroring the LOWER(username) unique
        // index. Raw comparison (not ILIKE) so `%`/`_` in a username are not
        // treated as wildcards.
        username: Raw((alias) => `LOWER(${alias}) = LOWER(:username)`, { username }),
      },
    })
    if (existing) {
      throw new ConflictException({
        code: ERROR_CODES.CONFLICT,
        message: ERROR_MESSAGES.USERNAME_TAKEN,
      })
    }
  }

  /** Normalizes an optional string field: trims and stores NULL when empty. */
  private normalizeOptional(value: string): string | null {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === PG_UNIQUE_VIOLATION
    )
  }
}
