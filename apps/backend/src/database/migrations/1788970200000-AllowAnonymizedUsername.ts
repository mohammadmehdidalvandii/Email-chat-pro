import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Task 1.5 — allows the anonymized `deleted#{uuid}` username.
 *
 * architecture.md §Account Deletion requires renaming a deleted account's
 * username to `deleted#{original_id}` (8 + 36 chars, contains `#`). The Task
 * 1.4 column allocated 30 chars and its CHECK constraints (3–30 length,
 * `^[a-zA-Z0-9_-]+$`) cannot store that value. This migration widens the
 * column and relaxes the constraints so an account-deletion write accepts
 * EITHER a real username (unchanged rules) OR the reserved anonymized form:
 *
 *   "username" IS NULL
 *   OR "username" ~ '^[a-zA-Z0-9_-]+$'        -- valid username, unchanged
 *   OR "username" ~ '^deleted#[0-9a-f-]{36}$' -- anonymized deleted#<uuid>
 *
 * Normal username validation (3–30, alphanumeric/_/-) is not weakened: only
 * the reserved `deleted#<uuid>` value is additionally permitted. The
 * case-insensitive unique index on LOWER(username) is preserved, and `deleted#`
 * remains outside the valid username alphabet so it can never collide with a
 * real handle.
 */
export class AllowAnonymizedUsername1788970200000 implements MigrationInterface {
  name = 'AllowAnonymizedUsername1788970200000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "username" TYPE character varying(64)`,
    )
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "chk_users_username_length"`)
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "chk_users_username_format"`)
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "chk_users_username_length" CHECK (
        "username" IS NULL
        OR (char_length("username") >= 3 AND char_length("username") <= 30)
        OR "username" ~ '^deleted#[0-9a-f-]{36}$'
      )`,
    )
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "chk_users_username_format" CHECK (
        "username" IS NULL
        OR "username" ~ '^[a-zA-Z0-9_-]+$'
        OR "username" ~ '^deleted#[0-9a-f-]{36}$'
      )`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "chk_users_username_format"`)
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "chk_users_username_length"`)
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "chk_users_username_length" CHECK (
        "username" IS NULL OR (char_length("username") >= 3 AND char_length("username") <= 30)
      )`,
    )
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "chk_users_username_format" CHECK (
        "username" IS NULL OR "username" ~ '^[a-zA-Z0-9_-]+$'
      )`,
    )
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "username" TYPE character varying(30)`,
    )
  }
}
