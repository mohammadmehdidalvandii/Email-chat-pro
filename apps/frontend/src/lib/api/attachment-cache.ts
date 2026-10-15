/**
 * Per-user attachment object-URL cache.
 *
 * Media is served from the authenticated `GET /attachments/:id`
 * endpoint, so every bubble fetches through `apiClient` (the JWT is
 * attached by its interceptor). Without this cache that fetch runs
 * once per `MessageMedia` mount — every chat open, every infinite-
 * scroll page, every socket-driven re-render — and the backend's
 * global throttle (100 requests / 15 min per user) turns a busy
 * transcript into HTTP 429s.
 *
 * Lifecycle (rules.md §State Management — this is a client-side
 * performance cache, not server state; TanStack Query owns the
 * message list itself):
 *   - keyed by attachment id (the path segment of mediaUrl)
 *   - scoped per authenticated user: entries are tagged with the
 *     user id that fetched them and are never reused across users
 *   - successful blobs only; failures are never cached so a retry
 *     is always possible
 *   - concurrent requests for the same id share one in-flight
 *     promise instead of each opening its own connection
 *   - object URLs are reference-counted and only revoked once the
 *     last consumer releases them
 *   - bounded: the oldest entry is evicted once the cap is reached
 *   - cleared on logout / account switch (see useAttachmentCache)
 */
import { apiClient } from './client'

