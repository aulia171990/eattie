'use client'

import { useState } from 'react'
import Link from 'next/link'
import { logout } from '@/actions/auth'
import type { Profile } from '@/types'
import { Bell, Globe, LogOut, User, ChevronDown, Menu } from 'lucide-react'
import { Sidebar } from './sidebar'

interface HeaderProps {
  user: Profile
  pageTitle?: string
}

export function Header({ user, pageTitle }: HeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [lang, setLang] = useState<'id' | 'en'>('id')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      {/* Mobile sidebar drawer — controlled from header */}
      <Sidebar
        user={user}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <header
        className="h-14 border-b bg-white flex items-center justify-between px-4 lg:px-6 shrink-0"
        style={{ borderColor: 'hsl(36, 20%, 88%)' }}
      >
        {/* Left: hamburger (mobile) + page title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Buka menu"
          >
            <Menu size={22} style={{ color: 'hsl(25, 30%, 30%)' }} />
          </button>

          {pageTitle && (
            <h1 className="text-sm font-semibold hidden sm:block"
              style={{ color: 'hsl(25, 30%, 20%)' }}>
              {pageTitle}
            </h1>
          )}
        </div>

        {/* Right: lang + notif + user */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(l => l === 'id' ? 'en' : 'id')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-gray-100"
            style={{ color: 'hsl(25, 30%, 40%)' }}
          >
            <Globe size={14} />
            {lang.toUpperCase()}
          </button>

          <button className="relative p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <Bell size={18} style={{ color: 'hsl(25, 30%, 40%)' }} />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full"
              style={{ background: 'hsl(32, 95%, 44%)' }} />
          </button>

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(o => !o)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'hsl(32, 80%, 90%)', color: 'hsl(32, 95%, 30%)' }}>
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-medium truncate max-w-24"
                  style={{ color: 'hsl(25, 30%, 20%)' }}>
                  {user.full_name}
                </div>
                <div className="text-xs capitalize" style={{ color: 'hsl(25, 15%, 50%)' }}>
                  {user.role === 'owner' ? 'Pemilik' : user.role === 'cashier' ? 'Kasir' : 'Baker'}
                </div>
              </div>
              <ChevronDown size={14} style={{ color: 'hsl(25, 15%, 50%)' }} />
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 mt-1 w-48 rounded-xl shadow-lg border bg-white z-20 py-1 overflow-hidden"
                  style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
                  <Link
                    href="/dashboard/settings/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                    style={{ color: 'hsl(25, 30%, 25%)' }}>
                    <User size={15} />
                    Profil Saya
                  </Link>
                  <div className="h-px my-1" style={{ background: 'hsl(36, 20%, 92%)' }} />
                  <form action={logout}>
                    <button
                      type="submit"
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-red-50 transition-colors"
                      style={{ color: 'hsl(0, 70%, 50%)' }}>
                      <LogOut size={15} />
                      Keluar
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  )
}
