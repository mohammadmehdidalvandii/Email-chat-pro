/**
 * HTTP request logging middleware (monitoring foundation — Task 4.6).
 *
 * Logs every incoming request with method, path, response status, and
 * duration once the response is finished. Uses the shared Winston logger
 * so logs are structured and parseable by monitoring tools.
 *
 * Only safe request metadata is logged (method, URL, status, duration).
 * No request bodies, query parameters, or headers are logged — none of
 * those should contain sensitive data in a structured-accessible form.
 */
import { Injectable, NestMiddleware } from '@nestjs/common'
import type { Request, Response } from 'express'
import { logger } from '../config/logger.config'

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: () => void): void {
    const start = Date.now()

    res.on('finish', () => {
      logger.http('request', {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        duration: `${Date.now() - start}ms`,
      })
    })

    next()
  }
}
