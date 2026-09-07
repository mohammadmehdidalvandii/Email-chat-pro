import { IsString, Length } from 'class-validator'
import { ERROR_MESSAGES, VERIFICATION_TOKEN_LENGTH } from '@email-chat-pro/constants'

/**
 * Request body for POST /auth/verify-email (Task 1.2 — Email Verification).
 *
 * The token length is enforced against the shared constant so the DTO stays
 * aligned with the single source of truth in packages/constants. A token that
 * fails here is a request-validation error (HTTP 400 VALIDATION_ERROR); a
 * well-formed token that is unknown, expired, or already used is rejected by
 * the service.
 */
export class VerifyEmailDto {
  @IsString({ message: ERROR_MESSAGES.VERIFICATION_TOKEN_REQUIRED })
  @Length(VERIFICATION_TOKEN_LENGTH, VERIFICATION_TOKEN_LENGTH, {
    message: ERROR_MESSAGES.VERIFICATION_TOKEN_INVALID,
  })
  token!: string
}
