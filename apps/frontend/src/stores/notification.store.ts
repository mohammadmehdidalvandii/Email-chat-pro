import { create } from 'zustand'

export interface NotificationItem {
  id: string
  chatId: string
  senderName: string
  preview: string
  timestamp: number
}

interface NotificationState {
  items: NotificationItem[]
  seenIds: Set<string>
  add: (item: Omit<NotificationItem, 'timestamp'>) => void
  clear: () => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  seenIds: new Set(),
  add: (item) => {
    if (get().seenIds.has(item.id)) return
    set((s) => {
      const next = new Set(s.seenIds)
      next.add(item.id)
      return {
        items: [
          ...s.items.filter((i) => i.id !== item.id),
          { ...item, timestamp: Date.now() },
        ].slice(-3),
        seenIds: next,
      }
    })
  },
  clear: () => set({ items: [], seenIds: new Set() }),
}))
