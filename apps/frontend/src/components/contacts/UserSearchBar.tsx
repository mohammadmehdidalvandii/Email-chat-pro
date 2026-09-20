'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'

export function UserSearchBar() {
  const { t } = useTranslation('contacts')
  const router = useRouter()
  const params = useSearchParams()
  const [query, setQuery] = useState(params.get('q') || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('searchPlaceholder')}
        className="flex-1 rounded border border-neutral-300 p-2"
      />
      <Button type="submit">Search</Button>
    </form>
  )
}
