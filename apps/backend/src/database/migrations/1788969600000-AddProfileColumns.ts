import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Task 1.4 — adds user profile columns to the users table.
 *
 * - username: unique case-insensitive handle (3-30 chars, letters/digits/_/-),
 *   enforcing architecture.md §Data Model. Uniqueness is case-insensitive via a
 *   functional unique index on LOWER(username) so "Alice" and "alice" cannot
 *   coexist.
 * - full_name, bio, avatar_url: optional profile fields (nullable).
 * - profile_completed: tracks whether the user has finished profile setup.
 * - last_seen_at: when the user was last online, defaults to creation time.
 *
 * All new columns are nullable except the defaults, so existing rows remain
 * valid until a profile is completed.
 */
export class AddProfileColumns1788969600000 implements MigrationInterface {
  name = 'AddProfileColumns1788969600000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "username" character varying(30)`)
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
      `CREATE UNIQUE INDEX "uq_users_username" ON "users" (LOWER("username"))`,
    )
    await queryRunner.query(`ALTER TABLE "users" ADD "full_name" character varying(100)`)
    await queryRunner.query(`ALTER TABLE "users" ADD "bio" text`)
    await queryRunner.query(`ALTER TABLE "users" ADD "avatar_url" character varying(500)`)
    await queryRunner.query(
      `ALTER TABLE "users" ADD "profile_completed" boolean NOT NULL DEFAULT false`,
    )
    await queryRunner.query(
      `ALTER TABLE "users" ADD "last_seen_at" TIMESTAMP NOT NULL DEFAULT now()`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_seen_at"`)
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "profile_completed"`)
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_url"`)
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "bio"`)
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "full_name"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_users_username"`)
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "chk_users_username_format"`,
    )
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "chk_users_username_length"`,
    )
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "username"`)
  }
}
