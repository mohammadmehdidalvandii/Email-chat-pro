import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  PayloadTooLargeException,
} from '@nestjs/common'
import type { Response } from 'express'
import { ERROR_CODES, ERROR_MESSAGES } from '@email-chat-pro/constants'

/**
 * Maps the platform's PayloadTooLargeException — surfaced by @nestjs/
 * platform-express when Multer raises `LIMIT_FILE_SIZE` for an upload that
 * exceeds the FileInterceptor size limit — to the standardized error envelope
 * with HTTP 400. (In this Nest 11 install the size error is a
 * PayloadTooLargeException, not a FileTooLargeException.)
 *
 * The filter is controller-scoped so it runs before AppModule's global
 * `@Catch()` HttpExceptionFilter, which would otherwise render the platform
 * exception as a bare 413 with no standard error code.
 */
@Catch(PayloadTooLargeException)
export class FileSizeExceptionFilter implements ExceptionFilter {
  catch(_exception: PayloadTooLargeException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    response.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      error: { code: ERROR_CODES.VALIDATION_ERROR, message: ERROR_MESSAGES.FILE_SIZE_EXCEEDED },
      timestamp: new Date().toISOString(),
    })
  }
}
