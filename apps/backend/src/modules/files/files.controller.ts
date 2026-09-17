import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Throttle } from '@nestjs/throttler'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  IMAGE_MIME_TYPES,
  VIDEO_MAX_SIZE_BYTES,
  VIDEO_MIME_TYPES,
} from '@email-chat-pro/constants'
import type { ApiResponse, FileUploadResponse } from '@email-chat-pro/types'
import type { Request } from 'express'
import { memoryStorage } from 'multer'
import { endpointThrottles } from '../../config/rate-limit.config'
import { User } from '../auth/entities/user.entity'
import { JwtAuthGuard } from '../auth/guards/jwt.guard'
import { UploadFileDto } from './dto/upload-file.dto'
import { FilesService } from './files.service'
import { FileSizeExceptionFilter } from './filters/file-size.exception.filter'

/** Request enriched with the authenticated user by the JWT strategy. */
type AuthenticatedRequest = Request & { user: User }

/** MIME types the shared upload route accepts (image + video). */
const ALLOWED_MIME_TYPES = new Set<string>([...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES])

/**
 * Multer fileFilter — a cheap MIME pre-check before the authoritative
 * magic-byte inspection in FilesService. The client-supplied mime type alone
 * is never trusted; it only rejects clearly-wrong uploads early.
 */
function uploadFileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    callback(null, true)
  } else {
    callback(
      new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: ERROR_MESSAGES.FILE_TYPE_INVALID,
      }),
      false,
    )
  }
}

/**
 * File upload endpoints (architecture.md §File Endpoints — POST /files/upload).
 *
 * Uploads are stored in memory by Multer (memoryStorage), capped at
 * VIDEO_MAX_SIZE_BYTES (the largest cap, so the shared route never truncates a
 * valid upload), and validated + persisted by FilesService. Each type's own cap
 * (images ≤10MB, videos ≤50MB) is enforced service-side. An oversized file is
 * mapped to a standardized 400 by FileSizeExceptionFilter (a controller-scoped
 * filter that precedes the global @Catch() filter).
 */
@Controller('files')
@UseFilters(FileSizeExceptionFilter)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /**
   * POST /files/upload — uploads a single image or video.
   *
   * Multipart/form-data fields:
   *   - `file` (required): the media binary.
   *   - `type` (optional): upload category, `'image'` or `'video'` (Task 4.2);
   *     absent defaults to image. Validated by UploadFileDto.
   *
   * Response 200 with the shared ApiResponse envelope containing the
   * Cloudinary-hosted secure URL in `data.url`.
   */
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @Throttle(endpointThrottles.UPLOAD_FILE)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: VIDEO_MAX_SIZE_BYTES },
      fileFilter: uploadFileFilter,
    }),
  )
  @HttpCode(HttpStatus.OK)
  async upload(
    @Req() _req: AuthenticatedRequest,
    @Body() dto: UploadFileDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ApiResponse<FileUploadResponse>> {
    const data =
      dto.type === 'video'
        ? await this.filesService.uploadVideo(file)
        : await this.filesService.uploadImage(file)
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }
  }
}
