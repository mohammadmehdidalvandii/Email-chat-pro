/**
 * Participant-pair normalization for the chats model
 * (architecture.md §Schema Reasoning for Chats).
 *
 * Chats are always stored with `user_a < user_b`. Before querying (or writing)
 * a chat for a pair of users, normalize the pair so both (A,B) and (B,A)
 * resolve to the same stored ordering:
 *
 *   IF user1 > user2 THEN swap
 */
export function normalizeParticipants(userA: string, userB: string): [string, string] {
  return userA < userB ? [userA, userB] : [userB, userA]
}
