import { DataSource } from 'typeorm'
import { User } from '../modules/auth/entities/user.entity'
import { Chat } from '../modules/chats/entities/chat.entity'
import { Message } from '../modules/messages/entities/message.entity'

/**
 * Default local PostgreSQL connection, matching docker-compose.yml.
 * Uses 127.0.0.1 (not localhost) so TCP always targets the container on IPv4;
 * on some systems localhost resolves to ::1 and can hit a different 5432 listener.
 */
const DEFAULT_DATABASE_URL =
  'postgres://email_chat_dev:email_chat_dev_password@127.0.0.1:5432/email_chat_pro'

/**
 * TypeORM DataSource used by the migration CLI (architecture.md §database/data-source.ts).
 * The application runtime connection is configured separately in
 * src/config/database.config.ts via getDatabaseConfig().
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
  entities: [User, Chat, Message],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
})