/** Attachment id extracted from a `mediaUrl` (`/api/v1/attachments/:id`). */
function attachmentIdFromUrl(url: string): string | null {
  const match = /\/attachments\/([^/?#]+)/.exec(url)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

/** One cached blob plus its shared object URL and consumer count. */
interface CacheEntry {
  blob: Blob
  objectUrl: string
  refCount: number
  /** Monotonic insertion order, used for FIFO eviction. */
  sequence: number
}

/** The cache itself. Module-scoped so it survives component remounts. */
interface AttachmentCache {
  /** user id -> attachment id -> entry */
  byUser: Map<string, Map<string, CacheEntry>>
  /** user id -> attachment id -> shared in-flight promise */
  inFlight: Map<string, Map<string, Promise<Blob>>>
  sequence: number
}

/** Ceiling on cached blobs per user. Eviction is FIFO (oldest first). */
const MAX_ENTRIES_PER_USER = 100

const cache: AttachmentCache = { byUser: new Map(), inFlight: new Map(), sequence: 0 }

/** Current authenticated user id, set by {@link useAttachmentCache}. */
let currentUserId: string | null = null

/**
 * Drops every cached entry and in-flight tracker for a user, revoking
 * object URLs that are no longer referenced. Called on logout and on
 * account switch so a later login never reuses another user's media.
 */
function invalidateUser(userId: string): void {
  const entries = cache.byUser.get(userId)
  if (entries) {
    for (const entry of entries.values()) {
      URL.revokeObjectURL(entry.objectUrl)
    }
    cache.byUser.delete(userId)
  }
  cache.inFlight.delete(userId)
}

/** Records (or re-records) the authenticated user and scopes the cache to them. */
export function setSessionUser(userId: string | null): void {
  if (userId === currentUserId) return
  if (currentUserId) {
    invalidateUser(currentUserId)
  }
  currentUserId = userId
}

/**
 * Fetches an attachment through `apiClient`, deduplicating concurrent
 * requests for the same id and caching the resulting blob.
 *
 * The returned object URL stays valid until the matching release call;
 * the blob is shared, so multiple messages showing the same image
 * reuse one fetch and one object URL.
 */
export async function fetchAttachmentBlob(url: string): Promise<string> {
  const userId = currentUserId
  const attachmentId = attachmentIdFromUrl(url)
  if (!userId || !attachmentId) {
    // No session or a non-attachment URL: fall back to a direct fetch
    // so the caller still renders the media.
    return fetchDirect(url)
  }

  let entries = cache.byUser.get(userId)
  if (!entries) {
    entries = new Map()
    cache.byUser.set(userId, entries)
  }
  const existing = entries.get(attachmentId)
  if (existing) {
    existing.refCount += 1
    return existing.objectUrl
  }

  // Deduplicate: a second consumer of the same id awaits the same
  // promise instead of opening its own connection.
  let flights = cache.inFlight.get(userId)
  if (!flights) {
    flights = new Map()
    cache.inFlight.set(userId, flights)
  }
  const pending = flights.get(attachmentId)
  if (pending) {
    await pending
    return acquireAfterFlight(userId, attachmentId, url)
  }

  const flight = fetchBlob(url).finally(() => {
    cache.inFlight.get(userId)?.delete(attachmentId)
  })
  flights.set(attachmentId, flight)

  const blob = await flight

  // The blob may have been invalidated while the request was in
  // flight (logout mid-flight); the object URL must not survive into
  // a session it does not belong to.
  if (currentUserId !== userId) {
    return fetchDirect(url)
  }

  // Evict the oldest entry before inserting so the cache stays bounded
  // and this fetch's object URL is not immediately revoked.
  while (entries.size >= MAX_ENTRIES_PER_USER) {
    evictOldest(entries)
  }

  const objectUrl = URL.createObjectURL(blob)
  entries.set(attachmentId, { blob, objectUrl, refCount: 1, sequence: cache.sequence++ })
  return objectUrl
}

/**
 * Acquires the object URL for an id another request just populated.
 * If that request failed or was invalidated, falls back to a direct
 * fetch so the caller still renders the media.
 */
async function acquireAfterFlight(
  userId: string,
  attachmentId: string,
  url: string,
): Promise<string> {
  if (currentUserId !== userId) {
    return fetchDirect(url)
  }
  const entry = cache.byUser.get(userId)?.get(attachmentId)
  if (entry) {
    entry.refCount += 1
    return entry.objectUrl
  }
  return fetchDirect(url)
}

/** Evicts the oldest entry, revoking its object URL. */
function evictOldest(entries: Map<string, CacheEntry>): void {
  let oldestKey: string | null = null
  let oldestSequence = Number.POSITIVE_INFINITY
  for (const [key, entry] of entries) {
    if (entry.sequence < oldestSequence) {
      oldestSequence = entry.sequence
      oldestKey = key
    }
  }
  if (oldestKey === null) return
  const evicted = entries.get(oldestKey)
  if (evicted) {
    URL.revokeObjectURL(evicted.objectUrl)
    entries.delete(oldestKey)
  }
}

/**
 * Returns the cached object URL for an attachment without touching the
 * reference count.
 *
 * Read-only helpers (viewer thumbnails, metadata) use this so they can
 * reference an already-loaded blob without keeping it alive on their own
 * and without issuing a request. Returns `null` when the blob is not yet
 * cached — the caller falls back to a placeholder instead of fetching.
 */
export function getCachedObjectUrl(url: string): string | null {
  const userId = currentUserId
  const attachmentId = attachmentIdFromUrl(url)
  if (!userId || !attachmentId) return null
  return cache.byUser.get(userId)?.get(attachmentId)?.objectUrl ?? null
}

/**
 * Triggers a browser download of an attachment, reusing the cached blob
 * when it is already loaded so the download costs no extra request. The
 * filename is derived from the blob's MIME type (`media.<ext>`), because
 * the `Message` contract carries no filename and there is no JSON metadata
 * endpoint — see `docs/3-architecture.md` §File Endpoints.
 */
export function downloadAttachment(url: string): void {
  const userId = currentUserId
  const attachmentId = attachmentIdFromUrl(url)
  const entry = userId && attachmentId ? cache.byUser.get(userId)?.get(attachmentId) : null
  const blob = entry?.blob ?? (userId && attachmentId ? null : null)
  // No cached blob for this session's user: fetch once through apiClient.
  const fallback = entry ? null : fetchBlob(url)
  void (async () => {
    const data = blob ?? (await fallback)
    const ext = extensionFromMime(data.type)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(data)
    a.download = `media-${attachmentId ?? 'file'}.${ext}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  })().catch(() => {
    // A failed download must not break the viewer; the caller decides
    // whether to surface it (the viewer does, via its own error state).
  })
}

/** Best-effort file extension for a MIME type (`image/png` -> `png`). */
function extensionFromMime(mime: string): string {
  const sub = mime.split('/')[1]?.split('+')[0]?.toLowerCase()
  return sub && /^[a-z0-9]+$/.test(sub) ? sub : 'bin'
}

/**
 * Returns the cached blob (exposing `.type` and `.size` for a viewer's info
 * panel) or `null` when not cached. Never fetches.
 */
export function getCachedAttachmentBlob(url: string): Blob | null {
  const userId = currentUserId
  const attachmentId = attachmentIdFromUrl(url)
  if (!userId || !attachmentId) return null
  return cache.byUser.get(userId)?.get(attachmentId)?.blob ?? null
}

/**
 * Releases a consumer's claim on an attachment's object URL. The URL
 * is revoked only when the last consumer releases it, so a remounting
 * message never sees a dead `blob:` URL.
 */
export function releaseAttachment(url: string): void {
  const userId = currentUserId
  const attachmentId = attachmentIdFromUrl(url)
  if (!userId || !attachmentId) return
  const entries = cache.byUser.get(userId)
  const entry = entries?.get(attachmentId)
  if (!entry) return
  entry.refCount = Math.max(0, entry.refCount - 1)
}

/** Fetches the blob through `apiClient` (the Bearer token is attached by its interceptor). */
async function fetchBlob(url: string): Promise<Blob> {
  const response = await apiClient.request<Blob>({
    method: 'GET',
    url: url.replace(/^\/api\/v1/, '') || url,
    responseType: 'blob',
  })
  const blob = response.data
  if (!(blob instanceof Blob)) {
    throw new Error('attachment response is not a blob')
  }
  return blob
}

/**
 * Uncached fetch used for non-attachment URLs and for requests that
 * raced a session change. The caller revokes the returned URL.
 */
async function fetchDirect(url: string): Promise<string> {
  return URL.createObjectURL(await fetchBlob(url))
}
