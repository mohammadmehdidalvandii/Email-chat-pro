import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Not, Raw, Repository } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  SEARCH_LIMIT_MAX,
  SEARCH_QUERY_MAX_LENGTH,
  SEARCH_QUERY_MIN_LENGTH,
} from '@email-chat-pro/constants'
import { User } from '../auth/entities/user.entity'
import { Attachment } from '../files/entities/attachment.entity'
import { FilesService } from '../files/files.service'
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
  private readonly logger = new Logger(UsersService.name)

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Attachment)
    private readonly attachmentRepository: Repository<Attachment>,
    private readonly filesService: FilesService,
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
          code: ERROR_CODES.USERNAME_TAKEN,
          message: ERROR_MESSAGES.USERNAME_TAKEN,
        })
      }
      throw error
    }
  }

  /**
   * Uploads (or replaces) the authenticated user's avatar.
   *
   * The uploaded image is validated and stored by FilesService (magic bytes,
   * dimensions, size) as an attachment row with `messageId: null`; this user's
   * `avatar_url` is then set to the attachment URL.
   *
   * Replacement safety: the NEW attachment is stored and its URL is persisted
   * onto the user BEFORE any cleanup of the previous blob, so a failure never
   * leaves the user with a dangling avatar. If the profile write fails after
   * the new blob was stored, the new attachment is left orphaned (best-effort
   * cleanup below) but the user's avatar is unchanged — the account is never
   * inconsistent. Cross-database/storage transactions are not atomic here; the
   * write order is chosen so the profile is never broken.
   */
  async setAvatar(user: User, file: Express.Multer.File | undefined): Promise<User> {
    const { url } = await this.filesService.uploadImage(file, user)
    const previousUrl = user.avatarUrl

    user.avatarUrl = url
    let saved: User
    try {
      saved = await this.usersRepository.save(user)
    } catch (error) {
      // The profile write failed, but the new blob was already stored. Best-effort:
      // delete the just-created attachment so it does not become a permanent
      // orphan, then roll the avatar back to the previous value and rethrow.
      await this.tryDeleteAttachmentForUrl(url)
      user.avatarUrl = previousUrl
      throw error
    }
    // On success the user now points at the new attachment. Clean up the old
    // attachment row (if any) best-effort so a dangling avatar never lingers.
    // Done after the save so the profile never points at a missing row while the
    // delete is in flight: a concurrent reader only ever sees avatar_url set to
    // the new URL, which is valid until the save completes anyway.
    if (previousUrl) {
      await this.tryDeleteAttachmentForUrl(previousUrl)
    }
    return saved
  }

  /**
   * Removes the authenticated user's avatar and clears `avatar_url`.
   *
   * The old attachment row is deleted best-effort; a failure to delete it must
   * not fail the request or leave the profile inconsistent, so the profile is
   * updated first and any cleanup error is swallowed after logging.
   */
  async removeAvatar(user: User): Promise<User> {
    const previousUrl = user.avatarUrl
    user.avatarUrl = null
    try {
      const saved = await this.usersRepository.save(user)
      if (previousUrl) {
        await this.tryDeleteAttachmentForUrl(previousUrl)
      }
      return saved
    } catch (error) {
      user.avatarUrl = previousUrl
      throw error
    }
  }

  /** Best-effort deletion of the attachment referenced by an avatar URL. */
  private async tryDeleteAttachmentForUrl(url: string): Promise<void> {
    const attachmentId = this.attachmentIdFromUrl(url)
    if (!attachmentId) return
    try {
      await this.attachmentRepository.delete({ id: attachmentId })
    } catch (error) {
      this.logger.warn(`Failed to clean up avatar attachment ${attachmentId}: ${this.errorMessage(error)}`)
    }
  }

  /** Extracts the attachment id from an avatar URL (`/api/v1/attachments/:id`). */
  private attachmentIdFromUrl(url: string): string | null {
    const match = /\/attachments\/([^/?#]+)/.exec(url)
    return match?.[1] ? decodeURIComponent(match[1]) : null
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
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
        code: ERROR_CODES.PASSWORD_INCORRECT,
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
   * Searches active users by username or email (Task 3.1 — User Search).
   *
   * - `q` is required and trimmed; an empty query is rejected with 400
   *   VALIDATION_ERROR (an empty query would enumerate the whole user table,
   *   not "search" — features.md "User Search").
   * - Username matches are case-insensitive PARTIAL matches (`LOWER LIKE`);
   *   LIKE wildcards (`%` / `_`) in the input are escaped so user text is a
   *   literal fragment (features.md — "Username search supports appropriate
   *   partial matching").
   * - Email matches are case-insensitive EXACT matches (features.md — "Email
   *   search supports exact matching").
   * - Only active, non-deleted users are returned; deleted users (Task 1.5
   *   anonymization) are excluded (features.md — "Deleted users are not
   *   returned").
   * - The authenticated caller is excluded from their own results: searching is
   *   for other people, and returning yourself is both useless and a small
   *   information leak about your own account state.
   * - `q` is bounded at SEARCH_QUERY_MAX_LENGTH so a long fragment cannot drive
   *   an expensive unbounded-pattern scan.
   * - Results are capped at SEARCH_LIMIT_MAX (default SEARCH_LIMIT_DEFAULT) —
   *   features.md "Search results are limited to a defined result count".
   */
  async searchUsers(
    q: string | undefined,
    limit: number,
    currentUserId: string,
  ): Promise<User[]> {
    const query = q?.trim() ?? ''
    if (query.length < SEARCH_QUERY_MIN_LENGTH) {
      throw new BadRequestException({
        code: ERROR_CODES.SEARCH_QUERY_REQUIRED,
        message: ERROR_MESSAGES.SEARCH_QUERY_REQUIRED,
      })
    }
    if (query.length > SEARCH_QUERY_MAX_LENGTH) {
      throw new BadRequestException({
        code: ERROR_CODES.SEARCH_QUERY_TOO_LONG,
        message: ERROR_MESSAGES.SEARCH_QUERY_TOO_LONG,
      })
    }

    const safeLimit = Math.min(Math.max(limit, 1), SEARCH_LIMIT_MAX)
    const pattern = `%${this.escapeLikePattern(query)}%`
    // `NOT (id = $n)` — TypeORM's `Not()` operator. Applied to BOTH branches
    // below so the caller is excluded whether they match by username or email.
    const excludeCaller = Not(currentUserId)

    // Two OR branches: partial username match, or exact email match. The
    // `LOWER()` comparison mirrors the case-insensitive username unique index
    // (Task 1.4). `deletedAt: IsNull()` is explicit even though TypeORM's
    // soft-delete filter excludes deleted rows, so the contract is self-evident.
    return this.usersRepository.find({
      where: [
        {
          id: excludeCaller,
          isActive: true,
          deletedAt: IsNull(),
          username: Raw((alias) => `LOWER(${alias}) LIKE LOWER(:pattern)`, { pattern }),
        },
        {
          id: excludeCaller,
          isActive: true,
          deletedAt: IsNull(),
          email: Raw((alias) => `LOWER(${alias}) = LOWER(:email)`, { email: query }),
        },
      ],
      order: { username: 'ASC' },
      take: safeLimit,
    })
  }

  /** Escapes LIKE wildcards (`%`, `_`, `\`) so user input matches literally. */
  private escapeLikePattern(value: string): string {
    return value.replace(/[\\%_]/g, (char) => `\\${char}`)
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
        code: ERROR_CODES.USERNAME_TAKEN,
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
