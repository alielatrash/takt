'use client'

import { Sidebar } from './sidebar'
import { Header } from './header'
import type { SessionUser } from '@/types'

interface AppShellProps {
  children: React.ReactNode
  user?: SessionUser | null
}

export function AppShell({ children, user }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={user?.role} user={user} />
      <div className="ml-16 min-h-screen" style={{ backgroundColor: '#f9f9fa' }}>
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
