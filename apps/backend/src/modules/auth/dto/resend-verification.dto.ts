import { IsString, Matches, MaxLength, MinLength } from 'class-validator'
import {
  EMAIL_MAX_LENGTH,
  EMAIL_MIN_LENGTH,
  EMAIL_REGEX,
  ERROR_MESSAGES,
} from '@email-chat-pro/constants'

/**
 * Request body for POST /auth/resend-verification
 * (features.md §Email Verification — "Users can request another verification
 * email").
 *
 * The email rules are identical to {@link RegisterDto}'s and reference the same
 * shared constants, so both endpoints accept exactly the same addresses.
 */
export class ResendVerificationDto {
  @IsString({ message: ERROR_MESSAGES.EMAIL_REQUIRED })
  @Matches(EMAIL_REGEX, { message: ERROR_MESSAGES.EMAIL_INVALID })
  @MinLength(EMAIL_MIN_LENGTH, { message: ERROR_MESSAGES.EMAIL_INVALID })
  @MaxLength(EMAIL_MAX_LENGTH, { message: ERROR_MESSAGES.EMAIL_INVALID })
  email!: string
}
