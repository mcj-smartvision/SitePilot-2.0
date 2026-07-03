'use client'

import type { OnlineUser } from '@/types/admin'
import { cn } from '@/lib/utils'

const statusStyles = {
  online: 'bg-emerald-500',
  idle: 'bg-amber-400',
  offline: 'bg-muted-foreground/40',
}

export function OnlineUsersPanel({ users }: { users: OnlineUser[] }) {
  const onlineCount = users.filter((u) => u.status === 'online').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-emerald-600">{onlineCount}</span> online now
        </p>
      </div>
      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.id} className="flex items-center gap-3 rounded-lg border bg-card/50 px-3 py-2.5">
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-steel/10 text-sm font-semibold text-steel">
                {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <span
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card',
                  statusStyles[user.status]
                )}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{user.name}</p>
              </div>
              <p className="text-xs text-muted-foreground truncate">{user.role}</p>
              <p className="text-xs text-primary/80 truncate mt-0.5">Viewing: {user.currentPage}</p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{user.lastSeen}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
