import { HttpStatus } from '@nestjs/common'
import { ThrottlerException } from '@nestjs/throttler'
import { ERROR_CODES, ERROR_MESSAGES } from '@email-chat-pro/constants'
import { logger } from '../../config/logger.config'
import { HttpExceptionFilter } from './http-exception.filter'

describe('HttpExceptionFilter — Task 4.5 rate-limit mapping', () => {
  it('maps a ThrottlerException to a 429 RATE_LIMIT_EXCEEDED envelope', () => {
    const json = jest.fn()
    const status = jest.fn().mockReturnValue({ json })
    const getResponse = jest.fn().mockReturnValue({ status })
    const host = { switchToHttp: () => ({ getResponse }) } as never

    const filter = new HttpExceptionFilter()
    filter.catch(new ThrottlerException(ERROR_MESSAGES.TOO_MANY_REQUESTS) as never, host)

    expect(status).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS)
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        message: ERROR_MESSAGES.TOO_MANY_REQUESTS,
      },
      timestamp: expect.any(String),
    })
  })

  it('keeps the throttler fallback message when no explicit message is set', () => {
    const json = jest.fn()
    const status = jest.fn().mockReturnValue({ json })
    const getResponse = jest.fn().mockReturnValue({ status })
    const host = { switchToHttp: () => ({ getResponse }) } as never

    const filter = new HttpExceptionFilter()
    filter.catch(new ThrottlerException() as never, host)

    expect(status).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS)
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        message: 'ThrottlerException: Too Many Requests',
      },
      timestamp: expect.any(String),
    })
  })
})

describe('HttpExceptionFilter — Task 4.6 error logging', () => {
  beforeEach(() => {
    jest.spyOn(logger, 'error').mockImplementation(() => {})
    jest.spyOn(logger, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('logs HTTP exceptions with warn level and a safe payload for client errors', () => {
    const json = jest.fn()
    const status = jest.fn().mockReturnValue({ json })
    const getResponse = jest.fn().mockReturnValue({ status })
    const host = { switchToHttp: () => ({ getResponse }) } as never

    const filter = new HttpExceptionFilter()
    filter.catch(
      new HttpException({ code: ERROR_CODES.VALIDATION_ERROR, message: 'bad' }, HttpStatus.BAD_REQUEST),
      host as never,
    )

    expect(logger.warn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ code: HttpStatus.BAD_REQUEST, isClientError: true }),
    )
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('logs non-HTTP exceptions with error level', () => {
    const json = jest.fn()
    const status = jest.fn().mockReturnValue({ json })
    const getResponse = jest.fn().mockReturnValue({ status })
    const host = { switchToHttp: () => ({ getResponse }) } as never

    const filter = new HttpExceptionFilter()
    filter.catch(new Error('database connection lost') as never, host as never)

    expect(logger.error).toHaveBeenCalledWith(
      'Error',
      expect.objectContaining({ code: HttpStatus.INTERNAL_SERVER_ERROR, isClientError: false }),
    )
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('logs only the exception class name and HTTP status — never the message or stack', () => {
    const json = jest.fn()
    const status = jest.fn().mockReturnValue({ json })
    const getResponse = jest.fn().mockReturnValue({ status })
    const host = { switchToHttp: () => ({ getResponse }) } as never

    const filter = new HttpExceptionFilter()
    const secret = 'JWT_SECRET=super-secret-password'
    filter.catch(new Error(secret) as never, host as never)

    expect(logger.error).toHaveBeenCalledWith(
      'Error',
      expect.objectContaining({ code: HttpStatus.INTERNAL_SERVER_ERROR }),
    )
    const loggedArgs = (logger.error as jest.Mock).mock.calls[0]
    const payload = loggedArgs[1] as Record<string, unknown>
    expect(JSON.stringify(payload)).not.toContain(secret)
    expect(JSON.stringify(payload)).not.toContain('super-secret')
  })
})
