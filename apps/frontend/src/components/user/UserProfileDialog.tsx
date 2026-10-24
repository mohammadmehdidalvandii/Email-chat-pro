import { useUserProfileDialogStore } from '../../stores/user-profile-dialog.store'
import { UserAvatar } from '../common/UserAvatar'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useChatHistoryInfinite } from '../../hooks/use-chat-history-infinite'
import { useMemo, useState, useEffect } from 'react'
import { useMediaViewerStore } from '../../stores/media-viewer.store'
import { getDisplayName } from '@email-chat-pro/utils'
import type { Message, PaginatedResponse, User } from '@email-chat-pro/types'
import type { TFunction } from 'i18next'
import type { InfiniteData } from '@tanstack/react-query'
import { fetchAttachmentBlob, getCachedObjectUrl } from '../../lib/api/attachment-cache'


function ThumbnailLoader({ url, alt }: { url: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let cancelled = false
    const cached = getCachedObjectUrl(url)
    if (cached) { setSrc(cached); setFailed(false); return }
    fetchAttachmentBlob(url).then((objectUrl) => { if (!cancelled) { setSrc(objectUrl); setFailed(false) } }).catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [url])
  if (failed || !src) return <div className="w-full h-full bg-neutral-200" />
  return <img src={src} alt={alt} loading="lazy" className="w-full h-full object-cover" />
}

function ProfileHeader({ userId, data, t, onCopy, copyFeedback }: { userId: string; data: InfiniteData<PaginatedResponse<Message>> | undefined; t: TFunction; onCopy: (text: string, message: string) => void; copyFeedback: string | null }) {
  const profileUser = useMemo(() => {
    if (!data || !userId) return null
    for (const page of data.pages ?? []) {
      for (const msg of page.data ?? []) {
        if (msg.senderId === userId) return msg.sender as User
      }
    }
    return null
  }, [data, userId])

  return (
    <div className="flex flex-col items-center gap-4">
      {copyFeedback && (
        <p className="text-xs text-success mt-2" role="status" aria-live="polite">{copyFeedback}</p>
      )}
      <UserAvatar
        user={profileUser ?? { id: userId }}
        size="lg"
        onClick={() => profileUser?.avatarUrl && useMediaViewerStore.getState().openViewer({ chatId: null, messageId: null, avatarUrl: profileUser.avatarUrl })}
      />
      <h3 className="text-lg font-semibold text-text-main">{profileUser ? getDisplayName(profileUser) : t('profile:profileTitle', { defaultValue: 'Profile' })}</h3>
      {profileUser?.username && (
        <p
          className="text-sm text-text-muted cursor-pointer hover:text-text-secondary transition-colors"
          onClick={() => {
            onCopy(profileUser.username!, t('common:copied', { defaultValue: 'Username copied to clipboard' }))
          }}
          title={t('common:copy', { defaultValue: 'Click to copy' })}
        >
          @{profileUser.username}
        </p>
      )}
      {profileUser?.email && (
        <p
          className="text-sm text-text-muted cursor-pointer hover:text-text-secondary transition-colors"
          onClick={() => {
            onCopy(profileUser.email, t('common:copied', { defaultValue: 'Email copied to clipboard' }))
          }}
          title={t('common:copy', { defaultValue: 'Click to copy' })}
          dir="ltr"
        >
          {profileUser.email}
        </p>
      )}
      <p className="text-xs text-text-muted">{userId}</p>
      {profileUser?.bio && <p className="text-sm text-text-main text-center whitespace-pre-wrap">{profileUser.bio}</p>}
    </div>
  )
}

export function UserProfileDialog() {
  const { userId, chatId, close } = useUserProfileDialogStore()
  const { t } = useTranslation('profile', { useSuspense: false })

  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    if (copyFeedback) {
      timer = setTimeout(() => setCopyFeedback(null), 2000)
    }
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [copyFeedback])

  const handleCopy = (text: string, message: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback(message)
    })
  }

  const { data, isLoading } = useChatHistoryInfinite(chatId)

  const mediaItems = useMemo(() => {
    if (!userId || !chatId || !data) return []
    const all = data.pages.flatMap((p) => p.data)
    const seen = new Set<string>()
    const results: { messageId: string; url: string; type: 'image' | 'video'; alt: string }[] = []
    for (const msg of all) {
      if (msg.senderId !== userId) continue
      if (msg.messageType !== 'image' && msg.messageType !== 'video') continue
      if (!msg.mediaUrl) continue
      if (msg.mediaUrl.startsWith('/api/v1/attachments/')) {
        // exclude avatar attachments (messageId null on attachment) by requiring messageId association; already filtered by sender
      }
      if (seen.has(msg.mediaUrl)) continue
      seen.add(msg.mediaUrl)
      results.push({ messageId: msg.id, url: msg.mediaUrl, type: msg.messageType, alt: msg.content || t('mediaAlt', { sender: msg.sender?.username || userId, type: msg.messageType }) })
    }
    return results
  }, [data, userId, chatId, t])

  if (!userId) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('profile:profileTitle', { defaultValue: 'Profile' })}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={() => close()}
    >
      <div
        className="relative mx-4 w-full max-w-md rounded-xl bg-main-surface p-6 shadow-2xl border border-border max-h-[90vh] overflow-y-auto chat-scroll"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => close()}
          aria-label={t('common:close', { defaultValue: 'Close' })}
          className="absolute right-3 top-3 rounded-md p-1 text-text-secondary hover:text-text-main"
        >
          <X className="h-4 w-4" />
        </button>
        <ProfileHeader userId={userId} data={data} t={t} onCopy={handleCopy} copyFeedback={copyFeedback} />

        <div className="mt-6 border-t border-border pt-4">
          <h4 className="text-sm font-semibold mb-2 text-text-main">{t('profile:mediaGallery', { defaultValue: 'Media' })}</h4>
          {isLoading ? (
            <p className="text-sm text-text-muted">{t('common:loading')}</p>
          ) : mediaItems.length === 0 ? (
            <p className="text-sm text-text-muted">{t('profile:noMedia', { defaultValue: 'No media' })}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {mediaItems.map((item) => (
                <button
                  key={item.messageId + item.url}
                  type="button"
                  onClick={() => useMediaViewerStore.getState().openViewer({ chatId: chatId!, messageId: item.messageId })}
                  className="relative aspect-video rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2"
                  aria-label={item.alt}
                >
                  {item.type === 'image' ? (
                    <ThumbnailLoader url={item.url} alt={item.alt} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-medium text-text-muted bg-neutral-300 dark:bg-neutral-700">VIDEO</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
