/**
 * Jest configuration for the integration suites (P2): the HTTP E2E specs under
 * test/e2e/ and the migration specs under test/migrations/.
 *
 * This is deliberately a SEPARATE config from the `jest` block in package.json
 * rather than a `projects` restructure. Keeping the unit config untouched means
 * `npm test` behaves exactly as it did before this file existed — same
 * `rootDir`, same coverage, same file selection — and there is no chance that a
 * change to one suite's discovery silently alters the other.
 *
 * The migration suite is here rather than in the unit config because it is the
 * one suite that needs a real PostgreSQL server. It creates and drops a
 * throwaway database of its own (see the file header) and skips unless
 * RUN_MIGRATION_TESTS=1, so including it here does not make `npm run test:e2e`
 * depend on a running database.
 *
 * Run with: npm run test:e2e --workspace @email-chat-pro/backend
 *
 * Coverage is off here. The unit suites own coverage; measuring it twice would
 * produce two conflicting reports for one codebase, and a suite that runs the
 * real application over real HTTP is not where branch coverage is won.
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'test/(e2e/.*\\.e2e-spec|migrations/.*\\.spec)\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@nestjs/config)/)'
  ],
  // `@nestjs/jwt` v12 is ESM-only, which the CommonJS Jest runtime cannot
  // require. The shim reimplements its surface over the `jsonwebtoken` CJS
  // package it already depends on, so auth E2E tests sign and verify real
  // tokens. See test/jwt-cjs-shim.js for why stubbing would not be equivalent.
  moduleNameMapper: {
    '^@nestjs/jwt$': '<rootDir>/test/jwt-cjs-shim.js',
    '^@nestjs/config$': '<rootDir>/../../node_modules/@nestjs/config/dist/index.js'
  },
  // Booting the real application, then resolving an offline mail host, is
  // slower than a unit module compile. The default 5s is not enough headroom
  // for a cold run on a loaded machine.
  testTimeout: 30000,
  // `e2e-app.ts` is the harness, not a test file, and the specs share a
  // listening application across a whole file; running them in band keeps the
  // port allocation and the per-process env juggling deterministic.
  maxWorkers: 1,
  testEnvironment: 'node',
  collectCoverage: false,
}
