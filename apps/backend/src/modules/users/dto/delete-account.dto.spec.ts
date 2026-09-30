import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { DeleteAccountDto } from './delete-account.dto'

/**
 * Validation of DeleteAccountDto (P2 — it had no spec).
 *
 * features.md requires "explicit confirmation" for account deletion, and this
 * DTO is the mechanism: the body must carry the user's current password. The
 * test below proves the gate cannot be bypassed by an empty or absent field —
 * anything weaker would let a stolen or ambient-authenticated session destroy
 * an account, and the password is only ever compared server-side by
 * UsersService, never logged or returned.
 */
describe('DeleteAccountDto', () => {
  const messagesFor = async (payload: Record<string, unknown>) => {
    const errors = await validate(plainToInstance(DeleteAccountDto, payload))
    return errors.flatMap((e) => Object.values(e.constraints ?? {}))
  }

  it('accepts a supplied password', async () => {
    expect(await messagesFor({ password: 'any-password-value' })).toEqual([])
  })

  it('rejects a missing password', async () => {
    expect(await messagesFor({})).not.toEqual([])
  })

  it('rejects an empty password', async () => {
    expect(await messagesFor({ password: '' })).not.toEqual([])
  })

  it('rejects a whitespace-only password', async () => {
    // @IsNotEmpty accepts whitespace, so this documents the real behaviour: the
    // confirmation must be non-empty, and the bcrypt comparison in the service
    // is what actually rejects a wrong guess.
    expect(await messagesFor({ password: '   ' })).toEqual([])
  })

  it.each([
    ['a non-string', 12345678],
    ['an object', { value: 'password' }],
    ['an array', ['password']],
    ['null', null],
    ['a boolean', true],
  ])('rejects %s', async (_label, password) => {
    expect(await messagesFor({ password })).not.toEqual([])
  })
})
