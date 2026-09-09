import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Task 2.2 — creates the messages table per architecture.md §Data Model
 * (Messages).
 *
 * Message persistence model. Invariants enforced at the database level:
 *   - chat_id REFERENCES chats(id): every message belongs to one chat.
 *   - sender_id REFERENCES users(id): every message is attributed to an actual
 *     user; the FK keeps the id even if that account is later anonymized.
 *   - CHECK (message_type IN ('text','image','video')): the DB is future-ready
 *     for Phase 4 media messages, though Task 2.2 only persists 'text'.
 *   - content TEXT NOT NULL: a message always has content (empty messages are
 *     rejected at the API layer and cannot be stored).
 *
 * idx_messages_chat_created (chat_id, created_at DESC) is the hot index for
 * fetching the last N messages of a conversation (architecture.md §Schema
 * Reasoning for Messages).
 */
export class CreateMessagesTable1789050600000 implements MigrationInterface {
  name = 'CreateMessagesTable1789050600000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "chat_id" uuid NOT NULL REFERENCES "chats"("id"),
        "sender_id" uuid NOT NULL REFERENCES "users"("id"),
        "content" TEXT NOT NULL,
        "message_type" VARCHAR(20) NOT NULL DEFAULT 'text',
        "media_url" VARCHAR(500),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "chk_messages_message_type"
          CHECK ("message_type" IN ('text', 'image', 'video'))
      )
    `)
    await queryRunner.query(`CREATE INDEX "idx_messages_chat_id" ON "messages" ("chat_id")`)
    await queryRunner.query(
      `CREATE INDEX "idx_messages_sender_id" ON "messages" ("sender_id")`,
    )
    await queryRunner.query(
      `CREATE INDEX "idx_messages_created_at" ON "messages" ("created_at")`,
    )
    await queryRunner.query(
      `CREATE INDEX "idx_messages_chat_created" ON "messages" ("chat_id", "created_at" DESC)`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "messages"`)
  }
}