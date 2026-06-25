'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { logout } from '@/actions/auth'
import { getNewOrderNotifications, type OrderNotification } from '@/actions/notifications'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import type { Profile } from '@/types'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Bell, Globe, LogOut, User, ChevronDown, Menu, ShoppingBag, BellRing, BellOff } from 'lucide-react'

interface HeaderProps {
  user: Profile
  onMenuToggle?: () => void
}

const POLL_INTERVAL_MS = 20000 // 20s

export function Header({ user, onMenuToggle }: HeaderProps) {
  const router = useRouter()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [lang, setLang] = useState<'id' | 'en'>('id')
  const [notifCount, setNotifCount] = useState(0)
  const [notifOrders, setNotifOrders] = useState<OrderNotification[]>([])
  const seenRef = useRef<Set<string>>(new Set())
  const isOwner = user.role === 'owner'
  const { status: pushStatus, errorMessage: pushError, subscribe, unsubscribe } =
    usePushNotifications(isOwner)

  const poll = useCallback(async () => {
    if (!isOwner) return
    try {
      const result = await getNewOrderNotifications()
      setNotifCount(result.count)
      setNotifOrders(result.orders)
    } catch {
      // silent fail — don't disrupt UI on transient network errors
    }
  }, [isOwner])

  useEffect(() => {
    if (!isOwner) return
    poll() // initial fetch
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [isOwner, poll])

  // Update document title with unread count
  useEffect(() => {
    if (!isOwner) return
    const baseTitle = 'Bakery Manager'
    document.title = notifCount > 0 ? `(${notifCount}) ${baseTitle}` : baseTitle
  }, [notifCount, isOwner])

  return (
    <header
      className="h-14 border-b bg-white flex items-center justify-between px-4 lg:px-6 shrink-0"
      style={{ borderColor: 'hsl(36, 20%, 88%)' }}
    >
      {/* Left: hamburger (mobile only) */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Buka menu"
        >
          <Menu size={22} style={{ color: 'hsl(25, 30%, 30%)' }} />
        </button>
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

        {isOwner && (
          <div className="relative">
            <button
              onClick={() => setNotifOpen(o => !o)}
              className="relative p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Notifikasi"
            >
              <Bell size={18} style={{ color: 'hsl(25, 30%, 40%)' }} />
              {notifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: 'hsl(0, 75%, 55%)' }}>
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 mt-1 w-80 rounded-xl shadow-lg border bg-white z-20 overflow-hidden"
                  style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
                  <div className="px-4 py-2.5 border-b flex items-center justify-between"
                    style={{ borderColor: 'hsl(36, 20%, 92%)' }}>
                    <span className="text-sm font-semibold" style={{ color: 'hsl(25, 30%, 20%)' }}>
                      Pesanan Baru
                    </span>
                    {notifCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'hsl(0, 70%, 95%)', color: 'hsl(0, 70%, 45%)' }}>
                        {notifCount} menunggu
                      </span>
                    )}
                  </div>

                  {/* Push notification toggle — works when tab is closed */}
                  {pushStatus !== 'unsupported' && (
                    <div className="px-4 py-3 border-b" style={{ borderColor: 'hsl(36, 20%, 92%)' }}>
                      {pushStatus === 'subscribed' ? (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <BellRing size={14} style={{ color: 'hsl(142, 60%, 40%)' }} />
                            <span className="text-xs" style={{ color: 'hsl(25, 30%, 30%)' }}>
                              Notifikasi browser aktif
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => unsubscribe()}
                            className="text-xs font-medium shrink-0 hover:underline"
                            style={{ color: 'hsl(25, 15%, 50%)' }}
                          >
                            Matikan
                          </button>
                        </div>
                      ) : pushStatus === 'denied' ? (
                        <p className="text-xs" style={{ color: 'hsl(0, 60%, 45%)' }}>
                          Notifikasi diblokir browser. Aktifkan di pengaturan situs.
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => subscribe()}
                          disabled={pushStatus === 'loading'}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60"
                          style={{ background: 'hsl(32, 95%, 94%)', color: 'hsl(32, 95%, 35%)' }}
                        >
                          <BellOff size={14} />
                          {pushStatus === 'loading' ? 'Mengaktifkan...' : 'Aktifkan Notifikasi Browser'}
                        </button>
                      )}
                      {pushError && (
                        <p className="text-xs mt-1" style={{ color: 'hsl(0, 60%, 45%)' }}>
                          {pushError}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="max-h-80 overflow-y-auto">
                    {notifOrders.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <p className="text-2xl mb-1">📭</p>
                        <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>
                          Tidak ada pesanan baru
                        </p>
                      </div>
                    ) : (
                      notifOrders.map(order => (
                        <Link
                          key={order.id}
                          href={`/dashboard/orders/${order.id}`}
                          onClick={() => setNotifOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 border-b hover:bg-gray-50 transition-colors"
                          style={{ borderColor: 'hsl(36, 20%, 95%)' }}
                        >
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: 'hsl(36,80%,92%)', color: 'hsl(32,95%,40%)' }}>
                            <ShoppingBag size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: 'hsl(25, 30%, 20%)' }}>
                              {order.customer_name}
                            </p>
                            <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>
                              {order.order_number} · {formatDateTime(order.created_at)}
                            </p>
                          </div>
                          <span className="text-xs font-bold shrink-0" style={{ color: 'hsl(32, 95%, 40%)' }}>
                            {formatCurrency(order.total_amount)}
                          </span>
                        </Link>
                      ))
                    )}
                  </div>

                  <Link
                    href="/dashboard/orders"
                    onClick={() => setNotifOpen(false)}
                    className="block text-center py-2.5 text-xs font-semibold border-t hover:bg-gray-50 transition-colors"
                    style={{ borderColor: 'hsl(36, 20%, 92%)', color: 'hsl(32, 95%, 40%)' }}
                  >
                    Lihat Semua Pesanan
                  </Link>
                </div>
              </>
            )}
          </div>
        )}

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
  )
}
