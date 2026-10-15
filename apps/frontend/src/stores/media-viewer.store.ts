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
  openViewer: (opts: { chatId: string; messageId: string }) => void
  closeViewer: () => void
}

export const useMediaViewerStore = create<MediaViewerState>((set) => ({
  open: false,
  chatId: null,
  messageId: null,
  openViewer: ({ chatId, messageId }) =>
    set({ open: true, chatId, messageId }),
  closeViewer: () => set({ open: false, chatId: null, messageId: null }),
}))