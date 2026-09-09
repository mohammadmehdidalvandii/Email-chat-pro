import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Task 2.1 — creates the chats table per architecture.md §Data Model (Chats).
 *
 * One-to-one chat foundation. Invariants enforced at the database level:
 *   - UNIQUE (user_a, user_b): at most one chat per participant pair.
 *   - CHECK (user_a < user_b): participants are stored normalized, so (A,B)
 *     and (B,A) map to the same row.
 *   - CHECK (user_a <> user_b): a user cannot be in a chat with themselves.
 *
 * The two per-column indexes serve the participant lookup path (the pair
 * normalization helper always queries with a fixed user_a/user_b ordering).
 * This migration creates the data model only; no messages, WebSocket, or
 * frontend work is introduced (Task 2.1 scope).
 */
export class CreateChatsTable1788970600000 implements MigrationInterface {
  name = 'CreateChatsTable1788970600000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "chats" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_a" uuid NOT NULL REFERENCES "users"("id"),
        "user_b" uuid NOT NULL REFERENCES "users"("id"),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_chats_user_a_user_b" UNIQUE ("user_a", "user_b"),
        CONSTRAINT "chk_chats_user_a_lt_user_b" CHECK ("user_a" < "user_b"),
        CONSTRAINT "chk_chats_user_a_neq_user_b" CHECK ("user_a" <> "user_b")
      )
    `)
    await queryRunner.query(`CREATE INDEX "idx_chats_user_a" ON "chats" ("user_a")`)
    await queryRunner.query(`CREATE INDEX "idx_chats_user_b" ON "chats" ("user_b")`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "chats"`)
  }
}
