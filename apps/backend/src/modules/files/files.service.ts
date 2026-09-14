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
import { v2 as cloudinary } from 'cloudinary'
import { getCloudinaryConfig } from '../../config/cloudinary.config'
import { inspectImageBuffer, mimeTypeForFormat } from './image-file'
import { detectVideoFormat, mimeTypeForVideoFormat, readVideoDuration } from './video-file'

/** Cloudinary media folder for this application's image uploads (Task 4.1). */
const IMAGE_UPLOAD_FOLDER = 'email-chat-pro/images'

/** Cloudinary media folder for this application's video uploads (Task 4.2). */
const VIDEO_UPLOAD_FOLDER = 'email-chat-pro/videos'

/**
 * File upload service (Task 4.1 image / Task 4.2 video — POST /files/upload).
 *
 * Validation is authoritative and server-side (architecture.md §File Upload
 * Validation): the file must be present, carry recognized media magic bytes
 * (images: JPEG/PNG/GIF/WebP; videos: mp4/mov/webm/avi), and comply with its
 * type's limits (images 100×100–5000×5000 px and ≤10MB; videos ≤50MB and ≤5
 * minutes). Per-type size caps are enforced here because the shared route can
 * only carry one Multer limit — the larger 50MB video cap; anything beyond that
 * is caught by Multer and mapped by FileSizeExceptionFilter.
 *
 * Cloudinary is configured lazily on the first upload (current-task.md
 * decision 3) so the API boots without media credentials; a missing-config or
 * provider failure is surfaced as a generic 500 `FILE_UPLOAD_FAILED` so no
 * Cloudinary details leak. Failures are logged with the NestJS Logger (the
 * interim structured-logging tool before Winston — Task 4.6; rules.md §28
 * forbids console.log).
 *
 * @remarks `cloudinary.uploader.upload` is called with a `data:` URI because
 * the SDK accepts base64 data URIs directly and returns a Promise — no stream
 * plumbing is needed for in-memory uploads.
 */
@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name)
  private cloudinaryConfigured = false

  /**
   * Validates an uploaded image and stores it in Cloudinary.
   *
   * The Cloudinary call itself is wrapped so that plain Errors (missing
   * credentials, provider rejection, missing secure_url) are converted to the
   * standardized 500 envelope — never leaked upstream.
   */
  async uploadImage(file: Express.Multer.File | undefined): Promise<FileUploadResponse> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: ERROR_MESSAGES.FILE_REQUIRED,
      })
    }

    if (file.buffer.length > IMAGE_MAX_SIZE_BYTES) {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: ERROR_MESSAGES.FILE_SIZE_EXCEEDED,
      })
    }

    const info = inspectImageBuffer(file.buffer)
    if (!info) {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
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
        code: ERROR_CODES.VALIDATION_ERROR,
        message: ERROR_MESSAGES.FILE_DIMENSIONS_INVALID,
      })
    }

    try {
      const url = await this.uploadToCloudinary(
        mimeTypeForFormat(info.format),
        file.buffer,
        'image',
        IMAGE_UPLOAD_FOLDER,
      )
      return { url }
    } catch (error) {
      this.logger.error(`Image upload to Cloudinary failed: ${this.errorMessage(error)}`)
      throw new InternalServerErrorException({
        code: ERROR_CODES.INTERNAL_ERROR,
        message: ERROR_MESSAGES.FILE_UPLOAD_FAILED,
      })
    }
  }

  /**
   * Validates an uploaded video and stores it in Cloudinary (Task 4.2).
   *
   * The video must be ≤50MB, carry recognized video magic bytes (mp4/mov/webm/
   * avi — FILE_TYPE_INVALID otherwise), and its header must yield a duration of
   * ≤5 minutes. A recognized format whose duration cannot be read is rejected
   * (VIDEO_DURATION_INVALID) so the duration rule can never be silently
   * bypassed. Cloudinary failures map to the same standardized 500 as images.
   */
  async uploadVideo(file: Express.Multer.File | undefined): Promise<FileUploadResponse> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: ERROR_MESSAGES.FILE_REQUIRED,
      })
    }

    if (file.buffer.length > VIDEO_MAX_SIZE_BYTES) {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: ERROR_MESSAGES.FILE_SIZE_EXCEEDED,
      })
    }

    const format = detectVideoFormat(file.buffer)
    if (!format) {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: ERROR_MESSAGES.FILE_TYPE_INVALID,
      })
    }

    const durationSeconds = readVideoDuration(file.buffer, format)
    if (durationSeconds === null) {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: ERROR_MESSAGES.VIDEO_DURATION_INVALID,
      })
    }
    if (durationSeconds > VIDEO_MAX_DURATION_SECONDS) {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: ERROR_MESSAGES.VIDEO_DURATION_EXCEEDED,
      })
    }

    try {
      const url = await this.uploadToCloudinary(
        mimeTypeForVideoFormat(format),
        file.buffer,
        'video',
        VIDEO_UPLOAD_FOLDER,
      )
      return { url }
    } catch (error) {
      this.logger.error(`Video upload to Cloudinary failed: ${this.errorMessage(error)}`)
      throw new InternalServerErrorException({
        code: ERROR_CODES.INTERNAL_ERROR,
        message: ERROR_MESSAGES.FILE_UPLOAD_FAILED,
      })
    }
  }

  private async uploadToCloudinary(
    mimeType: string,
    buffer: Buffer,
    resourceType: 'image' | 'video',
    folder: string,
  ): Promise<string> {
    this.ensureCloudinaryConfigured()
    const dataUri = `data:${mimeType};base64,${buffer.toString('base64')}`
    const result = await cloudinary.uploader.upload(dataUri, {
      folder,
      resource_type: resourceType,
    })
    const url = result.secure_url
    if (!url || url.trim() === '') {
      throw new Error('Cloudinary response missing secure_url')
    }
    return url
  }

  private ensureCloudinaryConfigured(): void {
    if (this.cloudinaryConfigured) return
    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig()
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret })
    this.cloudinaryConfigured = true
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
  }
}
