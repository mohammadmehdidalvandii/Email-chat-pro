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
  IMAGE_MIN_DIMENSION_PX,
} from '@email-chat-pro/constants'
import type { FileUploadResponse } from '@email-chat-pro/types'
import { v2 as cloudinary } from 'cloudinary'
import { getCloudinaryConfig } from '../../config/cloudinary.config'
import { ImageFormat, inspectImageBuffer, mimeTypeForFormat } from './image-file'

/** Cloudinary media folder for this application's image uploads (Task 4.1). */
const IMAGE_UPLOAD_FOLDER = 'email-chat-pro/images'

/**
 * File upload service (Task 4.1 — POST /files/upload).
 *
 * Validation is authoritative and server-side (architecture.md §File Upload
 * Validation): the file must be present, carry image magic bytes (JPEG, PNG,
 * GIF, WebP), and be within 100×100–5000×5000 pixels. File size is capped by
 * the controller's Multer limit (IMAGE_MAX_SIZE_BYTES).
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
      const url = await this.uploadToCloudinary(file.buffer, info.format)
      return { url }
    } catch (error) {
      this.logger.error(`Image upload to Cloudinary failed: ${this.errorMessage(error)}`)
      throw new InternalServerErrorException({
        code: ERROR_CODES.INTERNAL_ERROR,
        message: ERROR_MESSAGES.FILE_UPLOAD_FAILED,
      })
    }
  }

  private async uploadToCloudinary(buffer: Buffer, format: ImageFormat): Promise<string> {
    this.ensureCloudinaryConfigured()
    const dataUri = `data:${mimeTypeForFormat(format)};base64,${buffer.toString('base64')}`
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: IMAGE_UPLOAD_FOLDER,
      resource_type: 'image',
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
