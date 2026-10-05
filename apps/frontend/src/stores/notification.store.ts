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

/** `AudioContext` with the WebKit-prefixed fallback some browsers expose. */
type AudioContextFactory = new () => AudioContext

/** `typeof window` includes the global `AudioContext` constructor. */
type WindowWithAudioContext = typeof window & {
  webkitAudioContext?: AudioContextFactory
}

const getAudioContext = (): AudioContext | null => {
  try {
    const w = window as WindowWithAudioContext
    const Factory = w.AudioContext ?? w.webkitAudioContext
    return Factory ? new Factory() : null
  } catch {
    return null
  }
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
    // Play a short, noticeable chime for the incoming message.
    // The tone is synthesized with the Web Audio API, so no audio
    // file or extra dependency is added. Failures (e.g. the
    // browser requires a user gesture before audio may start)
    // are swallowed — the visual notification is still shown.
    const ctx = getAudioContext()
    if (ctx) {
      try {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(880, ctx.currentTime) // A5
        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22)
        osc.connect(gain).connect(ctx.destination)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.25)
      } catch {
        // Silent fail if the browser blocks audio playback
      }
    }
  },
  clear: () => set({ items: [], seenIds: new Set() }),
}))
