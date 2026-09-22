import { create } from 'zustand'
import type { PresenceStatus } from '@email-chat-pro/types'

export interface PresenceEntry {
  status: PresenceStatus
  lastSeenAt: string
}

interface PresenceState {
  presenceByUserId: Record<string, PresenceEntry>
  setPresence: (userId: string, entry: PresenceEntry) => void
}

export const usePresenceStore = create<PresenceState>((set) => ({
  presenceByUserId: {},
  setPresence: (userId, entry) =>
    set((state) => ({
      presenceByUserId: { ...state.presenceByUserId, [userId]: entry },
    })),
}))
