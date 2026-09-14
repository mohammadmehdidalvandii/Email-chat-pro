import { IsIn, IsOptional, IsString, Length } from 'class-validator'
import { ERROR_MESSAGES } from '@email-chat-pro/constants'
import {
  MEDIA_URL_MAX_LENGTH,
  MESSAGE_CONTENT_MAX_LENGTH,
  MESSAGE_CONTENT_MIN_LENGTH,
} from '@email-chat-pro/constants'

/**
 * Validated input for POST /api/v1/chats/:chatId/messages (architecture.md
 * §Validation Rules — Message Content; §Data Model — messages).
 *
 * - messageType: 'text' or 'image'. Video is Task 4.2 and is rejected by the
 *   @IsIn gate.
 * - content: 1–5000 characters when present. Optional at the DTO level so image
 *   messages may be sent without a caption; the service enforces the "required
 *   for text" rule with MESSAGE_CONTENT_REQUIRED.
 * - mediaUrl: 1–500 characters http(s) URL. Optional at the DTO level; the
 *   service enforces "required for image / forbidden for text".
 */
export class CreateMessageDto {
  @IsOptional()
  @IsString()
  @Length(MESSAGE_CONTENT_MIN_LENGTH, MESSAGE_CONTENT_MAX_LENGTH)
  content?: string

  @IsIn(['text', 'image'], { message: ERROR_MESSAGES.MESSAGE_TYPE_INVALID })
  messageType!: 'text' | 'image'

  @IsOptional()
  @IsString()
  @Length(1, MEDIA_URL_MAX_LENGTH)
  mediaUrl?: string | null
}
