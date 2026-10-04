import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Task 5.x — adds per-message read state and migrates timestamps to TIMESTAMPTZ.
 *
 * Invariants:
 *   - read_at TIMESTAMPTZ: when the recipient last read the message (NULL = unread).
 *     PostgreSQL stores this as UTC internally; JS Date round-trips correctly.
 *   - created_at/updated_at migrated from TIMESTAMP to TIMESTAMPTZ so the backend
 *     server TZ no longer matters — pg normalizes to UTC, returns with offset,
 *     and frontend new Date(iso) + Intl renders each user's own local time
 *     (handling DST/midnight automatically).
 *
 * Why TIMESTAMPTZ: the existing TIMESTAMP columns have no zone; the pg driver
 * materializes them as local-time Date, so toISOString() can mis-convert unless
 * the backend server TZ matches the storage assumption. TIMESTAMPTZ avoids this
 * entirely.
 */
export class AddMessageReadTimestamp1789560000000 implements MigrationInterface {
  name = 'AddMessageReadTimestamp1789560000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add read_at column (nullable, UTC, default NULL)
    await queryRunner.query(`
      ALTER TABLE "messages"
        ADD COLUMN "read_at" TIMESTAMPTZ
    `)

    // 2. Migrate created_at from TIMESTAMP to TIMESTAMPTZ
    //    pg will interpret the existing local-time value as UTC and store with offset
    await queryRunner.query(`
      ALTER TABLE "messages"
        ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ
          USING "created_at" AT TIME ZONE 'UTC'
    `)

    // 3. Migrate updated_at from TIMESTAMP to TIMESTAMPTZ
    await queryRunner.query(`
      ALTER TABLE "messages"
        ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ
          USING "updated_at" AT TIME ZONE 'UTC'
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 3. Revert updated_at to TIMESTAMP (lose tz info — acceptable for rollback)
    await queryRunner.query(`
      ALTER TABLE "messages"
        ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP
          USING "updated_at" AT TIME ZONE 'UTC'
    `)

    // 2. Revert created_at to TIMESTAMP
    await queryRunner.query(`
      ALTER TABLE "messages"
        ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP
          USING "created_at" AT TIME ZONE 'UTC'
    `)

    // 1. Drop read_at
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "read_at"`)
  }
}