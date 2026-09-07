import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Task 1.1 — creates the users table with only the registration columns.
 *
 * Profile columns (username, full_name, bio, avatar_url, profile_completed,
 * last_seen_at) are deferred to the Profile Setup task (Task 1.4) per the
 * approved project decision; the definition follows architecture.md §Data Model.
 *
 * Email uniqueness is enforced by a database UNIQUE constraint, and the email
 * format CHECK constraint mirrors the shared EMAIL_REGEX.
 */
export class CreateUsersTable1788710400000 implements MigrationInterface {
  name = 'CreateUsersTable1788710400000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" character varying(255) NOT NULL,
        "password_hash" character varying(255) NOT NULL,
        "is_verified" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "uq_users_email" UNIQUE ("email"),
        CONSTRAINT "chk_users_email_format" CHECK (
          "email" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'
        )
      )
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`)
  }
}
