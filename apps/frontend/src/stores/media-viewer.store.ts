import { create } from 'zustand'

/**
 * Media viewer state (rules.md §State Management — Zustand for client state).
 *
 * The viewer is a client-side presentation concern, not server state, so it
 * lives in a Zustand store rather than TanStack Query. It holds only the
 * *intent* to open (chat id + message id); the viewer itself resolves the
 * media object URL and the surrounding gallery from the already-loaded chat
 * history cache, so opening it issues no additional requests.
 */
interface MediaViewerState {
  open: boolean
  chatId: string | null
  messageId: string | null
  avatarUrl: string | null
  openViewer: (opts: { chatId?: string | null; messageId?: string | null; avatarUrl?: string | null }) => void
  closeViewer: () => void
}

export const useMediaViewerStore = create<MediaViewerState>((set) => ({
  open: false,
  chatId: null,
  messageId: null,
  avatarUrl: null,
  openViewer: ({ chatId = null, messageId = null, avatarUrl = null }) =>
    set({ open: true, chatId, messageId, avatarUrl }),
  closeViewer: () => set({ open: false, chatId: null, messageId: null, avatarUrl: null }),
}))