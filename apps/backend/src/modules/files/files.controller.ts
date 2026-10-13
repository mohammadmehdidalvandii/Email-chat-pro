import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
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
import type { Request, Response } from 'express'
import { memoryStorage } from 'multer'
import { endpointThrottles } from '../../config/rate-limit.config'
import { User } from '../auth/entities/user.entity'
import { JwtAuthGuard } from '../auth/guards/jwt.guard'
import { Chat } from '../chats/entities/chat.entity'
import { Attachment } from './entities/attachment.entity'
import { UploadFileDto } from './dto/upload-file.dto'
import { FilesService } from './files.service'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
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
        code: ERROR_CODES.FILE_TYPE_INVALID,
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
  constructor(
    private readonly filesService: FilesService,
    @InjectRepository(Attachment)
    private readonly attachmentRepo: Repository<Attachment>,
    @InjectRepository(Chat)
    private readonly chatRepo: Repository<Chat>,
  ) {}

  /**
   * GET /attachments/:id — retrieves a stored image/video.
   *
   * Authorization mirrors getHistory (messages.service.ts):
   * the attachment must exist, belong to a message in a chat, and
   * the requesting user must be a participant of that chat. Returns
   * raw bytes with the attachment's stored MIME type; no JSON
   * envelope (the response is binary). Cache-control is private so
   * intermediaries cannot cache user images.
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getAttachment(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const attachment = await this.attachmentRepo.findOne({
      where: { id },
      relations: ['message'],
    })
    if (!attachment) {
      throw new NotFoundException({
        code: ERROR_CODES.NOT_FOUND,
        message: ERROR_MESSAGES.NOT_FOUND,
      })
    }

    const chatId = attachment.message?.chatId ?? attachment.messageId ?? null
    if (!chatId) {
      throw new NotFoundException({
        code: ERROR_CODES.NOT_FOUND,
        message: ERROR_MESSAGES.NOT_FOUND,
      })
    }
    const chat = await this.chatRepo.findOne({
      where: { id: chatId },
    })
    if (!chat) {
      throw new NotFoundException({
        code: ERROR_CODES.CHAT_NOT_FOUND,
        message: ERROR_MESSAGES.CHAT_NOT_FOUND,
      })
    }

    if (chat.userAId !== req.user.id && chat.userBId !== req.user.id) {
      throw new ForbiddenException({
        code: ERROR_CODES.NOT_CHAT_PARTICIPANT,
        message: ERROR_MESSAGES.NOT_CHAT_PARTICIPANT,
      })
    }

    res.setHeader('Content-Type', attachment.mimeType)
    res.setHeader('Cache-Control', 'private, max-age=3600')
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${attachment.originalName ?? 'attachment'}"`,
    )
    res.status(200).send(attachment.data)
  }

  /**
   * Multipart/form-data fields:
   *   - `file` (required): the media binary.
   *   - `type` (optional): upload category, `'image'` or `'video'` (Task 4.2);
   *     absent defaults to image. Validated by UploadFileDto.
   *
   * Response 200 with the shared ApiResponse envelope containing the
   * internal URL (/api/v1/attachments/{id}) in `data.url`.
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
    @Req() req: AuthenticatedRequest,
    @Body() dto: UploadFileDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ApiResponse<FileUploadResponse>> {
    const data =
      dto.type === 'video'
        ? await this.filesService.uploadVideo(file, req.user)
        : await this.filesService.uploadImage(file, req.user)
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }
  }
}
