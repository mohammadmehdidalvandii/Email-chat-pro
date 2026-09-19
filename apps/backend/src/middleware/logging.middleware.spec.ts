jest.mock('../config/logger.config', () => ({
  logger: {
    http: jest.fn(),
  },
}))

import { LoggingMiddleware } from './logging.middleware'
import { logger } from '../config/logger.config'

describe('LoggingMiddleware — Task 4.6 monitoring foundation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calls next and registers a finish listener that logs request metadata', (done) => {
    const middleware = new LoggingMiddleware()
    const req = { method: 'GET', originalUrl: '/api/v1/status' } as never
    const res: Record<string, unknown> = {
      statusCode: 200,
      on: jest.fn((event: string, callback: () => void) => {
        if (event === 'finish') {
          setImmediate(callback)
        }
      }),
    }
    const next = jest.fn()

    middleware.use(req as never, res as never, next)

    expect(next).toHaveBeenCalled()
    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function))

    setImmediate(() => {
      expect(logger.http).toHaveBeenCalledWith('request', {
        method: 'GET',
        path: '/api/v1/status',
        status: 200,
        duration: expect.stringContaining('ms'),
      })
      done()
    })
  })
})
