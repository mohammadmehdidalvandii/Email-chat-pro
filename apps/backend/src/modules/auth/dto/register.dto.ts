import { IsString, Matches, MaxLength, MinLength } from 'class-validator'
import {
  EMAIL_MAX_LENGTH,
  EMAIL_MIN_LENGTH,
  EMAIL_REGEX,
  ERROR_MESSAGES,
  PASSWORD_REGEX,
} from '@email-chat-pro/constants'

/**
 * Request body for POST /auth/register (Task 1.1 — Registration).
 *
 * Validation rules reference the shared constants so the backend stays aligned
 * with the single source of truth in packages/constants.
 */
export class RegisterDto {
  @IsString({ message: ERROR_MESSAGES.EMAIL_REQUIRED })
  @Matches(EMAIL_REGEX, { message: ERROR_MESSAGES.EMAIL_INVALID })
  @MinLength(EMAIL_MIN_LENGTH, { message: ERROR_MESSAGES.EMAIL_INVALID })
  @MaxLength(EMAIL_MAX_LENGTH, { message: ERROR_MESSAGES.EMAIL_INVALID })
  email!: string

  @IsString({ message: ERROR_MESSAGES.PASSWORD_REQUIRED })
  @Matches(PASSWORD_REGEX, { message: ERROR_MESSAGES.PASSWORD_WEAK })
  password!: string
}
