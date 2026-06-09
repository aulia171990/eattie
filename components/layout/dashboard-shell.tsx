'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import type { Profile } from '@/types'

interface DashboardShellProps {
  user: Profile
  lowStockCount?: number
  children: React.ReactNode
}

export function DashboardShell({ user, lowStockCount = 0, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Single Sidebar — desktop always visible, mobile as overlay drawer */}
      <Sidebar
        user={user}
        lowStockCount={lowStockCount}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header
          user={user}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
