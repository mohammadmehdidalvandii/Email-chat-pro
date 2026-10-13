import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Task 4.1 — PostgreSQL BYTEA image storage (replaces Cloudinary).
 *
 * Additive migration: creates the attachments table only. Safe to
 * roll back (down = DROP TABLE) because no existing data depends on
 * it — historical Cloudinary URLs remain in messages.media_url and
 * are handled by a separate, optional backfill phase (P8 in the audit).
 *
 * Invariants enforced at the database level:
 *   - message_id REFERENCES messages(id) ON DELETE CASCADE: an
 *     attachment disappears with its message (no orphan files; no
 *     message-deletion feature exists today, but this future-proofs).
 *   - sender_id REFERENCES users(id): every attachment is attributed
 *     to an actual user (audit/cleanup-by-user queries).
 *   - CHECK (mime_type IN (...)): only the formats image-file.ts
 *     inspects (jpeg/png/gif/webp) can ever be stored — the
 *     application is the sole writer, so the constraint is a
 *     defense-in-depth guard, not a trust boundary.
 *   - file_size_bytes > 0: rejects empty/zero-byte attachments.
 *   - data BYTEA NOT NULL: the binary is always present.
 *
 * Indexes follow the project's naming convention
 * (idx_<table>_<column>) used by CreateMessagesTable.
 */
export class CreateAttachmentsTable1790000000000 implements MigrationInterface {
  name = 'CreateAttachmentsTable1790000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "attachments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "message_id" uuid NOT NULL REFERENCES "messages"("id") ON DELETE CASCADE,
        "sender_id" uuid NOT NULL REFERENCES "users"("id"),
        "mime_type" VARCHAR(100) NOT NULL,
        "file_size_bytes" INTEGER NOT NULL,
        "data" BYTEA NOT NULL,
        "original_name" VARCHAR(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "chk_attachments_mime"
          CHECK ("mime_type" IN ('image/jpeg','image/png','image/gif','image/webp')),
        CONSTRAINT "chk_attachments_file_size"
          CHECK ("file_size_bytes" > 0)
      )
    `)
    await queryRunner.query(
      `CREATE INDEX "idx_attachments_message_id" ON "attachments" ("message_id")`,
    )
    await queryRunner.query(
      `CREATE INDEX "idx_attachments_sender_id" ON "attachments" ("sender_id")`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "attachments"`)
  }
}
