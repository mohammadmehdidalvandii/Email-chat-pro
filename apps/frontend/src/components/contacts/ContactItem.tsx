import type { User } from '@email-chat-pro/types'
import { usePresenceStore } from '../../stores/presence.store'

interface ContactItemProps { user: User }

export function ContactItem({ user }: ContactItemProps) {
  const presence = usePresenceStore((s) => s.presenceByUserId[user.id])
  return (
    <div className="rounded border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <p className="font-medium">{user.username}</p>
        {presence && (
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${presence.status === 'online' ? 'bg-green-500' : 'bg-neutral-400'}`} title={presence.status} />
        )}
      </div>
      <p className="text-sm text-neutral-500">{user.email}</p>
      {user.fullName && <p className="text-sm text-neutral-500">{user.fullName}</p>}
    </div>
  )
}
