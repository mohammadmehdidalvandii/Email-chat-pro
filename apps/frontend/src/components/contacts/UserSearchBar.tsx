'use client'

/**
 * UserSearchBar — the search input for GET /users/search.
 *
 * The query is mirrored into the URL so a search is linkable and survives a
 * refresh. Because the endpoint is throttled server-side, the text is debounced
 * before the query runs rather than firing a request per keystroke.
 */
import { useEffect, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

/** Quiet period after the last keystroke before the query is submitted. */
export const SEARCH_DEBOUNCE_MS = 400

export function UserSearchBar() {
  const { t } = useTranslation('contacts', { useSuspense: false })
  const router = useRouter()
  const params = useSearchParams()
  const urlQuery = params.get('q') ?? ''
  const [text, setText] = useState(urlQuery)

  // Keep the input in step when the URL changes from outside (back/forward).
  useEffect(() => {
    setText(urlQuery)
  }, [urlQuery])

  // Debounced push. The first render and a text identical to the URL is a
  // no-op, so typing does not push a duplicate history entry per pause.
  useEffect(() => {
    const trimmed = text.trim()
    if (trimmed === urlQuery) return
    const timer = setTimeout(() => {
      const query = trimmed ? `?q=${encodeURIComponent(trimmed)}` : ''
      router.replace(query ? `/search${query}` : '/search')
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [text, urlQuery, router])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = text.trim()
    // Submitting bypasses the debounce so Enter feels immediate.
    router.replace(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search')
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="flex gap-2">
      <Input
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={t('searchPlaceholder')}
        aria-label={t('searchPlaceholder')}
      />
      <Button type="submit">{t('search')}</Button>
    </form>
  )
}
