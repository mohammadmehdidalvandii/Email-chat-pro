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
    url: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
    autoLoadEntities: true,
    synchronize: false,
  }
}
