import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { ERROR_MESSAGES } from '@email-chat-pro/constants'
import { UpdateProfileDto } from './update-profile.dto'

/**
 * Validation of UpdateProfileDto.avatarUrl (P1 — avatarUrl accepted any string).
 *
 * These run the same class-validator rules the global ValidationPipe applies in
 * main.ts, so an invalid URL surfaces as the standard VALIDATION_ERROR 400.
 */
describe('UpdateProfileDto', () => {
  const check = async (payload: Record<string, unknown>) => {
    const errors = await validate(plainToInstance(UpdateProfileDto, payload))
    return errors.flatMap((e) => Object.values(e.constraints ?? {}))
  }

  const avatarMessages = async (avatarUrl: unknown) =>
    (await check({ avatarUrl })).filter((m) => m === ERROR_MESSAGES.AVATAR_URL_INVALID)

  describe('avatarUrl', () => {
    it.each([
      ['a valid http URL', 'http://example.com/avatar.png'],
      ['a valid https URL', 'https://cdn.example.com/avatars/user-1.png?size=256'],
    ])('accepts %s', async (_label, url) => {
      expect(await avatarMessages(url)).toHaveLength(0)
    })

    it.each([
      ['a non-URL string', 'not a url'],
      ['a bare hostname', 'example.com/avatar.png'],
      ['a javascript: URL', 'javascript:alert(1)'],
      ['a data: URL', 'data:text/html;base64,PHNjcmlwdD4='],
      ['a file: URL', 'file:///etc/passwd'],
      ['a whitespace-only string', '   '],
    ])('rejects %s', async (_label, url) => {
      expect(await avatarMessages(url)).toHaveLength(1)
    })

    it('preserves the optional behaviour: an omitted avatarUrl is valid', async () => {
      expect(await check({})).toHaveLength(0)
      expect(await avatarMessages(undefined)).toHaveLength(0)
    })

    it('preserves the optional behaviour: an explicit null avatarUrl is valid', async () => {
      expect(await check({ avatarUrl: null })).toHaveLength(0)
      expect(await avatarMessages(null)).toHaveLength(0)
    })

    it('rejects a non-string value rather than stringifying it', async () => {
      const errors = await validate(
        plainToInstance(UpdateProfileDto, { avatarUrl: { toString: () => 'https://x.test' } }),
      )
      expect(errors.length).toBeGreaterThan(0)
    })
  })
})
