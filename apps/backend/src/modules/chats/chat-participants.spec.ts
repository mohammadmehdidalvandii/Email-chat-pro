import { normalizeParticipants } from './chat-participants'

describe('normalizeParticipants', () => {
  it('returns the pair unchanged when already ordered (userA < userB)', () => {
    expect(normalizeParticipants('user-a', 'user-b')).toEqual(['user-a', 'user-b'])
  })

  it('swaps the pair when userA > userB', () => {
    expect(normalizeParticipants('user-b', 'user-a')).toEqual(['user-a', 'user-b'])
  })

  it('is idempotent — the result is already normalized', () => {
    const [a, b] = normalizeParticipants('x-y', 'a-z')
    expect(normalizeParticipants(a, b)).toEqual([a, b])
  })

  it('handles UUID-style ids', () => {
    const first = '11111111-1111-1111-1111-111111111111'
    const second = '22222222-2222-2222-2222-222222222222'
    expect(normalizeParticipants(second, first)).toEqual([first, second])
  })
})
