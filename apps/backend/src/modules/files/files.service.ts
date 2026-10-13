import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  IMAGE_MAX_DIMENSION_PX,
  IMAGE_MAX_SIZE_BYTES,
  IMAGE_MIN_DIMENSION_PX,
  VIDEO_MAX_DURATION_SECONDS,
  VIDEO_MAX_SIZE_BYTES,
} from '@email-chat-pro/constants'
import type { FileUploadResponse } from '@email-chat-pro/types'
import { Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Attachment } from './entities/attachment.entity'
import { inspectImageBuffer, mimeTypeForFormat } from './image-file'
import { detectVideoFormat, mimeTypeForVideoFormat, readVideoDuration } from './video-file'
import { User } from '../auth/entities/user.entity'

/**
 * File upload service — PostgreSQL BYTEA storage (replaces Cloudinary).
 *
 * Images and videos are validated server-side (magic bytes + dimensions +
 * duration for video) then stored as binary in the attachments table.
 * The upload endpoint returns an internal URL (/api/v1/attachments/{id})
 * that the frontend uses exactly like the previous external URL.
 */
@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name)

  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentRepo: Repository<Attachment>,
  ) {}

  async uploadImage(file: Express.Multer.File | undefined, sender: User): Promise<FileUploadResponse> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException({
        code: ERROR_CODES.FILE_REQUIRED,
        message: ERROR_MESSAGES.FILE_REQUIRED,
      })
    }

    if (file.buffer.length > IMAGE_MAX_SIZE_BYTES) {
      throw new BadRequestException({
        code: ERROR_CODES.FILE_SIZE_EXCEEDED,
        message: ERROR_MESSAGES.FILE_SIZE_EXCEEDED,
      })
    }

    const info = inspectImageBuffer(file.buffer)
    if (!info) {
      throw new BadRequestException({
        code: ERROR_CODES.FILE_TYPE_INVALID,
        message: ERROR_MESSAGES.FILE_TYPE_INVALID,
      })
    }

    if (
      info.width < IMAGE_MIN_DIMENSION_PX ||
      info.height < IMAGE_MIN_DIMENSION_PX ||
      info.width > IMAGE_MAX_DIMENSION_PX ||
      info.height > IMAGE_MAX_DIMENSION_PX
    ) {
      throw new BadRequestException({
        code: ERROR_CODES.FILE_DIMENSIONS_INVALID,
        message: ERROR_MESSAGES.FILE_DIMENSIONS_INVALID,
      })
    }

    const mimeType = mimeTypeForFormat(info.format)
    try {
      const attachment = this.attachmentRepo.create({
        mimeType,
        fileSizeBytes: file.buffer.length,
        data: file.buffer,
        originalName: file.originalname ?? null,
        senderId: sender.id,
        messageId: null,
      })
      const saved = await this.attachmentRepo.save(attachment)
      return { url: `/api/v1/attachments/${saved.id}` }
    } catch (error) {
      this.logger.error(`Image DB insert failed: ${this.errorMessage(error)}`)
      throw new InternalServerErrorException({
        code: ERROR_CODES.FILE_UPLOAD_FAILED,
        message: ERROR_MESSAGES.FILE_UPLOAD_FAILED,
      })
    }
  }

  async uploadVideo(file: Express.Multer.File | undefined, sender: User): Promise<FileUploadResponse> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException({
        code: ERROR_CODES.FILE_REQUIRED,
        message: ERROR_MESSAGES.FILE_REQUIRED,
      })
    }

    if (file.buffer.length > VIDEO_MAX_SIZE_BYTES) {
      throw new BadRequestException({
        code: ERROR_CODES.FILE_SIZE_EXCEEDED,
        message: ERROR_MESSAGES.FILE_SIZE_EXCEEDED,
      })
    }

    const format = detectVideoFormat(file.buffer)
    if (!format) {
      throw new BadRequestException({
        code: ERROR_CODES.FILE_TYPE_INVALID,
        message: ERROR_MESSAGES.FILE_TYPE_INVALID,
      })
    }

    const durationSeconds = readVideoDuration(file.buffer, format)
    if (durationSeconds === null) {
      throw new BadRequestException({
        code: ERROR_CODES.VIDEO_DURATION_INVALID,
        message: ERROR_MESSAGES.VIDEO_DURATION_INVALID,
      })
    }
    if (durationSeconds > VIDEO_MAX_DURATION_SECONDS) {
      throw new BadRequestException({
        code: ERROR_CODES.VIDEO_DURATION_EXCEEDED,
        message: ERROR_MESSAGES.VIDEO_DURATION_EXCEEDED,
      })
    }

    const mimeType = mimeTypeForVideoFormat(format)
    try {
      const attachment = this.attachmentRepo.create({
        mimeType,
        fileSizeBytes: file.buffer.length,
        data: file.buffer,
        originalName: file.originalname ?? null,
        senderId: sender.id,
        messageId: null,
      })
      const saved = await this.attachmentRepo.save(attachment)
      return { url: `/api/v1/attachments/${saved.id}` }
    } catch (error) {
      this.logger.error(`Video DB insert failed: ${this.errorMessage(error)}`)
      throw new InternalServerErrorException({
        code: ERROR_CODES.FILE_UPLOAD_FAILED,
        message: ERROR_MESSAGES.FILE_UPLOAD_FAILED,
      })
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
  }
}
