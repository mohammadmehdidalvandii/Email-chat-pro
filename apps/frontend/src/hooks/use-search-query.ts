import { useQuery } from '@tanstack/react-query'
import { searchUsersApi } from '../lib/api/contacts.api'
import { useAuthStore } from '../stores/auth.store'

export const SEARCH_KEY = ['search', 'users'] as const

export function useSearchUsers(q: string) {
  const token = useAuthStore((s) => s.token)
  // The backend rejects a whitespace-only query (SEARCH_QUERY_MIN_LENGTH is
  // counted after trimming), so such a query would burn a request against the
  // 50/hour throttle and render a spurious error. Key and gate on the trimmed
  // value so `?q=%20` is treated as no query at all.
  const term = q.trim()

  return useQuery({
    queryKey: [...SEARCH_KEY, term],
    queryFn: () => searchUsersApi(term),
    enabled: Boolean(token) && term.length > 0,
    refetchOnWindowFocus: false,
    retry: false,
  })
}
