/**
 * UserAvatar — avatar with an initials fallback
 * (architecture.md §Data Model — `users.avatar_url`).
 *
 * The backend returns `avatarUrl` only when the user has set one, so this
 * renders the uploaded image when present and falls back to initials derived
 * from the username or full name. The image is served through an authenticated
 * attachment fetch (see {@link AttachmentCache}) rather than a plain `<img
 * src>` request, because `GET /api/v1/attachments/:id` requires JWT auth:
 * a direct URL fetch would be rejected with 401, while the bearer token is
 * attached by the axios interceptor used by chat media.
 */
import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/auth.store'
import { setSessionUser, fetchAttachmentBlob, getCachedObjectUrl } from '../../lib/api/attachment-cache'
import { cn } from '../../lib/utils'
import { getDisplayName, initialsFromName } from '@email-chat-pro/utils'

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

/** Non-reactive userId accessor for use in effects. */
function useAuthStoreUser(userId: string | undefined): string | null {
  const authUser = useAuthStore((s) => s.user)
  return authUser?.id ?? null
}

export function UserAvatar({ user, size = 'md', className }: UserAvatarProps) {
  const dimension = SIZE_CLASSES[size]
  const userId = useAuthStoreUser(user.id)
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  // Reset error state if avatar URL changes (e.g., user uploads new avatar)
  useEffect(() => {
    setFailed(false)
  }, [user.avatarUrl])

  useEffect(() => {
    setSessionUser(userId)
    let cancelled = false

    if (!user.avatarUrl) {
      setSrc(null)
      return
    }

    // If the profile already carries a fetched object URL, reuse it.
    const cached = getCachedObjectUrl(user.avatarUrl)
    if (cached) {
      setSrc(cached)
      setFailed(false)
      return
    }

    fetchAttachmentBlob(user.avatarUrl)
      .then((objectUrl) => {
        if (!cancelled) {
          setSrc(objectUrl)
          setFailed(false)
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [userId, user.avatarUrl])

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        className={cn('shrink-0 rounded-full object-cover', dimension, className)}
        onError={() => setFailed(true)}
      />
    )
  }

  const displayName = getDisplayName(user)
  const initials = initialsFromName(displayName)

  return (
    <span
      aria-label={displayName}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-neutral-300 font-medium text-neutral-700',
        dimension,
        className,
      )}
    >
      {initials || '?'}
    </span>
  )
}
