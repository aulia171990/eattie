'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import type { Profile } from '@/types'

interface DashboardShellProps {
  user: Profile
  lowStockCount: number
  children: React.ReactNode
}

export function DashboardShell({ user, lowStockCount, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop: permanent sidebar */}
      <div className="hidden lg:flex">
        <Sidebar user={user} lowStockCount={lowStockCount} />
      </div>

      {/* Mobile: drawer overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 flex">
            <Sidebar
              user={user}
              lowStockCount={lowStockCount}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header
          user={user}
          onMenuToggle={() => setSidebarOpen(o => !o)}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
