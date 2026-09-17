import { HttpStatus } from '@nestjs/common'
import { ThrottlerException } from '@nestjs/throttler'
import { ERROR_CODES, ERROR_MESSAGES } from '@email-chat-pro/constants'
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
