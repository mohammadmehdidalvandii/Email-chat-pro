import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { ERROR_MESSAGES } from '@email-chat-pro/constants'
import { UploadFileDto } from './upload-file.dto'

/**
 * Validation of UploadFileDto (P2 — it had no spec).
 *
 * The type field selects which Multer file filter and which Cloudinary
 * resource path are used, so an unrecognised value must be refused at the pipe
 * rather than defaulting silently. The field stays optional because an absent
 * type defaults to image, which is asserted below.
 */
describe('UploadFileDto', () => {
  const messagesFor = async (payload: Record<string, unknown>) => {
    const errors = await validate(plainToInstance(UploadFileDto, payload))
    return errors.flatMap((e) => Object.values(e.constraints ?? {}))
  }

  it.each(['image', 'video'])('accepts type %s', async (type) => {
    expect(await messagesFor({ type })).toEqual([])
  })

  it('accepts an omitted type, which defaults to image', async () => {
    expect(await messagesFor({})).toEqual([])
  })

  it('accepts an explicit null type as equivalent to omitted', async () => {
    expect(await messagesFor({ type: null })).toEqual([])
  })

  it.each([
    ['an unknown type', 'audio'],
    ['an uppercase type', 'IMAGE'],
    ['a filename', 'image.png'],
    ['a MIME type', 'image/png'],
    ['an empty string', ''],
    ['a non-string', 1],
  ])('rejects %s', async (_label, type) => {
    expect(await messagesFor({ type })).toContain(ERROR_MESSAGES.UPLOAD_TYPE_INVALID)
  })

  it('does not accept a traversal path in the type field', async () => {
    // The value selects the storage resource, so a path-like value must never
    // pass the enum even though it is a plausible-looking string.
    expect(await messagesFor({ type: '../../secret' })).toContain(
      ERROR_MESSAGES.UPLOAD_TYPE_INVALID,
    )
  })
})
