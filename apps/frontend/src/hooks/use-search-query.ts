import { useQuery } from '@tanstack/react-query'
import { searchUsersApi } from '../lib/api/contacts.api'
import { useAuthStore } from '../stores/auth.store'

export const SEARCH_KEY = ['search', 'users'] as const

export function useSearchUsers(q: string) {
  const token = useAuthStore((s) => s.token)
  return useQuery({
    queryKey: [...SEARCH_KEY, q],
    queryFn: () => searchUsersApi(q),
    enabled: Boolean(token) && q.length > 0,
    refetchOnWindowFocus: false,
    retry: false,
  })
}
