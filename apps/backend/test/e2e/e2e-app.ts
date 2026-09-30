import type { ArgumentsHost, INestApplication } from '@nestjs/common'
import { HttpException, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm'
import { TYPEORM_MODULE_OPTIONS } from '@nestjs/typeorm/dist/typeorm.constants'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { getStorageToken } from '@nestjs/throttler'
import { API_BASE_PATH } from '@email-chat-pro/constants'
import * as bcrypt from 'bcryptjs'
import { AppModule } from '../../src/app.module'
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter'
import { Chat } from '../../src/modules/chats/entities/chat.entity'
import { ContactRequest } from '../../src/modules/contacts/entities/contact-request.entity'
import { EmailService } from '../../src/modules/email/email.service'
import { User } from '../../src/modules/auth/entities/user.entity'
import { Message } from '../../src/modules/messages/entities/message.entity'

/**
 * Shared E2E application harness (P2).
 *
 * WHAT THIS IS
 * The real {@link AppModule}, started on an ephemeral loopback port and driven
 * over real HTTP with the global `fetch`. Every layer below is production code:
 * routing, the global ValidationPipe, the exception filter, JwtAuthGuard, the
 * Passport strategy, the services, and the controllers. Requests cross a real
 * socket, so status codes, headers, the httpOnly cookie, and JSON bodies are
 * genuine HTTP rather than a controller invoked as a method.
 *
 * WHAT IS REPLACED, AND WHY
 *
 *  1. TypeORM. No database is created, connected to, or written to. Every
 *     repository token resolves to a deterministic in-memory fake, so a run
 *     touches no schema, no dev data, and no migration state. The unit specs
 *     remain the right level for query construction; these tests assert the
 *     HTTP contract and the authorization decisions the services make.
 *  2. The throttler's storage provider, replaced with a counting stub. The
 *     global limit is 100 requests / 15 min keyed by IP, and every request in a
 *     suite arrives from 127.0.0.1, so a real store would 429 a long run. The
 *     guard, the `@Throttle` decorators, and the 429 response path stay real;
 *     only the counter storage is substituted, and a dedicated suite asserts
 *     that the stub actually blocks once the limit is exceeded.
 *  3. The mail transport. `EmailService` is replaced with a recorder so no
 *     request can reach a real provider. The Resend SDK is the one dependency
 *     in this flow that genuinely leaves the machine, and an offline host would
 *     make every register/resend 500 — which would leave the registration,
 *     verification and resend happy paths untestable and would prove nothing
 *     about them. The real `EmailService` is therefore covered by its own unit
 *     spec (`email.service.spec.ts`), which asserts the SDK's non-throwing
 *     `{ data, error }` contract; here the boundary is replaced instead, so the
 *     behaviour that matters at this level — the token rotation and the
 *     rollback that clears a token whose mail never went out — stays real code
 *     in `AuthService`. The recorder can be flipped into failure mode, so both
 *     branches are exercised.
 *
 * This is the "lightweight Nest integration with mocked boundaries" strategy.
 * A real database was rejected because the task rules forbid connecting to any
 * development or production database, and because the approved stack (TypeORM
 * + `pg`) has no in-memory driver: `sqlite3` is not a dependency and adding one
 * is not permitted. The consequence is recorded in the P2 report — SQL-level
 * behaviour (indexes, constraints, and transactions as Postgres actually
 * executes them) is NOT covered here and is not covered by any other automated
 * test either.
 *
 * WHY A RAW SOCKET INSTEAD OF supertest
 * `supertest` is not a project dependency and adding one is not permitted.
 * `app.listen(0)` plus Node 24's built-in `fetch` gives the same real-HTTP
 * coverage with no new package.
 */
export const E2E_JWT_SECRET = 'e2e-only-signing-secret-not-used-anywhere-else'
export const E2E_JWT_EXPIRES_IN = '1h'

/** The password every registered fixture account is created with. */
export const PLAIN_PASSWORD = 'Str0ng!Pass123'

/** The envelope every successful endpoint returns (architecture.md §API Response). */
export interface ApiEnvelope<T> {
  success: true
  data: T
  timestamp: string
}

/** The standardized error envelope produced by HttpExceptionFilter. */
export interface ApiErrorEnvelope {
  success: false
  error: { code: string; message: string }
  timestamp: string
}

type Row = Record<string, unknown> & { id: string }
type FindOptions = Record<string, unknown>

/**
 * Set `E2E_TRACE=1` to have the harness log every query it evaluates, with
 * conditions rendered rather than dumped as raw FindOperator internals. Kept
 * permanently because the alternative — adding `console.log` to a spec — is
 * what actually ends up committed.
 */
const TRACE = process.env.E2E_TRACE === '1'

function traceQuery(
  label: string,
  options: FindOptions,
  candidates?: Row[],
  matched?: Row[],
): void {
  if (!TRACE) {
    return
  }
  const ids = (rows: Row[]) => rows.map((row) => row.id)
  // eslint-disable-next-line no-console
  console.log(
    `[e2e] ${label} where=${JSON.stringify(options.where)} ` +
      `candidates=${JSON.stringify(ids(candidates ?? []))} ` +
      `matched=${JSON.stringify(ids(matched ?? []))}`,
  )
}

// ---------------------------------------------------------------------------
// Minimal find-operator carriers.
//
// The services build query objects with `Not()`, `In()`, `IsNull()`, `LessThan`
// and `MoreThan`. The fakes need the real operator values — only the SQL they
// would compile to is absent.
// ---------------------------------------------------------------------------

/**
 * Evaluates a TypeORM `Raw` find-operator against the same SQL semantics the
 * service built it with, in JavaScript, so the rules `UsersService.searchUsers`
 * relies on are genuinely exercised rather than approximated.
 *
 * `searchUsers` builds two `Raw` operators per column and the difference
 * between them is the whole point of the P1-4 work:
 *
 *   - `LOWER(username) LIKE LOWER(:pattern)` — a case-insensitive PARTIAL match,
 *     where the service has pre-escaped the caller's `%`, `_` and `\`.
 *   - `LOWER(email)    = LOWER(:email)`       — an EXACT match, no wildcards.
 *
 * So whether the operator is a `LIKE` or an `=` is read off the generated SQL
 * rather than assumed. Getting that backwards is not cosmetic: treating the
 * email branch as a `LIKE` makes a query of `%` match every row, which is
 * precisely the bug the escaping exists to prevent.
 *
 * On escaping: `escapeLikePattern` turns a user's literal `%` into `\%` so
 * Postgres reads it as a character. Postgres has no string escape, so TypeORM
 * sends that backslash through unchanged and the `ESCAPE` clause never arrives —
 * the value reaching this fake is therefore still escaped. It is unescaped here
 * first, and only then given SQL wildcard meaning; applying wildcards to an
 * already-escaped pattern would turn the escaping test into a tautology.
 *
 * A `Raw` is stored on a FindOperator as `_getSql` (the generator function) and
 * `_objectLiteralParameters` (its named parameters), per TypeORM's `Raw()`.
 */
function matchesRaw(
  actual: unknown,
  op: {
    _getSql?: unknown
    _objectLiteralParameters?: Record<string, unknown> | undefined
  },
): boolean {
  const sql =
    typeof op._getSql === 'function'
      ? String((op._getSql as (alias: string) => string)('col'))
      : String(op._getSql ?? '')
  const params = op._objectLiteralParameters ?? {}

  const isLike = sql.toUpperCase().includes('LIKE')

  // `params` holds the operator's own named parameters, so the first string
  // value is the one the expression binds.
  const bound = Object.values(params).find((value) => typeof value === 'string') as
    | string
    | undefined
  if (bound === undefined) {
    throw new Error(
      `E2E harness: "Raw" operator "${sql}" has no string parameter the in-memory repository can bind`,
    )
  }

  if (!isLike) {
    return String(actual).toLowerCase() === bound.toLowerCase()
  }
  // Deliberately UNANCHORED: the leading and trailing `%` the service adds are
  // themselves translated into wildcards, so the `^`/`$` the exact branch
  // needs would turn the service's PARTIAL match into an exact one.
  const source = likePatternToRegExpSource(bound)
  return new RegExp(source, 'i').test(String(actual))
}

/**
 * Translates a SQL LIKE pattern into an equivalent regular expression source.
 *
 * The service builds `%${escapeLikePattern(query)}%`, so the pattern that arrives
 * here mixes two kinds of `%` and `_` that must be treated differently:
 *
 *   - the `%` characters the service itself wrapped around the term, which are
 *     genuine wildcards and make the match a PARTIAL one;
 *   - the `%`, `_` and `\` the user typed, which `escapeLikePattern` has already
 *     prefixed with a backslash and which must therefore match literally.
 *
 * Those are only distinguishable by SCANNING left to right, and that is the
 * whole point: a query of `%` arrives as `%\%%` (four characters) and has to
 * become "matches any string containing a literal `%`" — not "matches
 * everything", which is the bug the escaping exists to prevent.
 *
 * An unescape-then-translate pass is the natural first attempt and it is wrong,
 * because it cannot tell the service's wrapping wildcards from the user's once
 * both look like a bare `%`. Worse, the backslash it leaves behind in front of
 * them changes the meaning of the class that follows it, so `[\\s\\S]` would
 * silently become `[sS]` and match any letter `s`.
 *
 * An unsupported escape is a harness bug, not something to paper over: Postgres
 * has no string escape, so the service's escaping is what the column actually
 * receives, and a lone trailing backslash would mean the pattern was built wrong.
 */
function likePatternToRegExpSource(pattern: string): string {
  const literal = (char: string) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts: string[] = []
  let index = 0

  while (index < pattern.length) {
    const char = pattern[index]

    if (char === '\\') {
      const escaped = pattern[index + 1]
      if (escaped !== '%' && escaped !== '_' && escaped !== '\\') {
        throw new Error(
          `E2E harness: LIKE pattern ${JSON.stringify(pattern)} contains an unsupported escape "\\${String(escaped)}"`,
        )
      }
      parts.push(literal(escaped as string))
      index += 2
      continue
    }

    parts.push(char === '%' ? '[\\s\\S]*' : char === '_' ? '[\\s\\S]' : literal(char))
    index += 1
  }

  return parts.join('')
}

function matchesCondition(
  actual: unknown,
  condition: unknown,
  context?: { row: Row; key: string },
): boolean {
  if (
    condition !== null &&
    typeof condition === 'object' &&
    '_type' in (condition as Record<string, unknown>)
  ) {
    const op = condition as { _type: string; value: unknown }
    switch (op._type) {
      case 'not':
        return !matchesCondition(actual, op.value)
      case 'in':
        return Array.isArray(op.value) && (op.value as unknown[]).includes(actual)
      case 'isNull':
        return actual === null || actual === undefined
      case 'lessThan':
        return typeof actual === 'number' && actual < (op.value as number)
      case 'moreThan':
        return typeof actual === 'number' && actual > (op.value as number)
      case 'raw':
        // A `Raw` never names its own column, so the actual value is resolved
        // from the `where` key. `searchUsers` is the only builder of them.
        return matchesRaw(
          context?.key === 'email' ? context.row.email : context?.row.username,
          op,
        )
      default:
        // An operator with no fake semantics (Like, Between) must not
        // silently match everything: a test asserting on it fails loudly.
        throw new Error(
          `E2E harness: find operator "${op._type}" is not supported by the in-memory repository`,
        )
    }
  }
  if (actual instanceof Date && condition instanceof Date) {
    return actual.getTime() === condition.getTime()
  }
  return actual === condition
}

/**
 * The only user-valued relations the entities declare.
 *
 * Both `ContactRequest` and `Message` map their foreign key purely as a
 * `@ManyToOne` to `User`, so a stored row carries the relation name rather than
 * a scalar id. Every relation in this store therefore resolves against
 * `users`; an unmapped name is a harness bug and must fail loudly rather than
 * resolve to `undefined` and surface as a confusing downstream error.
 */
const RELATION_TABLES: Record<string, 'users'> = {
  sender: 'users',
  receiver: 'users',
}

/**
 * Resolves a `where` value that targets a relation instead of a column.
 *
 * The condition is expressed against the RELATED row (`{ id: x }`,
 * `{ id: Not(x) }`), not against the foreign key, so it has to be evaluated
 * against that row rather than against the id itself — comparing the id to an
 * object is never true, which is how `GET /contacts` came to return an empty
 * list for every accepted request.
 *
 * A `null` foreign key matches nothing, which is what SQL's join over a NULL
 * column does too.
 */
function relationMatches(
  row: Row,
  relation: string,
  condition: unknown,
  store: FakeStore,
): boolean {
  const table = RELATION_TABLES[relation]
  if (!table) {
    throw new Error(
      `E2E harness: relation "${relation}" is not registered in the in-memory store`,
    )
  }
  const id = relationIdOf(row, relation)
  if (id === null || id === undefined) {
    return false
  }
  const target = store[table].get(id as string) as Row | undefined
  if (!target) {
    throw new Error(
      `E2E harness: relation "${relation}" on row ${row.id} points at id ${String(id)} which is not in the users table`,
    )
  }
  return matchesWhere(target, condition, store)
}

/** The id a row's relation points at, read from the FK column or the object. */
function relationIdOf(row: Row, relation: string): unknown {
  const column = RELATION_COLUMNS[relation]
  if (column && row[column] !== undefined) {
    return row[column]
  }
  const target = row[relation] as Row | undefined
  return target?.id
}

/** Database column backing each relation name. */
const RELATION_COLUMNS: Record<string, string> = {
  sender: 'senderId',
  receiver: 'receiverId',
}

/** Applies a `where` clause — a single object, or the OR-array `find` accepts. */
function matchesWhere(row: Row, where: unknown, store: FakeStore): boolean {
  if (Array.isArray(where)) {
    return (where as FindOptions[]).some((branch) => matchesWhere(row, branch, store))
  }
  return Object.entries((where ?? {}) as FindOptions).every(([key, condition]) => {
    if (key in RELATION_TABLES) {
      return relationMatches(row, key, condition, store)
    }
    if (typeof condition === 'string' && condition.includes('?')) {
      // A raw SQL fragment would silently be compared for equality against the
      // column value and match nothing. Every raw condition the codebase builds
      // goes through `Raw()`, which is handled above; anything else is a query
      // the fake cannot evaluate and must say so.
      throw new Error(
        `E2E harness: "where.${key}" is a raw SQL expression the in-memory repository cannot evaluate`,
      )
    }
    // The row and key travel with the value because a `Raw` operator is an
    // opaque object that does not name the column it applies to, so resolving
    // the compared value needs both.
    return matchesCondition(row[key], condition, { row, key })
  })
}

/**
 * Attaches the requested relations to a matching row.
 *
 * `ContactRequest` and `Message` do not store a `sender` object; they point at
 * one. TypeORM resolves the pointer on read, and the services rely on it —
 * `ContactsService.toContactRequestDto` reads `request.sender.id` and
 * `MessagesService.toMessageDto` reads `message.sender.id`, so returning a row
 * without the relation would throw rather than return a wrong answer.
 */
function withRelations(row: Row, store: FakeStore, relations?: unknown): Row {
  const names = Array.isArray(relations) ? relations : []
  if (names.length === 0) {
    return row
  }
  const hydrated: Row = { ...row }
  for (const name of names as string[]) {
    const table = RELATION_TABLES[name]
    if (!table) {
      throw new Error(
        `E2E harness: relation "${name}" is not registered in the in-memory store`,
      )
    }
    const id = relationIdOf(row, name)
    const target =
      id === undefined || id === null
        ? undefined
        : (store[table].get(id as string) as Row | undefined)
    if (target) {
      hydrated[name] = target
    }
  }
  return hydrated
}

/** Applies an `order` clause — a single `{ column: 'ASC' | 'DESC' }` object. */
function applyOrder<T extends Row>(rows: T[], order: unknown): T[] {
  if (!order || typeof order !== 'object') {
    return rows
  }
  const [column, direction] = Object.entries(order as FindOptions)[0] ?? []
  if (!column) {
    return rows
  }
  const sign = String(direction).toUpperCase() === 'DESC' ? -1 : 1
  return [...rows].sort((a, b) => {
    const left = a[column]
    const right = b[column]
    if (left instanceof Date && right instanceof Date) {
      return (left.getTime() - right.getTime()) * sign
    }
    if (left === right) return 0
    if (left === undefined || left === null) return 1
    if (right === undefined || right === null) return -1
    return (String(left) < String(right) ? -1 : 1) * sign
  })
}

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

export interface FakeStore {
  users: Map<string, Row>
  chats: Map<string, Row>
  messages: Map<string, Row>
  contactRequests: Map<string, Row>
  reset(): void
}

const DEFAULT_TAKE = 1000

function createStore(): FakeStore {
  return {
    users: new Map(),
    chats: new Map(),
    messages: new Map(),
    contactRequests: new Map(),
    reset() {
      // `userCounter` is a module-level seed counter, not a table, so it has to
      // be rewound by hand: `makeUser` derives its id from it, and ids that keep
      // climbing across tests make assertion failures needlessly hard to read.
      userCounter = 0
      this.users.clear()
      this.chats.clear()
      this.messages.clear()
      this.contactRequests.clear()
    },
  }
}

function entityName(entity: unknown): string {
  return (entity as { name?: string } | undefined)?.name ?? 'unknown'
}

function tableFor(entity: unknown, store: FakeStore): Map<string, Row> {
  if (entity === User) return store.users
  if (entity === Chat) return store.chats
  if (entity === Message) return store.messages
  if (entity === ContactRequest) return store.contactRequests
  throw new Error('E2E harness: entity is not registered in the in-memory store')
}

function createRepository(store: FakeStore, entity: unknown) {
  const table = () => tableFor(entity, store)
  const matching = (options: FindOptions) => {
    const all = [...table().values()]
    const matched = all.filter((row) => matchesWhere(row, options.where ?? {}, store))
    traceQuery(entityName(entity), options, all, matched)
    return applyOrder(matched, options.order).map((row) =>
      withRelations(row, store, options.relations),
    )
  }
  const pageOf = (rows: Row[], options: FindOptions) => {
    const skip = typeof options.skip === 'number' ? (options.skip as number) : 0
    const take = typeof options.take === 'number' ? (options.take as number) : DEFAULT_TAKE
    return rows.slice(skip, skip + take)
  }

  return {
    findOne: async (options: FindOptions = {}) => matching(options)[0] ?? null,
    find: async (options: FindOptions = {}) => pageOf(matching(options), options),
    findAndCount: async (options: FindOptions = {}) => {
      const rows = matching(options)
      return [pageOf(rows, options), rows.length]
    },
    count: async (options: FindOptions = {}) => matching(options).length,
    // Repository.create is overloaded. The repository form takes a single
    // entity-like argument; the EntityManager form takes (entity, data). Getting
    // this wrong stores field-less rows, so both arities are handled explicitly.
    create: (entityOrData: unknown, maybeData?: Record<string, unknown>) =>
      (maybeData ?? entityOrData ?? {}) as Row,
    save: async (input: Row) => {
      if (input.id === undefined) {
        // Stands in for the database-generated primary key. It only has to be
        // unique and UUID-shaped, because the routes parse it with ParseUUIDPipe.
        const created = `00000000-0000-4000-8000-${String(table().size + 1).padStart(12, '0')}`
        return saveWithId(store, entity, input, created)
      }
      return saveWithId(store, entity, input, input.id as string)
    },
    // `manager.update(Entity, id, partial)` — a partial column write that does
    // not replace the row. `ContactsService.respondToRequest` uses it to flip a
    // request's status inside the transaction, so the stored row has to keep
    // the fields the update does not mention.
    update: async (_entity: unknown, id: unknown, partial: Row) => {
      const existing = table().get(id as string)
      if (!existing) {
        return { affected: 0, raw: [], generatedMaps: [] }
      }
      const updated = { ...existing, ...partial }
      table().set(id as string, updated)
      return { affected: 1, raw: [updated], generatedMaps: [] }
    },
    remove: async (row: Row) => {
      table().delete(row.id)
      return row
    },
    delete: async () => ({ affected: 0 }),
    createQueryBuilder: () => createQueryBuilder(store, entity),
  }
}

/**
 * A chainable query-builder fake.
 *
 * `ChatsService.loadLatestMessages` is the only caller in the codebase: a
 * `DISTINCT ON (chat_id) ORDER BY chat_id ASC, created_at DESC` query that
 * returns each chat's single most recent message, with the `sender` relation
 * joined. It cannot be expressed as a `find` options object, so it is
 * implemented here directly against the store.
 *
 * Every method returns `this` because the real builder is chainable, and every
 * terminal method is accepted — an unimplemented call must fail at the terminal
 * call rather than mid-chain, so the fake mirrors the shape and only the
 * behaviour the codebase actually relies on.
 */
function createQueryBuilder(store: FakeStore, entity: unknown) {
  let whereIds: string[] | null = null
  const orderings: Array<{ column: string; direction: string }> = []
  let distinctColumn: string | null = null
  const joins: string[] = []

  const builder = {
    leftJoinAndSelect(_relation: string, alias: string) {
      joins.push(alias)
      return builder
    },
    where(_condition: string, params?: Record<string, unknown>) {
      if (params && Array.isArray(params.chatIds)) {
        whereIds = params.chatIds as string[]
      }
      return builder
    },
    orderBy(column: string, direction = 'ASC') {
      orderings.push({ column, direction })
      return builder
    },
    addOrderBy(column: string, direction = 'ASC') {
      orderings.push({ column, direction })
      return builder
    },
    distinctOn(columns: string[]) {
      distinctColumn = columns[0] ?? null
      return builder
    },
    async getMany(): Promise<Row[]> {
      // `joins` and `orderings` are read below so an unsupported builder call
      // cannot be silently ignored; `distinctColumn` too.
      if (joins.length === 0 || orderings.length === 0 || distinctColumn === null) {
        throw new Error(
          'E2E harness: the query-builder fake only implements the DISTINCT ON latest-message query',
        )
      }
      const rows = [...tableFor(entity, store).values()]
        .filter((row) => whereIds === null || whereIds.includes(row.chatId as string))
        .map((row) => withRelations(row, store, ['sender']))
        .sort(
          (a, b) =>
            new Date(a.createdAt as Date).getTime() - new Date(b.createdAt as Date).getTime(),
        )
      const latestPerChat = new Map<string, Row>()
      for (const row of rows) {
        // Rows are ascending by created_at, so the last write per chat wins —
        // the same row `ORDER BY created_at DESC ... DISTINCT ON` yields.
        latestPerChat.set(row.chatId as string, row)
      }
      return [...latestPerChat.values()]
    },
  }

  return builder
}

/**
 * Column defaults, as declared on the entities.
 *
 * `AuthService.register` only sets email, passwordHash, isVerified and the
 * token fields; `is_active`, `profile_completed` and the timestamps come from
 * the schema. Reproducing them keeps a stored row shaped the way a real one is,
 * so a test reading a fixture sees `deletedAt: null` rather than `undefined` —
 * and, more importantly, keeps a test from passing only because a null-check
 * happened to be satisfied by a missing key.
 *
 * Kept beside the store rather than read from entity metadata, because
 * `TableColumn` is not public API and the defaults below are few and stable.
 */
function withColumnDefaults(row: Row): Row {
  return {
    isVerified: false,
    profileCompleted: false,
    isActive: true,
    lastSeenAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...row,
  }
}

/**
 * Stores a row and returns it the way TypeORM returns one.
 *
 * TypeORM writes an assigned relation to its foreign-key column and hands back
 * the entity with the relation still attached — `ContactsService.sendRequest`
 * depends on this, because it maps the *save result* straight into the
 * response contract and reads `saved.sender.id`. So the stored row keeps the
 * columns and the returned value keeps the objects.
 */
function saveWithId(
  store: FakeStore,
  entity: unknown,
  input: Row,
  id: string,
): Promise<Row> {
  const row: Row = { ...withColumnDefaults({ ...input, id }) }
  const assigned: Row = {}
  for (const [relation, column] of Object.entries(RELATION_COLUMNS)) {
    const target = row[relation] as Row | null | undefined
    if (target === undefined) {
      // A hydrated row written back carries both the object and the column; a
      // fresh row carries only whichever the caller assigned. Either way the
      // column is authoritative once stored.
      continue
    }
    row[column] = target === null ? null : target.id
    if (target !== null) {
      assigned[relation] = target
    }
    delete row[relation]
  }
  tableFor(entity, store).set(id, row)
  return Promise.resolve({ ...row, ...assigned })
}

// ---------------------------------------------------------------------------
// Throttle storage stub — a real counter that always allows unless the test
// asks it to enforce the limit.
// ---------------------------------------------------------------------------

export interface ThrottleStub extends Record<string, unknown> {
  /** Every guard decision, in order, for asserting which limit was applied. */
  hits: Array<{ key: string; limit: number; blocked: boolean }>
  /** When true, a request is blocked only once its tracker exceeds `limit`. */
  enforce: boolean
  reset(): void
}

function createThrottleStub(): ThrottleStub {
  const counters = new Map<string, number>()
  const stub: ThrottleStub = {
    enforce: false,
    hits: [],
    increment: async (key: string, _ttl: number, limit: number, _blockDuration: number, _name: string) => {
      const total = (counters.get(key) ?? 0) + 1
      counters.set(key, total)
      const blocked = stub.enforce && total > limit
      stub.hits.push({ key, limit, blocked })
      return {
        totalHits: total,
        timeToExpire: 900_000,
        isBlocked: blocked,
        timeToBlockExpire: 900_000,
      }
    },
    reset() {
      counters.clear()
      stub.hits.length = 0
    },
  }
  return stub
}

// ---------------------------------------------------------------------------
// Mail recorder
// ---------------------------------------------------------------------------

export interface SentEmail {
  email: string
  token: string
}

export interface MailRecorder {
  /** Every delivery attempt, in order. */
  sent: SentEmail[]
  /** When true the next delivery throws, as a provider rejection would. */
  failNext: boolean
  reset(): void
}

function createMailRecorder(): MailRecorder {
  return {
    sent: [],
    failNext: false,
    reset() {
      this.sent.length = 0
      this.failNext = false
    },
  }
}

// ---------------------------------------------------------------------------
// Transactional manager
// ---------------------------------------------------------------------------

/**
 * The `EntityManager` surface `ContactsService` uses inside
 * `DataSource.transaction`: `update`, and — via `createChatForPair` —
 * `findOne`, `create` and `save`.
 *
 * The entity argument identifies the table, so the manager is a restatement of
 * the same repository fake the services already use. `save` accepts both
 * arities: `manager.save(entity, row)` and the single-argument
 * `manager.save(row)`. Only `Chat` is saved single-argument in this codebase
 * (`createChatForPair`), so the table is resolved from the row's shape rather
 * than from an entity the call did not pass.
 *
 * `transaction` itself performs no staging or rollback. A callback that throws
 * propagates unchanged, and any partial write it already made stays — so a test
 * that asserts a rollback is asserting something this fake cannot prove. That
 * limitation is recorded in the P2 report alongside the in-memory database one.
 */
function createManager(store: FakeStore) {
  return {
    create: (entity: unknown, data: Record<string, unknown>) => ({ ...data }) as Row,
    save: (entityOrRow: unknown, maybeRow?: Row) => {
      if (maybeRow !== undefined) {
        return createRepository(store, entityOrRow).save(maybeRow)
      }
      const row = entityOrRow as Row
      const table: unknown = row.userAId !== undefined || row.userBId !== undefined ? Chat : Message
      return createRepository(store, table).save(row)
    },
    findOne: async (entity: unknown, options: FindOptions) =>
      createRepository(store, entity).findOne(options),
    update: async (entity: unknown, id: unknown, partial: Row) =>
      createRepository(store, entity).update(entity, id, partial),
  }
}

// ---------------------------------------------------------------------------
// Application lifecycle
// ---------------------------------------------------------------------------

export interface E2EContext {
  app: INestApplication
  store: FakeStore
  throttle: ThrottleStub
  mail: MailRecorder
  baseUrl: string
  close(): Promise<void>
}

let userCounter = 0

/**
 * The production exception filter, plus a log line for errors it swallows.
 *
 * `HttpExceptionFilter` turns any non-HTTP error into a generic `INTERNAL_ERROR`
 * 500, which is correct for a client but leaves a failing E2E test with nothing
 * but a status code to work from. The original exception is the only thing that
 * explains a harness mismatch, so it is printed here and nowhere else — an HTTP
 * exception already has a meaningful response body and is not logged twice.
 */
class E2eDiagnosticFilter extends HttpExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    if (!(exception instanceof HttpException)) {
      // eslint-disable-next-line no-console
      console.error('E2E harness: unhandled non-HTTP exception', exception)
    }
    super.catch(exception, host)
  }
}

