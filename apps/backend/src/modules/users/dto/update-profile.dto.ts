import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'
import {
  AVATAR_URL_MAX_LENGTH,
  BIO_MAX_LENGTH,
  ERROR_MESSAGES,
  FULL_NAME_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_REGEX,
} from '@email-chat-pro/constants'

/**
 * Request body for PATCH /users/me (Task 1.4 — Profile Setup).
 *
 * All fields are optional so a partial update is allowed. Validation rules
 * reference the shared constants so the backend stays aligned with the single
 * source of truth in packages/constants.
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: ERROR_MESSAGES.USERNAME_REQUIRED })
  @Matches(USERNAME_REGEX, { message: ERROR_MESSAGES.USERNAME_INVALID })
  @MinLength(USERNAME_MIN_LENGTH, { message: ERROR_MESSAGES.USERNAME_TOO_SHORT })
  @MaxLength(USERNAME_MAX_LENGTH, { message: ERROR_MESSAGES.USERNAME_TOO_LONG })
  username?: string

  @IsOptional()
  @IsString()
  @MaxLength(FULL_NAME_MAX_LENGTH, { message: ERROR_MESSAGES.FULL_NAME_TOO_LONG })
  fullName?: string

  @IsOptional()
  @IsString()
  @MaxLength(BIO_MAX_LENGTH, { message: ERROR_MESSAGES.BIO_TOO_LONG })
  bio?: string

  @IsOptional()
  @IsString()
  @MaxLength(AVATAR_URL_MAX_LENGTH, { message: ERROR_MESSAGES.AVATAR_URL_TOO_LONG })
  avatarUrl?: string
}
