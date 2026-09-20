'use client'
import { RequireAuth } from '../../../components/auth/RequireAuth'
import { ChatWindow } from '../../../components/chats/ChatWindow'
import { useParams } from 'next/navigation'

export default function ChatPage() {
  const params = useParams()
  const chatId = params.chatId as string

  return (
    <RequireAuth>
      <main className="flex min-h-screen flex-col bg-neutral-100">
        <ChatWindow chatId={chatId} />
      </main>
    </RequireAuth>
  )
}
