/**
 * UserAvatar — avatar with an initials fallback
 * (architecture.md §Data Model — `users.avatar_url`).
 *
 * The backend returns `avatarUrl` only when the user has set one, so this
 * renders the uploaded image when present and falls back to initials derived
 * from the username or full name. No new upload path is introduced here; the
 * component only displays what the API already provides.
 */
import type { User } from '@email-chat-pro/types'
import { cn } from '../../lib/utils'

interface UserAvatarProps {
  user: Pick<User, 'id' | 'avatarUrl' | 'username' | 'fullName' | 'email'>
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
} as const

/** Best available display name for the initials fallback. */
function initialsFor(user: UserAvatarProps['user']): string {
  const source = user.fullName?.trim() || user.username?.trim() || user.email
  const parts = source.split(/[\s._-]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function UserAvatar({ user, size = 'md', className }: UserAvatarProps) {
  const dimension = SIZE_CLASSES[size]

  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt=""
        className={cn('shrink-0 rounded-full object-cover', dimension, className)}
      />
    )
  }

  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-neutral-300 font-medium text-neutral-700',
        dimension,
        className,
      )}
    >
      {initialsFor(user)}
    </span>
  )
}
