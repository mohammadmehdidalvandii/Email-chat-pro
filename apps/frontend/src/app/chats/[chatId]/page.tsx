'use client'
import { RequireAuth } from '../../../components/auth/RequireAuth'
import { AppShell } from '../../../components/Layout/AppShell'
import { ChatWindow } from '../../../components/chats/ChatWindow'
import { useParams } from 'next/navigation'

export default function ChatPage() {
  const params = useParams()
  const chatId = params.chatId as string

  return (
    <RequireAuth>
      <AppShell>
        <ChatWindow chatId={chatId} />
      </AppShell>
    </RequireAuth>
  )
}
