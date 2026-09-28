'use client'
import { RequireAuth } from '../../components/auth/RequireAuth'
import { AppShell } from '../../components/Layout/AppShell'
import { ConversationList } from '../../components/chats/ConversationList'
import { useTranslation } from 'react-i18next'

export default function ChatsPage() {
  const { t } = useTranslation('chat', { useSuspense: false })
  return (
    <RequireAuth>
      <AppShell>
        <div className="mx-auto w-full max-w-md">
          <h1 className="mb-6 text-2xl font-bold">{t('conversations')}</h1>
          <ConversationList />
        </div>
      </AppShell>
    </RequireAuth>
  )
}
