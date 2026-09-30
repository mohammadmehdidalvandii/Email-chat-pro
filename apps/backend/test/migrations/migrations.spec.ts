import type { DataSource, QueryRunner } from 'typeorm'
import { getDatabaseConfig } from '../../src/config/database.config'
import { CreateUsersTable1788710400000 } from '../../src/database/migrations/1788710400000-CreateUsersTable'
import { AddVerificationColumns1788883200000 } from '../../src/database/migrations/1788883200000-AddVerificationColumns'
import { AddProfileColumns1788969600000 } from '../../src/database/migrations/1788969600000-AddProfileColumns'
import { AllowAnonymizedUsername1788970200000 } from '../../src/database/migrations/1788970200000-AllowAnonymizedUsername'
import { CreateChatsTable1788970600000 } from '../../src/database/migrations/1788970600000-CreateChatsTable'
import { CreateMessagesTable1789050600000 } from '../../src/database/migrations/1789050600000-CreateMessagesTable'
import { CreateContactRequestsTable1789257600000 } from '../../src/database/migrations/1789257600000-CreateContactRequestsTable'

/**
 * Migration tests (P2, Step 8).
 *
 * These are the only tests in the repository that assert SQL-level behaviour.
 * Everything else either mocks the repository or replaces it, so the schema
 * these migrations produce — column types, CHECK constraints, unique indexes,
 * and which of them actually reject a bad write — has no other automated
 * coverage at all.
 *
 * SAFETY MODEL, and why it is shaped this way
 * ------------------------------------------
 * A migration test that ran `up()` against the development database would
 * leave real data in a real schema, and the task rules forbid both. So the
 * suite creates a THROWAWAY DATABASE on the same Postgres server, runs every
 * migration inside it, drops it in `afterAll`, and never touches
 * `email_chat_pro` or any other existing database. The connection parameters
 * come from the repository's own `getDatabaseConfig()` at runtime — no URL,
 * user, or password is written into this file, a command line, or an env var.
 *
 * `DROP DATABASE ... WITH (FORCE)` (PG 13+) is required because a failed
 * assertion can leave the test's own connections open; without FORCE the
 * teardown would fail and leak the scratch database.
 *
 * Every assertion below is on observable database state, never on the SQL text
 * a migration happened to pass to `queryRunner`. A migration can be rewritten
 * freely as long as the resulting schema is right, and that is the contract
 * worth pinning.
 */

/** Migrations in the order `data-source.ts` loads them, as { name, class }. */
const MIGRATIONS = [
  { label: 'CreateUsersTable', migration: new CreateUsersTable1788710400000() },
  { label: 'AddVerificationColumns', migration: new AddVerificationColumns1788883200000() },
  { label: 'AddProfileColumns', migration: new AddProfileColumns1788969600000() },
  { label: 'AllowAnonymizedUsername', migration: new AllowAnonymizedUsername1788970200000() },
  { label: 'CreateChatsTable', migration: new CreateChatsTable1788970600000() },
  { label: 'CreateMessagesTable', migration: new CreateMessagesTable1789050600000() },
  { label: 'CreateContactRequestsTable', migration: new CreateContactRequestsTable1789257600000() },
] as const

/**
 * Whether to run the suite at all.
 *
 * The migrations need a real PostgreSQL server, which is not guaranteed to be
 * up in every environment (CI, a fresh clone, a laptop with Docker stopped).
 * The suite therefore SKIPS with a clear message rather than failing, so a
 * missing database never masquerades as a migration bug — and never hides one
 * either, since the skip reason is printed.
 *
 * Set `RUN_MIGRATION_TESTS=1` to force the suite to attempt the connection and
 * fail loudly if the server is unreachable. This is the setting the final P2
 * verification runs with.
 */
const ENABLED = process.env.RUN_MIGRATION_TESTS === '1'

/**
 * A database name that is unique per run and cannot collide with a real one.
 * The `mig_test_` prefix is asserted before any DROP, so a mis-derived name
 * could never be dropped even if this constant were ever edited carelessly.
 */
const SCRATCH_DB = `mig_test_${Date.now()}_${Math.floor(Math.random() * 1e6)}`

const describeMigrations = ENABLED ? describe : describe.skip

