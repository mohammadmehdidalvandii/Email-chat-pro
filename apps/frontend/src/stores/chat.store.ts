import { create } from 'zustand'

interface ChatState {
  activeChatId: string | null
  isSocketConnected: boolean
  setActiveChatId: (chatId: string | null) => void
  setIsSocketConnected: (isConnected: boolean) => void
}

export const useChatStore = create<ChatState>((set) => ({
  activeChatId: null,
  isSocketConnected: false,
  setActiveChatId: (activeChatId) => set({ activeChatId }),
  setIsSocketConnected: (isSocketConnected) => set({ isSocketConnected }),
}))
