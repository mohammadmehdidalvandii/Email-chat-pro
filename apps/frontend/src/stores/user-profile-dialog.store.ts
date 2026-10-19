import { create } from 'zustand'

interface UserProfileDialogState {
  userId: string | null
  chatId: string | null
  open: (userId: string, chatId: string | null) => void
  close: () => void
}

export const useUserProfileDialogStore = create<UserProfileDialogState>((set) => ({
  userId: null,
  chatId: null,
  open: (userId, chatId) => set({ userId, chatId }),
  close: () => set({ userId: null, chatId: null }),
}))
