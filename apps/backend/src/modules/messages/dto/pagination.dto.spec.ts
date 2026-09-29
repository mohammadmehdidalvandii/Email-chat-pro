// @Type() is implemented with Reflect metadata, which the DTO needs at class
// definition time. main.ts gets this via @nestjs/core; a spec that imports the
// DTO first has to load the polyfill itself.
import 'reflect-metadata'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import {
  MESSAGE_LIMIT_DEFAULT,
  MESSAGE_LIMIT_MAX,
  MESSAGE_LIMIT_MIN,
  MESSAGE_PAGE_DEFAULT,
  MESSAGE_PAGE_MIN,
} from '@email-chat-pro/constants'
import { PaginationDto } from './pagination.dto'

/**
 * Validation of GET /chats/:chatId/messages pagination (P1 — page/limit were
 * unbounded, so `page=0` produced a negative `skip` and a large `limit` could
 * pull an unbounded result set).
 *
 * Runs the same rules the controller's `@Query(ValidationPipe)` applies, so an
 * out-of-range value is a VALIDATION_ERROR 400 rather than a DB error.
 */
describe('PaginationDto', () => {
  const parse = (query: Record<string, unknown>) => plainToInstance(PaginationDto, query)
  const errorsFor = async (query: Record<string, unknown>) =>
    (await validate(parse(query))).flatMap((e) => Object.values(e.constraints ?? {}))

  describe('defaults', () => {
    it('falls back to the documented defaults when no query is supplied', async () => {
      const dto = parse({})

      expect(await validate(dto)).toHaveLength(0)
      expect(dto.page).toBe(MESSAGE_PAGE_DEFAULT)
      expect(dto.limit).toBe(MESSAGE_LIMIT_DEFAULT)
    })

    it('keeps the defaults when only one of the two is supplied', async () => {
      const dto = parse({ page: '3' })

      expect(await validate(dto)).toHaveLength(0)
      expect(dto.page).toBe(3)
      expect(dto.limit).toBe(MESSAGE_LIMIT_DEFAULT)
    })
  })

  describe('accepted values', () => {
    it.each([
      ['the minimum page', String(MESSAGE_PAGE_MIN)],
      ['a mid-range page', '7'],
      ['a large page', '10000'],
    ])('accepts %s', async (_label, page) => {
      expect(await errorsFor({ page })).toHaveLength(0)
    })

    it.each([
      ['the minimum limit', String(MESSAGE_LIMIT_MIN)],
      ['the maximum limit', String(MESSAGE_LIMIT_MAX)],
      ['a mid-range limit', '25'],
    ])('accepts %s', async (_label, limit) => {
      expect(await errorsFor({ limit })).toHaveLength(0)
    })
  })

  describe('rejected values', () => {
    it.each([
      ['zero page', '0'],
      ['a negative page', '-1'],
      ['a large negative page', '-999'],
    ])('rejects %s', async (_label, page) => {
      expect(await errorsFor({ page })).not.toHaveLength(0)
    })

    it.each([
      ['zero limit', '0'],
      ['a negative limit', '-5'],
      ['a limit above the maximum', String(MESSAGE_LIMIT_MAX + 1)],
      ['an unbounded limit', '1000000'],
    ])('rejects %s', async (_label, limit) => {
      expect(await errorsFor({ limit })).not.toHaveLength(0)
    })

    it.each([
      ['a non-numeric page', 'abc'],
      ['a non-numeric limit', 'abc'],
      ['a fractional page', '1.5'],
      ['an empty limit', ''],
    ])('rejects %s', async (_label, value) => {
      expect(await errorsFor({ page: value, limit: value })).not.toHaveLength(0)
    })
  })

  it('reports the offending field so the client knows which value to fix', async () => {
    const errors = await validate(parse({ limit: String(MESSAGE_LIMIT_MAX + 1) }))

    expect(errors).toHaveLength(1)
    expect(errors[0].property).toBe('limit')
  })
})
