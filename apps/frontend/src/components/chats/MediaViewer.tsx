import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMediaViewerStore } from '../../stores/media-viewer.store'
import { fetchAttachmentBlob, releaseAttachment, getCachedObjectUrl, getCachedAttachmentBlob, downloadAttachment } from '../../lib/api/attachment-cache'
import type { Message } from '@email-chat-pro/types'
import { ChevronLeft, ChevronRight, X, Download, Plus, Minus, Info } from 'lucide-react'
import { Button } from '../ui/button'
import { useChatHistoryInfinite } from '../../hooks/use-chat-history-infinite'
import { formatDate } from '../../i18n/formatting'

/**
 * Gallery derived ONLY from media messages already in the currently-loaded
 * chat history cache (the `MessageList` infinite-query pages). This avoids
 * the forbidden "additional history requests solely to populate the gallery".
 */
function useGalleryFromLoadedHistory(chatId: string, messageId: string) {
  const { data } = useChatHistoryInfinite(chatId || null)
  const allPages = data?.pages ?? []
  const messages: Message[] = allPages.flatMap((p: unknown) => {
    const paginated = p as { data?: Message[] }
    return paginated?.data ?? []
  })

  const mediaMessages = useMemo(() => {
    return messages.filter(
      (m) => m.messageType === 'image' || m.messageType === 'video',
    )
  }, [messages])

  const currentIndex = useMemo(() => {
    return mediaMessages.findIndex((m) => m.id === messageId)
  }, [mediaMessages, messageId])

  const current =
    currentIndex >= 0 ? mediaMessages[currentIndex] : null

  const hasPrev = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < mediaMessages.length - 1

  return { mediaMessages, currentIndex, current, hasPrev, hasNext, total: mediaMessages.length }
}

