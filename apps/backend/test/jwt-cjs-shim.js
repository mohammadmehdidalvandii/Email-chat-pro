/**
 * CommonJS shim for `@nestjs/jwt` v12 (E2E only).
 *
 * `@nestjs/jwt` v12 is published as ESM only (`"type": "module"`, and the
 * `exports` map has no `require` condition), so Jest's CommonJS runtime cannot
 * load it — importing AppModule fails with "Cannot use import statement
 * outside a module".
 *
 * The unit specs get around this with `jest.mock('@nestjs/jwt', ...)`, which
 * replaces the service with a stub. That is right for a unit test and wrong
 * here: the auth E2E suites exist precisely to prove that a token issued by
 * `POST /auth/login` is one the JwtStrategy will accept, and a stub would make
 * that assertion vacuous.
 *
 * So instead of stubbing, this re-implements the package's CommonJS surface on
 * top of `jsonwebtoken` — the same CJS library `@nestjs/jwt` wraps. Signing,
 * verification, expiry and error types are therefore genuine; only the thin
 * Nest wrapper is local.
 *
 * The method signatures below deliberately mirror the v12 API, which differs
 * from v11 in two ways that matter here:
 *   - the secret comes from the module options, not from a second positional
 *     argument;
 *   - per-call options are merged over `this.options.signOptions` /
 *     `this.options.verifyOptions`, NOT over the options object wholesale.
 * The earlier version of this shim used the v11 shape and every verification
 * failed with "jwt malformed", because `jsonwebtoken` was handed a
 * `{ signOptions: {...} }` object where it expected a secret.
 *
 * Jest reaches this through the `moduleNameMapper` in `jest-e2e.config.js`. It
 * is not on the unit path, so unit behaviour is unchanged.
 */
const jsonwebtoken = require('jsonwebtoken')

class JwtService {
  constructor(options) {
    this.options = options || {}
  }

  /** Mirrors v12's `mergeJwtOptions`: drop the key aliases, then shallow-merge. */
  mergeJwtOptions(options, key) {
    const merged = { ...(options || {}) }
    delete merged.secret
    if (key === 'signOptions') {
      delete merged.privateKey
    } else {
      delete merged.publicKey
    }
    return { ...(this.options[key] || {}), ...merged }
  }

  getSecretKey(options, key) {
    return (
      this.options.secret ||
      (key === 'privateKey'
        ? this.options.privateKey
        : this.options.publicKey) ||
      (options ? options.secret || options[key] : undefined)
    )
  }

  sign(payload, options) {
    return jsonwebtoken.sign(
      payload,
      this.getSecretKey(options, 'privateKey'),
      this.mergeJwtOptions(options, 'signOptions'),
    )
  }

  signAsync(payload, options) {
    return new Promise((resolve, reject) => {
      jsonwebtoken.sign(
        payload,
        this.getSecretKey(options, 'privateKey'),
        this.mergeJwtOptions(options, 'signOptions'),
        (err, encoded) => (err ? reject(err) : resolve(encoded)),
      )
    })
  }

  verify(token, options) {
    return jsonwebtoken.verify(
      token,
      this.getSecretKey(options, 'publicKey'),
      this.mergeJwtOptions(options, 'verifyOptions'),
    )
  }

  verifyAsync(token, options) {
    return new Promise((resolve, reject) => {
      jsonwebtoken.verify(
        token,
        this.getSecretKey(options, 'publicKey'),
        this.mergeJwtOptions(options, 'verifyOptions'),
        (err, decoded) => (err ? reject(err) : resolve(decoded)),
      )
    })
  }

  decode(token, options) {
    return jsonwebtoken.decode(token, options)
  }
}

/** Mirrors `JwtModule` so `JwtModule.registerAsync(...)` yields a real provider. */
class JwtModule {
  static register(options) {
    return {
      module: JwtModule,
      providers: [{ provide: JwtService, useValue: new JwtService(options) }],
      exports: [JwtService],
    }
  }

  static registerAsync(options) {
    return {
      module: JwtModule,
      imports: options.imports ?? [],
      global: options.global,
      providers: [
        {
          provide: JwtService,
          useFactory: async (...deps) => new JwtService(await options.useFactory(...deps)),
          inject: options.inject ?? [],
        },
      ],
      exports: [JwtService],
    }
  }
}

module.exports = {
  JwtService,
  JwtModule,
  // Re-exported by the real package; the app does not use them today, but a
  // future import should fail loudly rather than be `undefined`.
  JsonWebTokenError: jsonwebtoken.JsonWebTokenError,
  TokenExpiredError: jsonwebtoken.TokenExpiredError,
  NotBeforeError: jsonwebtoken.NotBeforeError,
}
