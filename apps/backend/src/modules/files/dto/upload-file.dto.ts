import { IsIn, IsOptional } from 'class-validator'
import { ERROR_MESSAGES } from '@email-chat-pro/constants'

/**
 * Optional non-file fields of POST /files/upload (architecture.md §File
 * Endpoints — `{ file, type: 'image' | 'video' }`).
 *
 * Only `image` is accepted today; `video` is Task 4.2. The field is optional
 * because image is the only supported upload in the current scope.
 */
export class UploadFileDto {
  @IsOptional()
  @IsIn(['image'], { message: ERROR_MESSAGES.UPLOAD_TYPE_INVALID })
  type?: 'image'
}