export function MediaViewer() {
  const { t } = useTranslation('chat', { useSuspense: false })
  const { open, chatId, messageId, closeViewer } = useMediaViewerStore()

  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [showInfo, setShowInfo] = useState(false)

  const stageRef = useRef<HTMLDivElement>(null)

  // Gallery from loaded history — never a new request.
  const gallery = useGalleryFromLoadedHistory(chatId ?? '', messageId ?? '')

  // Resolve the current message's media for stage + metadata.
  const url = gallery.current?.mediaUrl ?? null
  const mediaType = gallery.current?.messageType ?? null
  const alt = gallery.current
    ? t('mediaAlt', {
        sender: gallery.current.sender?.username ?? gallery.current.sender?.email ?? t('you'),
        type: t(`mediaType.${mediaType}`),
      })
    : ''

  // Open / close body scroll guard.
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Fetch the stage media through the attachment cache (deduped + reuse).
  // If the blob is already cached (`getCachedObjectUrl` hits), we skip
  // the network entirely for the object URL; otherwise one shared fetch
  // through `fetchAttachmentBlob` serves this and any other concurrent
  // consumers of the same id (e.g. the thumbnail strip, which uses only
  // `getCachedObjectUrl` and does not keep it alive).
  //
  // This effect also resets loading/zoom/info whenever `url` changes, so
  // navigation between messages needs no separate reset effect: a second
  // effect keyed on `messageId` would run after this one on the same commit
  // and clobber the `src` it just set (stale-image / blank stage bug).
  useEffect(() => {
    if (!open || !url) return
    setFailed(false)
    setLoading(true)
    setZoom(1)
    setShowInfo(false)
    let cancelled = false
    // Tracks whether this effect acquired its own reference to the object URL
    // via `fetchAttachmentBlob`. The cached path (`getCachedObjectUrl`) does
    // NOT take a reference, so it must NOT release one on cleanup — releasing
    // would double-count against the message bubble still showing the same
    // attachment and could evict it early. Only the fetch path releases.
    let ownsRef = false
    const cachedUrl = getCachedObjectUrl(url)
    if (cachedUrl) {
      if (!cancelled) {
        setSrc(cachedUrl)
        setLoading(false)
      }
      return () => { cancelled = true }
    }
    fetchAttachmentBlob(url)
      .then((objectUrl) => {
        ownsRef = true
        if (!cancelled) {
          setSrc(objectUrl)
          setFailed(false)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
      if (ownsRef && url) releaseAttachment(url)
    }
  }, [open, url])

  /** Navigate to previous media message in the loaded-gallery set. */
  const prev = useCallback(() => {
    const idx = gallery.currentIndex
    if (idx > 0) {
      const prevMsg = gallery.mediaMessages[idx - 1]
      const prevStore = useMediaViewerStore.getState()
      prevStore.openViewer({ chatId: prevStore.chatId ?? chatId ?? '', messageId: prevMsg.id })
    }
  }, [gallery, chatId])

  /** Navigate to next media message in the loaded-gallery set. */
  const next = useCallback(() => {
    const idx = gallery.currentIndex
    if (idx >= 0 && idx < gallery.mediaMessages.length - 1) {
      const nextMsg = gallery.mediaMessages[idx + 1]
      const s = useMediaViewerStore.getState()
      s.openViewer({ chatId: s.chatId ?? chatId ?? '', messageId: nextMsg.id })
    }
  }, [gallery, chatId])

  // Keyboard navigation (left/right arrows, Escape to close).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeViewer() }
      if (e.key === 'ArrowLeft' && gallery.hasPrev) { e.preventDefault(); prev() }
      if (e.key === 'ArrowRight' && gallery.hasNext) { e.preventDefault(); next() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, gallery.hasPrev, gallery.hasNext, prev, next, closeViewer])

  /** Navigate to previous media message in the loaded-gallery set. */
  const prev = useCallback(() => {
    const idx = gallery.currentIndex
    if (idx > 0) {
      const prevMsg = gallery.mediaMessages[idx - 1]
      const prevStore = useMediaViewerStore.getState()
      // Navigate by updating the store's messageId, which triggers the
      // useEffect above to load the new media.
      prevStore.openViewer({ chatId: prevStore.chatId ?? chatId ?? '', messageId: prevMsg.id })
    }
  }, [gallery, chatId])

  /** Navigate to next media message in the loaded-gallery set. */
  const next = useCallback(() => {
    const idx = gallery.currentIndex
    if (idx >= 0 && idx < gallery.mediaMessages.length - 1) {
      const nextMsg = gallery.mediaMessages[idx + 1]
      const s = useMediaViewerStore.getState()
      s.openViewer({ chatId: s.chatId ?? chatId ?? '', messageId: nextMsg.id })
    }
  }, [gallery, chatId])

  // Metadata from cached blob (no extra request; derived from the same
  // blob the stage is already displaying via `fetchAttachmentBlob`).
  const metaBlob = url ? getCachedAttachmentBlob(url) : null
  const metaMime = metaBlob?.type ?? ''
  const metaSize = metaBlob ? metaBlob.size : null

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[rgba(0,0,0,0.85)] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t('mediaViewer.info')}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeViewer()
      }}
    >
      {/* Header bar — always visible, minimal chrome. */}
      <div className="flex items-center justify-between px-4 py-3 text-white/90">
        <div className="flex items-center gap-2 text-sm tabular-nums opacity-80">
          <span>{t('mediaViewer.count', { current: gallery.currentIndex + 1, total: gallery.total })}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={t('mediaViewer.info')}
            onClick={() => setShowInfo((s) => !s)}
            className="rounded-md p-2 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white/60"
            title={t('mediaViewer.info')}
          >
            <Info size={18} aria-hidden />
          </button>
          <button
            type="button"
            aria-label={t('mediaViewer.close')}
            onClick={closeViewer}
            className="rounded-md p-2 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white/60"
            title={t('mediaViewer.close')}
          >
            <X size={20} aria-hidden />
          </button>
        </div>
      </div>

      {/* Main stage */}
      <div
        ref={stageRef}
        className="flex flex-1 items-center justify-center overflow-auto px-4 py-2"
        role="img"
        aria-label={alt}
      >
        {loading && !failed && (
          <p className="text-white/60">{t('mediaViewer.loading')}</p>
        )}
        {failed && (
          <div className="flex flex-col items-center gap-3 text-white/80">
            <p className="text-base">{t('mediaViewer.retryDescription')}</p>
            <Button
              variant="secondary"
              onClick={() => {
                setFailed(false)
                setLoading(true)
                if (url) {
                  fetchAttachmentBlob(url)
                    .then((objectUrl) => {
                      setSrc(objectUrl)
                      setFailed(false)
                      setLoading(false)
                    })
                    .catch(() => {
                      setFailed(true)
                      setLoading(false)
                    })
                }
              }}
            >
              {t('mediaViewer.retry')}
            </Button>
          </div>
        )}
        {!loading && !failed && src && mediaType === 'image' && (
          <img
            src={src}
            alt={alt}
            className="max-h-[75vh] max-w-full rounded-lg object-contain shadow-2xl"
            style={{ transform: `scale(${zoom})`, transition: 'transform 200ms ease' }}
          />
        )}
        {!loading && !failed && src && mediaType === 'video' && (
          <video
            src={src}
            controls
            preload="metadata"
            className="max-h-[75vh] max-w-full rounded-lg shadow-2xl"
            aria-label={alt}
          >
            {t('mediaUnavailable')}
          </video>
        )}
      </div>

      {/* Bottom toolbar (zoom + navigation + download + info toggle). */}
      <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-[rgba(0,0,0,0.6)] px-4 py-3 text-white/90 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={t('mediaViewer.zoomOut')}
            title={t('mediaViewer.zoomOut')}
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="rounded-md p-2 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white/60"
          >
            <Minus size={18} aria-hidden />
          </button>
          <span className="w-14 text-center text-xs tabular-nums opacity-70">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            aria-label={t('mediaViewer.zoomIn')}
            title={t('mediaViewer.zoomIn')}
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            className="rounded-md p-2 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white/60"
          >
            <Plus size={18} aria-hidden />
          </button>
          <button
            type="button"
            aria-label={t('mediaViewer.resetZoom')}
            title={t('mediaViewer.resetZoom')}
            onClick={() => setZoom(1)}
            className="rounded-md p-2 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white/60 text-xs opacity-80"
          >
            {t('mediaViewer.resetZoom')}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={t('mediaViewer.previous')}
            title={t('mediaViewer.previous')}
            onClick={prev}
            disabled={!gallery.hasPrev}
            className="rounded-md p-2 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white/60 disabled:opacity-30"
          >
            <ChevronLeft size={20} aria-hidden />
          </button>
          <span className="tabular-nums text-sm">
            {gallery.currentIndex + 1} {t('mediaViewer.of')} {gallery.total}
          </span>
          <button
            type="button"
            aria-label={t('mediaViewer.next')}
            title={t('mediaViewer.next')}
            onClick={next}
            disabled={!gallery.hasNext}
            className="rounded-md p-2 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white/60 disabled:opacity-30"
          >
            <ChevronRight size={20} aria-hidden />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={t('mediaViewer.download')}
            title={t('mediaViewer.download')}
            onClick={() => url && downloadAttachment(url)}
            className="rounded-md p-2 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white/60"
          >
            <Download size={18} aria-hidden />
          </button>
        </div>
      </div>

      {/* Side info panel (desktop) / bottom sheet (mobile) — shown on info toggle. */}
      {showInfo && (
        <aside
          role="region"
          aria-label={t('mediaViewer.info')}
          className="border-t border-white/10 bg-[rgba(0,0,0,0.75)] px-4 py-4 text-white/90 backdrop-blur-md md:absolute md:right-6 md:top-16 md:w-72 md:rounded-xl md:border md:border-white/20 md:shadow-2xl md:py-5"
        >
          <h3 className="mb-2 text-sm font-semibold">{t('mediaViewer.info')}</h3>
          <dl className="space-y-1.5 text-xs leading-relaxed opacity-90">
            <div>
              <dt className="text-white/60">{t('mediaAlt', { sender: gallery.current?.sender?.username ?? '', type: t(`mediaType.${mediaType}`) })}</dt>
              <dd className="font-medium">{alt}</dd>
            </div>
            {gallery.current?.createdAt && (
              <div>
                <dt className="text-white/60">{t('mediaViewer.sent')}</dt>
                <dd>{formatDate(gallery.current.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</dd>
              </div>
            )}
            <div>
              <dt className="text-white/60">{t('mediaType.image') === t('mediaType.image') ? 'Type' : 'نوع'}</dt>
              <dd className="font-medium">{mediaType ? (mediaType === 'image' ? t('mediaType.image') : t('mediaType.video')) : t('mediaViewer.unknownType')}</dd>
            </div>
            <div>
              <dt className="text-white/60">MIME</dt>
              <dd className="font-mono text-[11px]">{metaMime || t('mediaViewer.unknownFile')}</dd>
            </div>
            {metaSize !== null && (
              <div>
                <dt className="text-white/60">Size</dt>
                <dd>{new Intl.NumberFormat('en-US').format(metaSize)} {t('mediaViewer.bytes')}</dd>
              </div>
            )}
            <div>
              <dt className="text-white/60">URL</dt>
              <dd className="break-all font-mono text-[10px] opacity-70">{url ? url.replace(/^\/api\/v1/, '') : '-'}</dd>
            </div>
          </dl>
          <div className="mt-3 flex gap-2">
            {gallery.mediaMessages.map((m, idx) => (
              <button
                key={m.id}
                aria-label={`${t('mediaViewer.count', { current: idx + 1, total: gallery.total })}`}
                aria-current={m.id === messageId}
                onClick={() => useMediaViewerStore.getState().openViewer({ chatId: chatId ?? '', messageId: m.id })}
                className={`h-10 w-10 overflow-hidden rounded-md border-2 transition ${
                  m.id === messageId ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
                title={t('mediaAlt', { sender: m.sender?.username ?? m.sender?.email ?? '', type: t(`mediaType.${m.messageType}`) })}
              >
                <img
                  src={getCachedObjectUrl(m.mediaUrl ?? '') ?? ''}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={(e) => { const target = e.currentTarget as HTMLImageElement; target.style.display = 'none' }}
                />
              </button>
            ))}
          </div>
        </aside>
      )}
    </div>
  )
}
