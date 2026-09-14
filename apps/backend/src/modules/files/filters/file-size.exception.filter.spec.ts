import { PayloadTooLargeException } from '@nestjs/common'
import { ERROR_CODES, ERROR_MESSAGES } from '@email-chat-pro/constants'
import { FileSizeExceptionFilter } from './file-size.exception.filter'

describe('FileSizeExceptionFilter', () => {
  it('maps PayloadTooLargeException to a 400 standardized error envelope', () => {
    const json = jest.fn()
    const status = jest.fn().mockReturnValue({ json })
    const getResponse = jest.fn().mockReturnValue({ status })
    const host = {
      switchToHttp: () => ({ getResponse }),
    } as never

    const filter = new FileSizeExceptionFilter()
    filter.catch(new PayloadTooLargeException() as never, host)

    expect(status).toHaveBeenCalledWith(400)
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: { code: ERROR_CODES.VALIDATION_ERROR, message: ERROR_MESSAGES.FILE_SIZE_EXCEEDED },
      timestamp: expect.any(String),
    })
  })
})
