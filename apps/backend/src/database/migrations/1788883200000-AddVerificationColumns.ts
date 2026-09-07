import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Task 1.2 — adds email verification columns to the users table.
 *
 * - verification_token_hash: SHA-256 hash of the plaintext verification token
 *   (the plaintext token itself is never persisted). Nullable until a token is
 *   generated and reset to NULL once the email is verified.
 * - verification_token_expires_at: timestamp after which the token is rejected.
 * - verified_at: when the email address was successfully verified.
 *
 * All three columns are nullable so existing rows (registered without a token,
 * e.g. before this migration) remain valid.
 */
export class AddVerificationColumns1788883200000 implements MigrationInterface {
  name = 'AddVerificationColumns1788883200000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "verification_token_hash" character varying(64)`,
    )
    await queryRunner.query(`ALTER TABLE "users" ADD "verification_token_expires_at" TIMESTAMP`)
    await queryRunner.query(`ALTER TABLE "users" ADD "verified_at" TIMESTAMP`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "verified_at"`)
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "verification_token_expires_at"`)
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "verification_token_hash"`)
  }
}
