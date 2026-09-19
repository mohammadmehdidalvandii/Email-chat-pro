/**
 * Auth session store (rules.md §State Management — Zustand for client state).
 *
 * Owns ONLY the local auth session state: the JWT and the authenticated user.
 * Server state (profile, contacts, chats) is fetched through TanStack Query
 * and is intentionally not duplicated here. The token is read by the Axios
 * request interceptor and the QueryClient `session` query reads the user.
 *
 * The token persists in localStorage so a page refresh keeps the session
 * without an immediate round-trip; the `session` query re-validates it with
 * the backend on load (backend authorization remains authoritative).
 */
import type { User } from '@email-chat-pro/types'
import { create } from 'zustand'

const TOKEN_STORAGE_KEY = 'email-chat-pro:auth-token'

/** Reads the persisted token without throwing on SSR (no `window`). */
function readPersistedToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

/** Writes or clears the persisted token, ignoring SSR and quota errors. */
function persistToken(token: string | null): void {
  if (typeof window === 'undefined') return
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    }
  } catch {
    // Ignore storage failures (private mode, quota) — the in-memory state
    // still drives the current session.
  }
}

export interface AuthState {
  /** JWT used as the Bearer token; null when unauthenticated. */
  token: string | null
  /** Authenticated user, or null until the session query resolves. */
  user: User | null
  /** True once the initial session check has finished (success or failure). */
  hasSessionResolved: boolean
  /** Store the token+user returned by a successful login. */
  setSession: (token: string, user: User) => void
  /** Update just the user (used when the session query hydrates on load). */
  setUser: (user: User | null) => void
  /** Mark that the initial session check has completed. */
  markSessionResolved: () => void
  /** Clear all session state (logout). */
  clearSession: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: readPersistedToken(),
  user: null,
  hasSessionResolved: false,
  setSession: (token, user) => {
    persistToken(token)
    set({ token, user })
  },
  setUser: (user) => set({ user }),
  markSessionResolved: () => set({ hasSessionResolved: true }),
  clearSession: () => {
    persistToken(null)
    set({ token: null, user: null })
  },
}))

/**
 * Non-reactive token accessor used by the Axios interceptor (reading the
 * store via a hook inside a non-component would cause loops/warnings).
 */
export function getAuthToken(): string | null {
  return useAuthStore.getState().token
}
