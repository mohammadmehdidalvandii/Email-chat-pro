/**
 * Profile modal state (rules.md §State Management — Zustand for UI state).
 *
 * Owns ONLY the modal open/closed state for the AccountDeletionModal.
 * Server profile state is managed by TanStack Query and is intentionally
 * not duplicated here.
 */
import { create } from 'zustand'

export interface ProfileModalState {
  isDeleteModalOpen: boolean
  openDeleteModal: () => void
  closeDeleteModal: () => void
}

export const useProfileModalStore = create<ProfileModalState>((set) => ({
  isDeleteModalOpen: false,
  openDeleteModal: () => set({ isDeleteModalOpen: true }),
  closeDeleteModal: () => set({ isDeleteModalOpen: false }),
}))
