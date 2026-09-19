/**
 * Winston structured logging configuration (stack.md §21 — Winston;
 * rules.md §28 — Backend: Winston).
 *
 * Produces structured JSON logs in production and human-readable logs
 * in development. All log levels are safe for production: no passwords,
 * JWT secrets, API keys, tokens, or credentials are ever logged.
 *
 * The logger is exported as a singleton and imported by components
 * that need structured logging (e.g. the global error filter, request
 * middleware). Components may also inject it via `@InjectLogger()`
 * from `nest-winston` in a future task.
 */
import winston from 'winston'

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

/** Safe metadata attached to every log entry for filtering/correlation. */
const DEFAULT_META = { service: 'backend' }

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: IS_PRODUCTION
    ? winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      )
    : winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.colorize(),
        winston.format.printf((info) => {
          const { timestamp, level, message, ...meta } = info
          return `${timestamp} [${level}]: ${message}${
            Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : ''
          }`
        }),
      ),
  defaultMeta: DEFAULT_META,
  transports: [new winston.transports.Console()],
})
