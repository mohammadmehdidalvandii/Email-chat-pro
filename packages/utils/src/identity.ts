/**
 * Shared identity utilities (rules.md §Shared Package Rules).
 *
 * Defines how to derive a display name from a user object consistently
 * across the application, with fallback logic for missing fields.
 */
import type { User } from '@email-chat-pro/types'

/**
 * Derives the first two initials from a display name.
 * `Ali Reza` → `AR`; `Sara` → `SA`; `m.smith` → `MS`.
 */
export function initialsFromName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return ''
  // Split on whitespace and punctuation; take first two non-empty words
  const words = trimmed.split(/[\s._-]+/).filter(Boolean)
  if (words.length === 0) return ''
  const first = words[0][0] ?? ''
  const second = words[1]?.[0] ?? words[0][1] ?? ''
  return (first + second).toUpperCase().slice(0, 2)
}

/**
 * Derives a display name for a user with consistent fallback.
 */
export function getDisplayName(user: Pick<User, 'username' | 'fullName' | 'email'>): string {
  const fullName = user.fullName?.trim()
  if (fullName && fullName.length > 0) {
    return fullName
  }

  // If fullName is missing, try firstName (assuming fullName structure "First Last")
  // Or just return username/email
  const username = user.username?.trim()
  if (username && username.length > 0) {
    return username
  }

  return user.email
}
