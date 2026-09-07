import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common'
import type { Response } from 'express'
import { ERROR_CODES } from '@email-chat-pro/constants'

interface ErrorBody {
  code: string
  message: string
}

/**
 * Global exception filter (architecture.md §Error Handling).
 *
 * Converts every thrown exception into the standardized API error envelope:
 *
 *   { success: false, error: { code, message }, timestamp }
 *
 * Unexpected/non-HTTP errors are reported as a generic INTERNAL_ERROR so that
 * internal implementation details (stack traces, database errors) are never
 * exposed to clients.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const { status, error } = this.toError(exception)

    response.status(status).json({
      success: false,
      error,
      timestamp: new Date().toISOString(),
    })
  }

  private toError(exception: unknown): { status: number; error: ErrorBody } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const body = exception.getResponse()

      if (typeof body === 'string') {
        return {
          status,
          error: { code: this.codeForStatus(status), message: body },
        }
      }

      const record = body as Record<string, unknown>
      return {
        status,
        error: {
          code: typeof record.code === 'string' ? record.code : this.codeForStatus(status),
          message: this.messageFrom(record, exception.message),
        },
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'An unexpected error occurred' },
    }
  }

  private messageFrom(record: Record<string, unknown>, fallback: string): string {
    const { message } = record
    if (typeof message === 'string') return message
    if (Array.isArray(message)) return message.join(', ')
    if (message === undefined || message === null) return fallback
    return String(message)
  }

  private codeForStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ERROR_CODES.VALIDATION_ERROR
      case HttpStatus.UNAUTHORIZED:
        return ERROR_CODES.UNAUTHORIZED
      case HttpStatus.FORBIDDEN:
        return ERROR_CODES.FORBIDDEN
      case HttpStatus.NOT_FOUND:
        return ERROR_CODES.NOT_FOUND
      case HttpStatus.CONFLICT:
        return ERROR_CODES.CONFLICT
      case HttpStatus.TOO_MANY_REQUESTS:
        return ERROR_CODES.RATE_LIMIT_EXCEEDED
      default:
        return ERROR_CODES.INTERNAL_ERROR
    }
  }
}
