import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { ERROR_MESSAGES } from '@email-chat-pro/constants'
import { CreateMessageDto } from './create-message.dto'

/**
 * Validation of CreateMessageDto (P2 — the message-send body had no spec).
 *
 * This is the widest untrusted input in the app: every field lands in the
 * database and is rendered to the other participant. The DTO enforces the
 * transport-level shape (type enum, length bounds); the service additionally
 * enforces the cross-field rules ("content required for text", "mediaUrl
 * required for image/video and forbidden for text") — those are asserted in
 * messages.service.spec.ts, not here, so this spec does not imply they are
 * covered by the DTO.
 */
describe('CreateMessageDto', () => {
  const messagesFor = async (payload: Record<string, unknown>) => {
    const errors = await validate(plainToInstance(CreateMessageDto, payload))
    return errors.flatMap((e) => Object.values(e.constraints ?? {}))
  }

  describe('messageType', () => {
    it.each(['text', 'image', 'video'])('accepts %s', async (messageType) => {
      expect(await messagesFor({ messageType, content: 'hello' })).toEqual([])
    })

    it('rejects a missing messageType', async () => {
      expect(await messagesFor({ content: 'hello' })).toContain(
        ERROR_MESSAGES.MESSAGE_TYPE_INVALID,
      )
    })

    it.each([
      ['an uppercase type', 'TEXT'],
      ['a partially valid type', 'texts'],
      ['an unknown type', 'sticker'],
      ['a type carrying a script payload', '<script>alert(1)</script>'],
      ['an empty string', ''],
      ['a non-string', 1],
      ['null', null],
    ])('rejects %s', async (_label, messageType) => {
      expect(await messagesFor({ messageType, content: 'hello' })).toContain(
        ERROR_MESSAGES.MESSAGE_TYPE_INVALID,
      )
    })
  })

  describe('content', () => {
    it('accepts content at the 1-character minimum', async () => {
      expect(await messagesFor({ messageType: 'text', content: 'a' })).toEqual([])
    })

    it('accepts content at the 5000-character maximum', async () => {
      expect(await messagesFor({ messageType: 'text', content: 'a'.repeat(5000) })).toEqual([])
    })

    it('rejects content of 5001 characters', async () => {
      expect(await messagesFor({ messageType: 'text', content: 'a'.repeat(5001) })).not.toEqual([])
    })

    it('rejects an empty string', async () => {
      // Length(1, 5000) refuses '' even though the field is @IsOptional —
      // an empty caption is not a caption.
      expect(await messagesFor({ messageType: 'text', content: '' })).not.toEqual([])
    })

    it('rejects a non-string content', async () => {
      expect(await messagesFor({ messageType: 'text', content: { text: 'hello' } })).not.toEqual([])
    })

    it('treats omitted content as valid at the DTO level, deferring to the service', async () => {
      // The DTO allows a caption-less image/video; the service rejects a
      // text message with no content. Asserting only the DTO half here.
      expect(await messagesFor({ messageType: 'image' })).toEqual([])
    })
  })

  describe('mediaUrl', () => {
    it('accepts a media URL at the 500-character maximum', async () => {
      const url = `https://cdn.example.com/${'a'.repeat(500 - 'https://cdn.example.com/'.length)}`

      expect(await messagesFor({ messageType: 'image', mediaUrl: url })).toEqual([])
    })

    it('rejects a media URL longer than 500 characters', async () => {
      expect(await messagesFor({ messageType: 'image', mediaUrl: 'https://a.com/' + 'b'.repeat(500) }))
        .not.toEqual([])
    })

    it('rejects an empty media URL', async () => {
      expect(await messagesFor({ messageType: 'image', mediaUrl: '' })).not.toEqual([])
    })

    it('rejects a non-string media URL', async () => {
      expect(await messagesFor({ messageType: 'image', mediaUrl: 42 })).not.toEqual([])
    })

    it('accepts an explicit null media URL', async () => {
      // @IsOptional permits null so the field can be cleared without omitting
      // it; the service decides whether null is meaningful for the type.
      expect(await messagesFor({ messageType: 'text', mediaUrl: null })).toEqual([])
    })
  })
})
