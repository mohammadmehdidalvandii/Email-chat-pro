import { IsIn, IsOptional } from 'class-validator'
import { ERROR_MESSAGES } from '@email-chat-pro/constants'

/**
 * Optional non-file fields of POST /files/upload (architecture.md §File
 * Endpoints — `{ file, type: 'image' | 'video' }`).
 *
 * Both `image` and `video` are accepted (Task 4.2); the field stays optional
 * because an absent type defaults to image (the Task 4.1 behavior).
 */
export class UploadFileDto {
  @IsOptional()
  @IsIn(['image', 'video'], { message: ERROR_MESSAGES.UPLOAD_TYPE_INVALID })
  type?: 'image' | 'video'
}
