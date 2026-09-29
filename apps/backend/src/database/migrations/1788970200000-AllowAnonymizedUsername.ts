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
    // Rollback safety: this migration widened `username` to varchar(64) and
    // relaxed the CHECK constraints specifically to admit the reserved
    // `deleted#<uuid>` form (44 chars) that account deletion writes. Restoring
    // the pre-migration varchar(30) / 3-30-length state is impossible while
    // such a row exists — the ADD CONSTRAINT and the ALTER TYPE both fail with
    // "check constraint ... is violated by some row".
    //
    // This down() must never modify data, so it does not clear or rewrite the
    // offending usernames. Instead it refuses to proceed and tells the operator
    // exactly what to resolve, leaving the schema and the data untouched. The
    // guard runs before any DDL, so a failed rollback is a no-op.
    const offenders = await queryRunner.query(
      `SELECT count(*)::int AS "count" FROM "users"
       WHERE "username" ~ '^deleted#[0-9a-f-]{36}$'`,
    )
    const anonymizedCount = Number(offenders[0]?.count ?? 0)
    if (anonymizedCount > 0) {
      throw new Error(
        `Cannot revert AllowAnonymizedUsername: ${anonymizedCount} user(s) have an ` +
          `anonymized username matching ^deleted#[0-9a-f-]{36}$ (44 chars), which exceeds ` +
          `the pre-migration varchar(30) limit. This migration does not modify data, so ` +
          `resolve these rows manually first — clear the username of the affected ` +
          `soft-deleted accounts (e.g. UPDATE "users" SET "username" = NULL WHERE ` +
          `"username" ~ '^deleted#[0-9a-f-]{36}$';) — then re-run the revert.`,
      )
    }
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