/** Boots the real application with only the three external boundaries replaced. */
export async function createE2EApp(): Promise<E2EContext> {
  const previousJwtSecret = process.env.JWT_SECRET
  const previousExpires = process.env.JWT_EXPIRES_IN

  process.env.JWT_SECRET = E2E_JWT_SECRET
  process.env.JWT_EXPIRES_IN = E2E_JWT_EXPIRES_IN
  // `getResendConfig()` still runs at import time inside the real EmailService's
  // module, so the variables must exist even though the transport is replaced.
  process.env.RESEND_API_KEY = process.env.RESEND_API_KEY ?? 'e2e-unused-resend-key'
  process.env.MAIL_FROM = process.env.MAIL_FROM ?? 'Email Chat Pro <no-reply@example.com>'

  userCounter = 0
  const store = createStore()
  const throttle = createThrottleStub()
  const mail = createMailRecorder()

  const repositories = new Map<unknown, unknown>()
  for (const entity of [User, Chat, Message, ContactRequest]) {
    repositories.set(getRepositoryToken(entity), createRepository(store, entity))
  }

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(TYPEORM_MODULE_OPTIONS)
    // `TypeOrmModule.forRootAsync` builds `getDatabaseConfig()` as the
    // provider of this token. Neutralising the token stops that factory from
    // ever running, so no connection URL is resolved and — more importantly —
    // no DataSource is constructed, because the DataSource provider consumes
    // this same token. Without this, importing AppModule in an environment
    // where NODE_ENV=production and DATABASE_URL is unset throws from
    // database.config.ts before a single test can run.
    //
    // The placeholder host below is a reserved `.invalid` name that cannot
    // resolve. It exists only to satisfy the `url: string` option type; nothing
    // ever dials it, since the DataSource token is overridden right below.
    .useValue({ type: 'postgres', url: 'postgres://e2e@invalid/e2e', entities: [] })
    .overrideProvider(getRepositoryToken(User))
    .useValue(repositories.get(getRepositoryToken(User)))
    .overrideProvider(getRepositoryToken(Chat))
    .useValue(repositories.get(getRepositoryToken(Chat)))
    .overrideProvider(getRepositoryToken(Message))
    .useValue(repositories.get(getRepositoryToken(Message)))
    .overrideProvider(getRepositoryToken(ContactRequest))
    .useValue(repositories.get(getRepositoryToken(ContactRequest)))
    .overrideProvider(getDataSourceToken())
    .useValue({
      manager: createManager(store),
      transaction: async <T>(runInTransaction: (manager: unknown) => Promise<T>): Promise<T> =>
        runInTransaction(createManager(store)),
    })
    .overrideProvider(getStorageToken())
    .useValue(throttle)
    .overrideProvider(EmailService)
    .useValue({
      sendVerificationEmail: async (email: string, token: string) => {
        if (mail.failNext) {
          throw new Error('E2E: simulated mail transport failure')
        }
        mail.sent.push({ email, token })
      },
    })
    .compile()

  const app = moduleRef.createNestApplication<NestExpressApplication>()

  // Copied from main.ts on purpose: the point of an E2E test is that the
  // response a client sees comes from the same global setup production uses.
  // If main.ts changes, these must change with it. helmet() and enableCors are
  // omitted — they are transport concerns with no bearing on any assertion here.
  app.setGlobalPrefix(API_BASE_PATH)
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  )
  app.useGlobalFilters(new E2eDiagnosticFilter())

  await app.listen(0, '127.0.0.1')
  const url = await app.getUrl()

  return {
    app,
    store,
    throttle,
    mail,
    baseUrl: url.replace(/\/$/, ''),
    close: async () => {
      await app.close()
      process.env.JWT_SECRET = previousJwtSecret
      process.env.JWT_EXPIRES_IN = previousExpires
    },
  }
}

