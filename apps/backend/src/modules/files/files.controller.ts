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
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  IMAGE_MAX_SIZE_BYTES,
  IMAGE_MIME_TYPES,
} from '@email-chat-pro/constants'
import type { ApiResponse, FileUploadResponse } from '@email-chat-pro/types'
import type { Request } from 'express'
import { memoryStorage } from 'multer'
import { User } from '../auth/entities/user.entity'
import { JwtAuthGuard } from '../auth/guards/jwt.guard'
import { UploadFileDto } from './dto/upload-file.dto'
import { FilesService } from './files.service'
import { FileSizeExceptionFilter } from './filters/file-size.exception.filter'

/** Request enriched with the authenticated user by the JWT strategy. */
type AuthenticatedRequest = Request & { user: User }

/**
 * Multer fileFilter — a cheap MIME pre-check before the authoritative
 * magic-byte inspection in FilesService. The client-supplied mime type alone
 * is never trusted; it only rejects clearly-wrong uploads early.
 */
function imageFileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  if ((IMAGE_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
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
 * IMAGE_MAX_SIZE_BYTES, and validated + persisted by FilesService. An oversized
 * file is mapped to a standardized 400 by FileSizeExceptionFilter (a
 * controller-scoped filter that precedes the global @Catch() filter).
 */
@Controller('files')
@UseFilters(FileSizeExceptionFilter)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /**
   * POST /files/upload — uploads a single image.
   *
   * Multipart/form-data fields:
   *   - `file` (required): the image binary.
   *   - `type` (optional): upload category; only `image` is accepted today
   *     (`video` is Task 4.2). Validated by UploadFileDto.
   *
   * Response 200 with the shared ApiResponse envelope containing the
   * Cloudinary-hosted secure URL in `data.url`.
   */
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: IMAGE_MAX_SIZE_BYTES },
      fileFilter: imageFileFilter,
    }),
  )
  @HttpCode(HttpStatus.OK)
  async upload(
    @Req() _req: AuthenticatedRequest,
    @Body() _dto: UploadFileDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ApiResponse<FileUploadResponse>> {
    const data = await this.filesService.uploadImage(file)
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }
  }
}
