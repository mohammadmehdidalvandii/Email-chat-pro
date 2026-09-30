import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { ERROR_MESSAGES } from '@email-chat-pro/constants'
import { CreateContactRequestDto } from './create-contact-request.dto'
import { UpdateContactRequestDto } from './update-contact-request.dto'

/**
 * Validation of the contact-request bodies (P2 — neither had a spec).
 *
 * `CreateContactRequestDto` is the only client-supplied identity field on the
 * contact flow, and `UpdateContactRequestDto` is the authorization-relevant
 * state transition: `accepted` is what creates the chat. Both are validated by
 * the same class-validator rules the global ValidationPipe applies in main.ts.
 */
describe('contact request DTOs', () => {
  const messagesFor = async (cls: new () => object, payload: Record<string, unknown>) => {
    const errors = await validate(plainToInstance(cls, payload))
    return errors.flatMap((e) => Object.values(e.constraints ?? {}))
  }

  describe('CreateContactRequestDto', () => {
    const check = (payload: Record<string, unknown>) =>
      messagesFor(CreateContactRequestDto, payload)

    it('accepts a canonical UUID receiver', async () => {
      expect(await check({ receiverId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301' })).toEqual([])
    })

    it('rejects a missing receiverId', async () => {
      expect(await check({})).not.toEqual([])
    })

    it.each([
      ['a non-UUID string', 'not-a-uuid'],
      ['a bare integer', '42'],
      ['a UUID with a trailing character', '3f2504e0-4f89-11d3-9a0c-0305e82c3301x'],
      ['a UUID with a missing group', '3f2504e0-4f89-11d3-9a0c-0305e82c33'],
      ['a SQL-injection string', "1' OR '1'='1"],
      ['a path-traversal string', '../../etc/passwd'],
      ['an empty string', ''],
    ])('rejects %s', async (_label, receiverId) => {
      expect(await check({ receiverId })).not.toEqual([])
    })

    it('rejects a non-string receiverId', async () => {
      expect(await check({ receiverId: 3 })).not.toEqual([])
    })

    it('rejects a null receiverId', async () => {
      // @IsUUID without @IsOptional must not let null through.
      expect(await check({ receiverId: null })).not.toEqual([])
    })
  })

  describe('UpdateContactRequestDto', () => {
    const check = (payload: Record<string, unknown>) =>
      messagesFor(UpdateContactRequestDto, payload)

    it.each(['accepted', 'declined'])('accepts the %s response', async (status) => {
      expect(await check({ status })).toEqual([])
    })

    it('rejects a missing status', async () => {
      const messages = await check({})

      expect(messages).toContain(ERROR_MESSAGES.CONTACT_REQUEST_STATUS_INVALID)
    })

    it.each([
      ['the sender-side status', 'pending'],
      ['an unknown status', 'accepted '],
      ['a status differing only in case', 'Accepted'],
      ['an empty string', ''],
      ['a non-string', 1],
      ['a boolean', true],
    ])('rejects %s', async (_label, status) => {
      expect(await check({ status })).toContain(
        ERROR_MESSAGES.CONTACT_REQUEST_STATUS_INVALID,
      )
    })

    it('does not accept any status that would move a request backwards', async () => {
      // Only the recipient may answer, and only once; 'pending' in particular
      // must never be settable by a client, since the service writes it.
      for (const status of ['pending', 'rejected', 'cancelled', 'blocked', 'accepted ']) {
        expect(await check({ status })).toContain(ERROR_MESSAGES.CONTACT_REQUEST_STATUS_INVALID)
      }
    })
  })
})