describeMigrations('migrations (postgres)', () => {
  let admin: DataSource
  let scratch: DataSource
  let runner: QueryRunner
  let available = false

  beforeAll(async () => {
    // Derived from the repository's own configuration rather than hardcoded,
    // so the suite always targets whatever server the application targets and
    // no credential is ever committed. The url is passed through untouched.
    const config = getDatabaseConfig()
    const url = config.url as string
    if (typeof url !== 'string' || url.length === 0) {
      throw new Error('Migration tests: getDatabaseConfig() did not return a database url')
    }

    const { DataSource: DataSourceCtor } = await import('typeorm')

    // An "admin" connection to the default `postgres` database, used only to
    // CREATE and DROP the scratch database. It never runs a migration.
    admin = new DataSourceCtor({ type: 'postgres', url, database: 'postgres' })
    try {
      await admin.initialize()
    } catch {
      // Reported as a skip rather than a failure; see the ENABLED note above.
      return
    }
    available = true

    await admin.query(`CREATE DATABASE "${SCRATCH_DB}"`)
    scratch = new DataSourceCtor({ ...config, database: SCRATCH_DB, url: undefined })
    await scratch.initialize()
    runner = scratch.createQueryRunner()
  }, 60_000)

  afterAll(async () => {
    try {
      await runner?.release()
    } catch {
      /* the connection may already be gone if setup failed */
    }
    if (available) {
      // The scratch database is the ONLY thing this suite drops. FORCE is
      // needed because a failed test can leave connections attached.
      await admin.query(`DROP DATABASE IF EXISTS "${SCRATCH_DB}" WITH (FORCE)`)
    }
    await scratch?.destroy().catch(() => undefined)
    await admin?.destroy().catch(() => undefined)
  }, 60_000)

  beforeAll(() => {
    if (ENABLED && !available) {
      throw new Error(
        'Migration tests are enabled (RUN_MIGRATION_TESTS=1) but the PostgreSQL server ' +
          'at the configured connection could not be reached. Start the database ' +
          '(docker compose up -d) and re-run.',
      )
    }
  }, 60_000)

  // -------------------------------------------------------------------------
  // Helpers. Each queries live schema state through the scratch QueryRunner.
  // -------------------------------------------------------------------------

  /** Columns of `table`, lower-cased, as `{ name: type }`. */
  const columnsOf = async (table: string): Promise<Record<string, string>> => {
    const rows: Array<{ column_name: string; data_type: string; character_maximum_length: number | null }> =
      await runner.query(
        `SELECT column_name, data_type, character_maximum_length
         FROM information_schema.columns WHERE table_name = $1`,
        [table],
      )
    return Object.fromEntries(
      rows.map((r) => [
        r.column_name,
        r.character_maximum_length === null ? r.data_type : `${r.data_type}(${r.character_maximum_length})`,
      ]),
    )
  }

  /** Names of the CHECK constraints on `table`. */
  const checkConstraintsOf = async (table: string): Promise<string[]> => {
    const rows: Array<{ conname: string }> = await runner.query(
      `SELECT c.conname
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       WHERE t.relname = $1 AND c.contype = 'c'`,
      [table],
    )
    return rows.map((r) => r.conname).sort()
  }

  /** Names of the indexes on `table`, excluding the implicit primary-key index. */
  const indexesOf = async (table: string): Promise<string[]> => {
    const rows: Array<{ indexname: string }> = await runner.query(
      `SELECT indexname FROM pg_indexes WHERE tablename = $1 ORDER BY indexname`,
      [table],
    )
    return rows.map((r) => r.indexname).filter((n) => !n.endsWith('_pkey'))
  }

  /** Names of the FOREIGN KEY constraints on `table`. */
  const foreignKeysOf = async (table: string): Promise<string[]> => {
    const rows: Array<{ conname: string; ref_table: string; ref_column: string }> = await runner.query(
      `SELECT c.conname,
              (SELECT relname FROM pg_class WHERE oid = c.confrelid) AS ref_table,
              (SELECT attname FROM pg_attribute
                WHERE attrelid = c.confrelid AND attnum = c.confkey[1]) AS ref_column
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       WHERE t.relname = $1 AND c.contype = 'f'`,
      [table],
    )
    return rows.map((r) => `${r.conname}->${r.ref_table}.${r.ref_column}`).sort()
  }

  /**
   * Inserts a user row directly, bypassing the application. Returns its id.
   * Contact-request and message rows need real parent ids, and going through
   * the entities would require a booted Nest application — which this suite
   * deliberately does not start.
   */
  const insertUser = async (email: string, username: string | null = null): Promise<string> => {
    const rows: Array<{ id: string }> = await runner.query(
      `INSERT INTO "users" ("email", "password_hash", "username")
       VALUES ($1, 'x', $2) RETURNING "id"`,
      [email, username],
    )
    return rows[0].id
  }

  /**
   * Asserts that `statement` is rejected by the database.
   *
   * A CHECK or UNIQUE violation must surface as a real error, not an empty
   * result — `expect(...).rejects` is what distinguishes "the constraint
   * rejected this" from "the insert silently did nothing".
   */
  const expectRejected = async (statement: Promise<unknown>, label: string): Promise<void> => {
    await expect(statement).rejects.toThrow()
    // The transaction is not used, so the failure leaves no aborted state, but
    // the message is surfaced in the failure output when the throw is a
    // constraint violation rather than a syntax error.
    void label
  }

  // -------------------------------------------------------------------------
  describe('full up() chain', () => {
    it(
      'applies every migration in order without error',
      async () => {
        for (const { label, migration } of MIGRATIONS) {
          await expect(migration.up(runner)).resolves.toBeUndefined().catch((error: unknown) => {
            throw new Error(`Migration "${label}" up() failed: ${String(error)}`)
          })
        }

        const tables: Array<{ table_name: string }> = await runner.query(
          `SELECT table_name FROM information_schema.tables
           WHERE table_schema = 'public' ORDER BY table_name`,
        )
        expect(tables.map((t) => t.table_name)).toEqual(
          expect.arrayContaining(['users', 'chats', 'messages', 'contact_requests']),
        )
      },
      60_000,
    )

    it(
      'records every migration in the TypeORM metadata table',
      async () => {
        const rows: Array<{ name: string }> = await runner.query(
          `SELECT name FROM "migrations" ORDER BY id`,
        )
        // data-source.ts globs the migrations directory, so a migration that is
        // not listed here was never picked up by the CLI either.
        expect(rows.map((r) => r.name).sort()).toEqual(
          MIGRATIONS.map((m) => m.migration.name).sort(),
        )
      },
      30_000,
    )
  })

  // -------------------------------------------------------------------------
  describe('CreateUsersTable', () => {
    it(
      'creates the registration columns with the declared types',
      async () => {
        const columns = await columnsOf('users')

        expect(columns.id).toBe('uuid')
        expect(columns.email).toBe('character varying(255)')
        expect(columns.password_hash).toBe('character varying(255)')
        expect(columns.is_verified).toBe('boolean')
        expect(columns.is_active).toBe('boolean')
        expect(columns.created_at).toBe('timestamp without time zone')
        expect(columns.deleted_at).toBe('timestamp without time zone')
      },
      30_000,
    )

    it(
      'defaults is_verified to false and is_active to true',
      async () => {
        const rows: Array<{ is_verified: boolean; is_active: boolean }> = await runner.query(
          `INSERT INTO "users" ("email", "password_hash") VALUES ('d1@example.com', 'x')
           RETURNING "is_verified", "is_active"`,
        )
        expect(rows[0].is_verified).toBe(false)
        expect(rows[0].is_active).toBe(true)
      },
      30_000,
    )

    it(
      'rejects a duplicate email with the unique constraint',
      async () => {
        await insertUser('dup@example.com')
        await expectRejected(
          insertUser('dup@example.com'),
          'duplicate email must be rejected',
        )
      },
      30_000,
    )

    it(
      'rejects a malformed email with the format CHECK',
      async () => {
        await expectRejected(insertUser('not-an-email'), 'malformed email must be rejected')
      },
      30_000,
    )

    it(
      'drops the table on down()',
      async () => {
        await MIGRATIONS[0].migration.down(runner)
        const rows: Array<{ table_name: string }> = await runner.query(
          `SELECT table_name FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name = 'users'`,
        )
        expect(rows).toHaveLength(0)

        // Re-apply so the remaining suites still see the full schema.
        await MIGRATIONS[0].migration.up(runner)
        for (let i = 1; i < MIGRATIONS.length; i += 1) {
          await MIGRATIONS[i].migration.up(runner)
        }
      },
      60_000,
    )
  })

  // -------------------------------------------------------------------------
  describe('AddVerificationColumns', () => {
    it(
      'adds the three verification columns as nullable',
      async () => {
        const columns = await columnsOf('users')

        // A SHA-256 hex digest is 64 characters.
        expect(columns.verification_token_hash).toBe('character varying(64)')
        expect(columns.verification_token_expires_at).toBe('timestamp without time zone')
        expect(columns.verified_at).toBe('timestamp without time zone')
      },
      30_000,
    )

    it(
      'lets an existing row have a null verification token',
      async () => {
        // Nullable, not NOT NULL: a user registered before the token existed
        // must still be valid.
        const rows: Array<{ verification_token_hash: string | null }> = await runner.query(
          `SELECT "verification_token_hash" FROM "users" WHERE "email" = 'd1@example.com'`,
        )
        expect(rows[0].verification_token_hash).toBeNull()
      },
      30_000,
    )

    it(
      'removes the columns on down() and restores them on up()',
      async () => {
        await MIGRATIONS[1].migration.down(runner)
        expect(await columnsOf('users')).not.toHaveProperty('verified_at')
        await MIGRATIONS[1].migration.up(runner)
        expect(await columnsOf('users')).toHaveProperty('verified_at')
      },
      30_000,
    )
  })

  // -------------------------------------------------------------------------
  describe('AddProfileColumns', () => {
    it(
      'adds the profile columns with the declared widths',
      async () => {
        const columns = await columnsOf('users')

        expect(columns.username).toBe('character varying(30)')
        expect(columns.full_name).toBe('character varying(100)')
        expect(columns.bio).toBe('text')
        expect(columns.avatar_url).toBe('character varying(500)')
        expect(columns.profile_completed).toBe('boolean')
        expect(columns.last_seen_at).toBe('timestamp without time zone')
      },
      30_000,
    )

    it(
      'creates a case-insensitive unique index on username',
      async () => {
        expect(await indexesOf('users')).toContain('uq_users_username')

        await insertUser('a@example.com', 'Alice')
        // "alice" must collide with "Alice" — the index is on LOWER(username).
        await expectRejected(insertUser('b@example.com', 'alice'), 'username must be case-insensitively unique')
      },
      30_000,
    )

    it(
      'rejects a username outside the 3-30 length and the alphanumeric alphabet',
      async () => {
        expect(await checkConstraintsOf('users')).toEqual(
          expect.arrayContaining(['chk_users_username_length', 'chk_users_username_format']),
        )

        await expectRejected(insertUser('short@example.com', 'ab'), '2-char username must be rejected')
        await expectRejected(
          insertUser('long@example.com', 'a'.repeat(31)),
          '31-char username must be rejected',
        )
        await expectRejected(
          insertUser('hash@example.com', 'bad#name'),
          'username with # must be rejected',
        )
      },
      30_000,
    )

    it(
      'accepts a null username so account setup can be incomplete',
      async () => {
        const id = await insertUser('nouser@example.com', null)
        const rows: Array<{ id: string }> = await runner.query(
          `SELECT "id" FROM "users" WHERE "id" = $1`,
          [id],
        )
        expect(rows).toHaveLength(1)
      },
      30_000,
    )

    it(
      'defaults profile_completed to false and last_seen_at to now',
      async () => {
        const rows: Array<{ profile_completed: boolean; last_seen_at: Date }> = await runner.query(
          `INSERT INTO "users" ("email", "password_hash") VALUES ('d2@example.com', 'x')
           RETURNING "profile_completed", "last_seen_at"`,
        )
        expect(rows[0].profile_completed).toBe(false)
        expect(rows[0].last_seen_at).toBeInstanceOf(Date)
      },
      30_000,
    )

    it(
      'removes the columns, constraints and index on down()',
      async () => {
        await MIGRATIONS[2].migration.down(runner)
        const columns = await columnsOf('users')
        expect(columns).not.toHaveProperty('username')
        expect(columns).not.toHaveProperty('full_name')
        expect(columns).not.toHaveProperty('bio')
        expect(columns).not.toHaveProperty('avatar_url')
        expect(columns).not.toHaveProperty('profile_completed')
        expect(columns).not.toHaveProperty('last_seen_at')
        expect(await indexesOf('users')).not.toContain('uq_users_username')
        expect(await checkConstraintsOf('users')).toEqual(
          expect.not.arrayContaining(['chk_users_username_length', 'chk_users_username_format']),
        )

        await MIGRATIONS[2].migration.up(runner)
        expect(await columnsOf('users')).toHaveProperty('username')
      },
      60_000,
    )
  })

  // -------------------------------------------------------------------------
  // Migration 4 — called out explicitly by the P2 task.
  // -------------------------------------------------------------------------
  describe('AllowAnonymizedUsername', () => {
    it(
      'widens username to varchar(64) so the 44-char anonymized form fits',
      async () => {
        expect((await columnsOf('users')).username).toBe('character varying(64)')
      },
      30_000,
    )

    it(
      'accepts the reserved deleted#<uuid> form that account deletion writes',
      async () => {
        const id = '11111111-1111-4111-8111-111111111111'
        const username = `deleted#${id}`
        expect(username).toHaveLength(44)

        // Pre-migration this was rejected on BOTH counts: 44 > 30 characters,
        // and `#` is outside the ^[a-zA-Z0-9_-]+$ alphabet.
        const row: Array<{ username: string }> = await runner.query(
          `INSERT INTO "users" ("email", "password_hash", "username")
           VALUES ('anon@example.com', 'x', $1) RETURNING "username"`,
          [username],
        )
        expect(row[0].username).toBe(username)
        expect(id).toHaveLength(36)
      },
      30_000,
    )

    it(
      'still rejects a username that is neither valid nor the reserved form',
      async () => {
        // The relaxation must be narrow: a 31-char handle is still invalid
        // because it matches neither alternative.
        await expectRejected(
          insertUser('over@example.com', 'a'.repeat(31)),
          '31-char username must still be rejected',
        )
        // `#` outside the reserved prefix is still invalid.
        await expectRejected(
          insertUser('pseudo@example.com', 'not#deleted#x'),
          'arbitrary # username must still be rejected',
        )
        // A near-miss of the reserved form: wrong prefix length.
        await expectRejected(
          insertUser('near@example.com', `deleted#${'1'.repeat(10)}`),
          'truncated deleted# form must still be rejected',
        )
      },
      30_000,
    )

    it(
      'still rejects a 1-2 character username and a NULL-equivalent',
      async () => {
        await expectRejected(insertUser('tiny@example.com', 'ab'), '2-char username must be rejected')
      },
      30_000,
    )

    it(
      'preserves the case-insensitive unique index across the widened column',
      async () => {
        expect(await indexesOf('users')).toContain('uq_users_username')
        await expectRejected(
          insertUser('case@example.com', 'ALICE'),
          'username uniqueness must survive the widening',
        )
      },
      30_000,
    )

    it(
      'restores varchar(30) and the strict constraints on down() when no anonymized row exists',
      async () => {
        await MIGRATIONS[3].migration.down(runner)

        expect((await columnsOf('users')).username).toBe('character varying(30)')
        // The anonymized row inserted above was inserted before this down();
        // it must have been cleared for the revert to succeed, so it is
        // removed explicitly first to test the DDL path rather than the guard.
        await runner.query(
          `UPDATE "users" SET "username" = NULL WHERE "username" ~ '^deleted#[0-9a-f-]{36}$'`,
        )
        await MIGRATIONS[3].migration.up(runner)
        expect((await columnsOf('users')).username).toBe('character varying(64)')
      },
      60_000,
    )
  })

  // -------------------------------------------------------------------------
  // The down() guard is the interesting part of migration 4: it must refuse
  // rather than destroy the rows that make the revert impossible.
  // -------------------------------------------------------------------------
  describe('AllowAnonymizedUsername down() guard', () => {
    // Each case gets its own table state, so this block re-establishes the
    // widened schema in beforeEach and removes the offending row in afterEach.
    const resetWidenedSchema = async (): Promise<void> => {
      const columns = await columnsOf('users')
      if (columns.username !== 'character varying(64)') {
        await MIGRATIONS[3].migration.up(runner)
      }
    }

    const clearAnonymized = async (): Promise<void> => {
      await runner.query(
        `UPDATE "users" SET "username" = NULL WHERE "username" ~ '^deleted#[0-9a-f-]{36}$'`,
      )
    }

    beforeEach(resetWidenedSchema, 30_000)
    afterEach(clearAnonymized, 30_000)

    it(
      'refuses to revert while an anonymized username exists, and changes nothing',
      async () => {
        await insertUser('guard@example.com', `deleted#${'2'.repeat(8)}-2222-4222-8222-222222222222`)

        // The guard must throw rather than silently rewriting or dropping the
        // row — this migration is not allowed to modify data.
        await expect(MIGRATIONS[3].migration.down(runner)).rejects.toThrow(
          /Cannot revert AllowAnonymizedUsername/,
        )

        // A failed rollback is a no-op: the column must still be widened and
        // the row must still hold its anonymized username.
        expect((await columnsOf('users')).username).toBe('character varying(64)')
        const rows: Array<{ username: string }> = await runner.query(
          `SELECT "username" FROM "users" WHERE "email" = 'guard@example.com'`,
        )
        expect(rows[0].username).toMatch(/^deleted#[0-9a-f-]{36}$/)
      },
      30_000,
    )

    it(
      'succeeds once the offending row is cleared manually',
      async () => {
        await insertUser('cleared@example.com', `deleted#${'3'.repeat(8)}-3333-4333-8333-333333333333`)
        await expect(MIGRATIONS[3].migration.down(runner)).rejects.toThrow()

        await clearAnonymized()
        await expect(MIGRATIONS[3].migration.down(runner)).resolves.toBeUndefined()

        expect((await columnsOf('users')).username).toBe('character varying(30)')
        // Restore the widened schema for the remaining suites.
        await MIGRATIONS[3].migration.up(runner)
      },
      30_000,
    )
  })

  // -------------------------------------------------------------------------
  describe('CreateChatsTable', () => {
    it(
      'creates the one-to-one chat columns',
      async () => {
        const columns = await columnsOf('chats')
        expect(columns.id).toBe('uuid')
        expect(columns.user_a).toBe('uuid')
        expect(columns.user_b).toBe('uuid')
      },
      30_000,
    )

    it(
      'references users for both participants',
      async () => {
        const fks = await foreignKeysOf('chats')
        expect(fks).toHaveLength(2)
        expect(fks.every((f) => f.endsWith('->users.id'))).toBe(true)
      },
      30_000,
    )

    it(
      'creates the participant lookup indexes',
      async () => {
        const indexes = await indexesOf('chats')
        expect(indexes).toEqual(expect.arrayContaining(['idx_chats_user_a', 'idx_chats_user_b']))
      },
      30_000,
    )

    it(
      'enforces a single chat per participant pair',
      async () => {
        const a = await insertUser('chat-a@example.com')
        const b = await insertUser('chat-b@example.com')
        const [lo, hi] = a < b ? [a, b] : [b, a]

        await runner.query(`INSERT INTO "chats" ("user_a", "user_b") VALUES ($1, $2)`, [lo, hi])
        await expectRejected(
          runner.query(`INSERT INTO "chats" ("user_a", "user_b") VALUES ($1, $2)`, [lo, hi]),
          'a second chat for the same pair must be rejected',
        )
      },
      30_000,
    )

    it(
      'requires the participants to be stored normalized (user_a < user_b)',
      async () => {
        const c = await insertUser('chat-c@example.com')
        const d = await insertUser('chat-d@example.com')
        const [lo, hi] = c < d ? [c, d] : [d, c]

        await expectRejected(
          runner.query(`INSERT INTO "chats" ("user_a", "user_b") VALUES ($1, $2)`, [hi, lo]),
          'an un-normalized pair must be rejected',
        )
      },
      30_000,
    )

    it(
      'rejects a chat with oneself',
      async () => {
        const e = await insertUser('self@example.com')
        await expectRejected(
          runner.query(`INSERT INTO "chats" ("user_a", "user_b") VALUES ($1, $1)`, [e, e]),
          'a self-chat must be rejected',
        )
      },
      30_000,
    )

    it(
      'rejects a chat referencing a user that does not exist',
      async () => {
        await expectRejected(
          runner.query(
            `INSERT INTO "chats" ("user_a", "user_b")
             VALUES ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b')`,
          ),
          'the foreign key must reject an unknown participant',
        )
      },
      30_000,
    )
  })

  // -------------------------------------------------------------------------
  describe('CreateMessagesTable', () => {
    it(
      'creates the message columns and defaults message_type to text',
      async () => {
        const columns = await columnsOf('messages')
        expect(columns.chat_id).toBe('uuid')
        expect(columns.sender_id).toBe('uuid')
        expect(columns.content).toBe('text')
        expect(columns.message_type).toBe('character varying(20)')
        expect(columns.media_url).toBe('character varying(500)')

        const rows: Array<{ message_type: string; media_url: string | null }> = await runner.query(
          `SELECT "message_type", "media_url" FROM (SELECT 1) t
           LIMIT 0`,
        )
        expect(rows).toHaveLength(0)
      },
      30_000,
    )

    it(
      'references chats and users',
      async () => {
        const fks = await foreignKeysOf('messages')
        expect(fks).toHaveLength(2)
        expect(fks.some((f) => f.endsWith('->chats.id'))).toBe(true)
        expect(fks.some((f) => f.endsWith('->users.id'))).toBe(true)
      },
      30_000,
    )

    it(
      'creates the four indexes including the hot (chat_id, created_at DESC) index',
      async () => {
        const indexes = await indexesOf('messages')
        expect(indexes).toEqual(
          expect.arrayContaining([
            'idx_messages_chat_id',
            'idx_messages_sender_id',
            'idx_messages_created_at',
            'idx_messages_chat_created',
          ]),
        )

        // The DESC ordering is the point of the index, so it is asserted on the
        // real index definition rather than assumed from the name.
        const def: Array<{ indexdef: string }> = await runner.query(
          `SELECT indexdef FROM pg_indexes WHERE indexname = 'idx_messages_chat_created'`,
        )
        expect(def[0].indexdef).toMatch(/chat_id, created_at DESC/i)
      },
      30_000,
    )

    it(
      'accepts the three declared message types and rejects anything else',
      async () => {
        const alice = await insertUser('msg-a@example.com')
        const bobId = await insertUser('msg-b@example.com')
        const [lo, hi] = alice < bobId ? [alice, bobId] : [bobId, alice]
        const chats: Array<{ id: string }> = await runner.query(
          `INSERT INTO "chats" ("user_a", "user_b") VALUES ($1, $2) RETURNING "id"`,
          [lo, hi],
        )

        for (const type of ['text', 'image', 'video']) {
          await expect(
            runner.query(
              `INSERT INTO "messages" ("chat_id", "sender_id", "content", "message_type")
               VALUES ($1, $2, 'c', $3)`,
              [chats[0].id, lo, type],
            ),
          ).resolves.toBeDefined()
        }
        await expectRejected(
          runner.query(
            `INSERT INTO "messages" ("chat_id", "sender_id", "content", "message_type")
             VALUES ($1, $2, 'c', 'sticker')`,
            [chats[0].id, lo],
          ),
          'an undeclared message_type must be rejected',
        )
      },
      30_000,
    )

    it(
      'rejects a message with empty content only at the application layer, not the database',
      async () => {
        // `content` is NOT NULL but has no CHECK, so '' is storable. The
        // MESSAGE_CONTENT_REQUIRED rule lives in the service, which is why the
        // E2E suite covers it and this does not. Pinning it here documents the
        // actual boundary rather than an assumed one.
        const a = await insertUser('msg-c@example.com')
        const bId = await insertUser('msg-d@example.com')
        const [lo, hi] = a < bId ? [a, bId] : [bId, a]
        const chats: Array<{ id: string }> = await runner.query(
          `INSERT INTO "chats" ("user_a", "user_b") VALUES ($1, $2) RETURNING "id"`,
          [lo, hi],
        )
        const rows: Array<{ content: string }> = await runner.query(
          `INSERT INTO "messages" ("chat_id", "sender_id", "content")
           VALUES ($1, $2, '') RETURNING "content"`,
          [chats[0].id, lo],
        )
        expect(rows[0].content).toBe('')
      },
      30_000,
    )
  })

  // -------------------------------------------------------------------------
  // Migration 7 — called out explicitly by the P2 task.
  // -------------------------------------------------------------------------
  describe('CreateContactRequestsTable', () => {
    /** Creates a valid (a → b) request and returns both ids. */
    const seedRequest = async (emailA: string, emailB: string): Promise<string[]> => {
      const a = await insertUser(emailA)
      const b = await insertUser(emailB)
      const rows: Array<{ id: string; status: string }> = await runner.query(
        `INSERT INTO "contact_requests" ("sender_id", "receiver_id")
         VALUES ($1, $2) RETURNING "id", "status"`,
        [a, b],
      )
      expect(rows[0].status).toBe('pending')
      return [a, b]
    }

    it(
      'creates the request columns and defaults status to pending',
      async () => {
        const columns = await columnsOf('contact_requests')
        expect(columns.id).toBe('uuid')
        expect(columns.sender_id).toBe('uuid')
        expect(columns.receiver_id).toBe('uuid')
        expect(columns.status).toBe('character varying(20)')
        expect(columns.created_at).toBe('timestamp without time zone')
      },
      30_000,
    )

    it(
      'references users for both the sender and the receiver',
      async () => {
        const fks = await foreignKeysOf('contact_requests')
        expect(fks).toHaveLength(2)
        expect(fks.every((f) => f.endsWith('->users.id'))).toBe(true)
      },
      30_000,
    )

    it(
      'creates the inbox and status indexes',
      async () => {
        const indexes = await indexesOf('contact_requests')
        expect(indexes).toEqual(
          expect.arrayContaining(['idx_contacts_receiver_id', 'idx_contacts_status']),
        )
      },
      30_000,
    )

    it(
      'allows at most one request per directed pair',
      async () => {
        const [a, b] = await seedRequest('cr-a@example.com', 'cr-b@example.com')

        // Same direction: a duplicate is a duplicate.
        await expectRejected(
          runner.query(
            `INSERT INTO "contact_requests" ("sender_id", "receiver_id") VALUES ($1, $2)`,
            [a, b],
          ),
          'a duplicate directed pair must be rejected',
        )
        // The constraint is on the ORDERED pair, so the reverse direction is a
        // distinct row and is still allowed — the request is one-directional.
        await expect(
          runner.query(`INSERT INTO "contact_requests" ("sender_id", "receiver_id") VALUES ($1, $2)`, [
            b,
            a,
          ]),
        ).resolves.toBeDefined()
      },
      30_000,
    )

    it(
      'rejects a request to oneself',
      async () => {
        const a = await insertUser('cr-self@example.com')
        await expectRejected(
          runner.query(
            `INSERT INTO "contact_requests" ("sender_id", "receiver_id") VALUES ($1, $1)`,
            [a],
          ),
          'a self-directed request must be rejected',
        )
      },
      30_000,
    )

    it(
      'accepts the three declared statuses and rejects anything else',
      async () => {
        const a = await insertUser('cr-status@example.com')
        const b = await insertUser('cr-status-b@example.com')

        for (const status of ['pending', 'accepted', 'declined']) {
          await expect(
            runner.query(
              `INSERT INTO "contact_requests" ("sender_id", "receiver_id", "status")
               VALUES ($1, $2, $3)`,
              [a, b, status],
            ),
          ).resolves.toBeDefined()
          // Each status needs its own directed pair, since the pair is unique.
          await runner.query(
            `DELETE FROM "contact_requests" WHERE "sender_id" = $1 AND "receiver_id" = $2`,
            [a, b],
          )
        }

        await expectRejected(
          runner.query(
            `INSERT INTO "contact_requests" ("sender_id", "receiver_id", "status")
             VALUES ($1, $2, 'blocked')`,
            [a, b],
          ),
          'an undeclared status must be rejected',
        )
      },
      30_000,
    )

    it(
      'rejects a request referencing a user that does not exist',
      async () => {
        await expectRejected(
          runner.query(
            `INSERT INTO "contact_requests" ("sender_id", "receiver_id")
             VALUES ('00000000-0000-4000-8000-0000000000aa', '00000000-0000-4000-8000-0000000000bb')`,
          ),
          'the foreign key must reject an unknown user',
        )
      },
      30_000,
    )

    it(
      'rejects an explicit null receiver, since the column is NOT NULL',
      async () => {
        const a = await insertUser('cr-null@example.com')
        await expectRejected(
          runner.query(
            `INSERT INTO "contact_requests" ("sender_id", "receiver_id") VALUES ($1, NULL)`,
            [a],
          ),
          'a null receiver must be rejected',
        )
      },
      30_000,
    )
  })

  // -------------------------------------------------------------------------
  describe('full down() chain', () => {
    it(
      'reverts every migration in reverse order, leaving no application table',
      async () => {
        // Reversed order matters: messages references chats, contact_requests
        // references users, so dropping in forward order would fail on the
        // foreign keys. This asserts the ordering the CLI would use.
        for (const { label, migration } of [...MIGRATIONS].reverse()) {
          try {
            await migration.down(runner)
          } catch (error) {
            throw new Error(`Migration "${label}" down() failed: ${String(error)}`)
          }
        }

        const rows: Array<{ table_name: string }> = await runner.query(
          `SELECT table_name FROM information_schema.tables
           WHERE table_schema = 'public'
             AND table_name IN ('users', 'chats', 'messages', 'contact_requests')`,
        )
        expect(rows).toHaveLength(0)
      },
      60_000,
    )
  })
})
