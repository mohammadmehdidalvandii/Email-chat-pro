import type { TypeOrmModuleOptions } from '@nestjs/typeorm'

/**
 * Default local PostgreSQL connection, matching docker-compose.yml.
 * Uses 127.0.0.1 (not localhost) so TCP always targets the container on IPv4;
 * on some systems localhost resolves to ::1 and can hit a different 5432 listener.
 */
const DEFAULT_DATABASE_URL =
  'postgres://email_chat_dev:email_chat_dev_password@127.0.0.1:5432/email_chat_pro'

/** Returns the TypeORM options used to connect to the local database. */
export function getDatabaseConfig(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    url: resolveDatabaseUrl(),
    autoLoadEntities: true,
    synchronize: false,
  }
}

/**
 * Resolves the connection URL for TypeORM.
 *
 * The hardcoded local default is a development convenience, so it is only ever
 * used outside production. In production, a missing or unparseable DATABASE_URL
 * fails fast with a configuration error: silently falling back would point a
 * production deployment at the developer's local database.
 *
 * The thrown message names only the environment variable. The URL, the
 * credentials, and the default are never interpolated into it, so nothing
 * sensitive reaches the logs.
 */
function resolveDatabaseUrl(): string {
  const configured = process.env.DATABASE_URL

  if (!configured) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Database configuration error: DATABASE_URL is required when NODE_ENV=production. ' +
          'Set it to a valid PostgreSQL connection URL.',
      )
    }
    return DEFAULT_DATABASE_URL
  }

  // Reject a malformed value here rather than letting TypeORM surface an opaque
  // driver error at connection time. Only the protocol is inspected; neither the
  // URL nor any part of the credential is echoed.
  let protocol: string
  try {
    ;({ protocol } = new URL(configured))
  } catch {
    throw new Error(
      'Database configuration error: DATABASE_URL is not a valid PostgreSQL connection URL. ' +
        'It must be a postgres:// or postgresql:// URL.',
    )
  }
  if (protocol !== 'postgres:' && protocol !== 'postgresql:') {
    throw new Error(
      'Database configuration error: DATABASE_URL must be a postgres:// or postgresql:// URL.',
    )
  }

  return configured
}