// ---------------------------------------------------------------------------
// Fixture factory
// ---------------------------------------------------------------------------

export interface TestUser extends Row {
  id: string
  email: string
  passwordHash: string
  isVerified: boolean
  verificationTokenHash: string | null
  verificationTokenExpiresAt: Date | null
  verifiedAt: Date | null
  username: string | null
  fullName: string | null
  bio: string | null
  avatarUrl: string | null
  profileCompleted: boolean
  lastSeenAt: Date | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

/**
 * A bcrypt hash of `PLAIN_PASSWORD`, computed once at module load.
 *
 * `bcrypt.hashSync` at 10 rounds takes roughly a tenth of a second; a fixture
 * that is created dozens of times per suite would otherwise dominate the run.
 */
const PASSWORD_HASH = bcrypt.hashSync(PLAIN_PASSWORD, 10)

/** Creates a user row directly in the store, bypassing the auth endpoints. */
export function makeUser(store: FakeStore, overrides: Partial<TestUser> = {}): TestUser {
  userCounter += 1
  const now = new Date()
  const user: TestUser = {
    id: `10000000-0000-4000-8000-${String(userCounter).padStart(12, '0')}`,
    email: `user${userCounter}@example.com`,
    // Real hash, so a fixture can authenticate through the real login path.
    passwordHash: PASSWORD_HASH,
    isVerified: true,
    verificationTokenHash: null,
    verificationTokenExpiresAt: null,
    verifiedAt: now,
    username: `user${userCounter}`,
    fullName: `User ${userCounter}`,
    bio: null,
    avatarUrl: null,
    profileCompleted: true,
    lastSeenAt: now,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  }
  store.users.set(user.id, user as unknown as Row)
  return user
}

export function makeChat(store: FakeStore, userA: TestUser, userB: TestUser): Row {
  const chat: Row = {
    id: `20000000-0000-4000-8000-${String(store.chats.size + 1).padStart(12, '0')}`,
    userAId: userA.id,
    userBId: userB.id,
    createdAt: new Date(),
  }
  store.chats.set(chat.id as string, chat)
  return chat
}

export function makeMessage(
  store: FakeStore,
  chat: Row,
  sender: TestUser,
  overrides: Record<string, unknown> = {},
): Row {
  const message: Row = {
    id: `50000000-0000-4000-8000-${String(store.messages.size + 1).padStart(12, '0')}`,
    chatId: chat.id,
    // `sender_id` is the foreign-key column; the `sender` object the services
    // read is rehydrated on query, exactly as TypeORM does it.
    senderId: sender.id,
    messageType: 'text',
    content: 'hello',
    mediaUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
  store.messages.set(message.id as string, message)
  return message
}

export function makeContactRequest(
  store: FakeStore,
  sender: TestUser,
  receiver: TestUser,
  status: 'pending' | 'accepted' | 'declined',
): Row {
  const row: Row = {
    id: `30000000-0000-4000-8000-${String(store.contactRequests.size + 1).padStart(12, '0')}`,
    // The FK columns; `sender`/`receiver` are rehydrated on query.
    senderId: sender.id,
    receiverId: receiver.id,
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  store.contactRequests.set(row.id as string, row)
  return row
}

/**
 * Signs a fixture user in through the real `POST /auth/login` and returns the
 * bearer token.
 *
 * Suites that start from seeded fixtures use this rather than minting a token
 * themselves, so every authenticated request in an E2E suite arrives over a
 * token the application's own auth flow issued.
 */
export async function loginAs(
  baseUrl: string,
  email: string,
  password = PLAIN_PASSWORD,
): Promise<string> {
  const res = await request<ApiEnvelope<{ token: string }>>(baseUrl, '/auth/login', {
    method: 'POST',
    body: { email, password },
  })
  if (res.status !== 200) {
    throw new Error(`E2E: login for ${email} failed with ${res.status}`)
  }
  return (res.body as ApiEnvelope<{ token: string }>).data.token
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

export interface HttpResult<T = ApiEnvelope<unknown>> {
  status: number
  body: T
  headers: Headers
  cookies: Record<string, string>
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | undefined>
  token?: string
  /** Sends the token as the httpOnly cookie a browser client would use. */
  asCookie?: boolean
  headers?: Record<string, string>
}

export async function request<T = ApiEnvelope<unknown>>(
  baseUrl: string,
  path: string,
  options: RequestOptions = {},
): Promise<HttpResult<T>> {
  const url = new URL(`${baseUrl}${API_BASE_PATH}${path}`)
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }

  const headers: Record<string, string> = { ...options.headers }
  if (options.body !== undefined) headers['content-type'] = 'application/json'
  if (options.token) {
    if (options.asCookie) {
      headers.cookie = `auth_token=${options.token}`
    } else {
      headers.authorization = `Bearer ${options.token}`
    }
  }

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  const text = await response.text()
  const cookies: Record<string, string> = {}
  for (const raw of (response.headers as unknown as { getSetCookie?: () => string[] })
    .getSetCookie?.() ?? []) {
    const [pair] = raw.split(';')
    const index = pair.indexOf('=')
    if (index > 0) cookies[pair.slice(0, index).trim()] = pair.slice(index + 1).trim()
  }

  return {
    status: response.status,
    body: (text.length > 0 ? JSON.parse(text) : undefined) as T,
    headers: response.headers,
    cookies,
  }
}
