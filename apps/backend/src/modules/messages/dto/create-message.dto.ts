import { IsIn, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator'
import { MESSAGE_CONTENT_MAX_LENGTH, MESSAGE_CONTENT_MIN_LENGTH } from '@email-chat-pro/constants'

/**
 * Validated input for POST /api/v1/chats/:chatId/messages (architecture.md
 * §Validation Rules — Message Content).
 *
 * - content: 1–5000 characters.
 * - messageType: currently only 'text' (image/video are Phase 4).
 * - mediaUrl: forbidden for text messages (enforced by class-level validation
 *   in the service layer).
 */
export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  @Length(MESSAGE_CONTENT_MIN_LENGTH, MESSAGE_CONTENT_MAX_LENGTH)
  content!: string

  @IsIn(['text'])
  messageType!: 'text'

  @IsOptional()
  mediaUrl?: string | null
}
