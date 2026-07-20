'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useBranding } from '@/contexts/branding-context'
import type { Profile } from '@/types'
import { LayoutDashboard, Package, ShoppingBag, BookOpen, Factory, Receipt, BarChart3, Briefcase, Settings, ShoppingCart, AlertTriangle, X, ClipboardList, Cake, Users, Star } from 'lucide-react'

type NavItem = {
  title: string
  href: string
  icon: React.ReactNode
  roles: Array<'owner' | 'cashier' | 'baker'>
  children?: { title: string; href: string }[]
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={18} />, roles: ['owner', 'cashier', 'baker'] },
  { title: 'Inventory', href: '/dashboard/inventory', icon: <Package size={18} />, roles: ['owner'],
    children: [
      { title: 'Bahan Baku', href: '/dashboard/inventory' },
      { title: 'Pembelian', href: '/dashboard/inventory/purchases' },
      { title: 'Pergerakan Stok', href: '/dashboard/inventory/movements' },
      { title: 'Stock Opname', href: '/dashboard/inventory/opname' },
      { title: 'Supplier', href: '/dashboard/inventory/suppliers' },
    ]},
  { title: 'Produk', href: '/dashboard/products', icon: <ShoppingBag size={18} />, roles: ['owner'] },
  { title: 'Resep', href: '/dashboard/recipes', icon: <BookOpen size={18} />, roles: ['owner'] },
  { title: 'Produksi', href: '/dashboard/production', icon: <Factory size={18} />, roles: ['owner', 'baker'] },
  { title: 'Penjualan', href: '/dashboard/sales', icon: <Receipt size={18} />, roles: ['owner', 'cashier'] },
  { title: 'Pesanan Online', href: '/dashboard/orders', icon: <ClipboardList size={18} />, roles: ['owner'] },
  { title: 'Custom Cake', href: '/dashboard/custom-cakes', icon: <Cake size={18} />, roles: ['owner'] },
  { title: 'Pelanggan', href: '/dashboard/customers', icon: <Users size={18} />, roles: ['owner'] },
  { title: 'Ulasan', href: '/dashboard/reviews', icon: <Star size={18} />, roles: ['owner'] },
  { title: 'Laporan', href: '/dashboard/reports', icon: <BarChart3 size={18} />, roles: ['owner'] },
  { title: 'Pengeluaran', href: '/dashboard/expenses', icon: <Briefcase size={18} />, roles: ['owner'] },
  { title: 'Pengaturan', href: '/dashboard/settings', icon: <Settings size={18} />, roles: ['owner', 'cashier', 'baker'],
    children: [
      { title: 'Umum', href: '/dashboard/settings' },
      { title: 'Toko', href: '/dashboard/settings/store' },
      { title: 'Pengguna', href: '/dashboard/settings/users' },
      { title: 'Profil', href: '/dashboard/settings/profile' },
    ]},
]

interface SidebarProps {
  user: Profile
  lowStockCount?: number
  open?: boolean
  onClose?: () => void
}

function SidebarContent({ user, lowStockCount = 0, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { logoIconUrl, shortName } = useBranding()
  const filtered = navItems.filter(item => item.roles.includes(user.role))
  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <aside className="sidebar flex flex-col h-full w-64 shrink-0">
      <div className="flex items-center justify-between px-5 py-5 border-b" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoIconUrl || '/branding/logo-icon-white.svg'} alt={shortName} width={36} height={36} style={{ objectFit: 'contain' }} />
            </div>
          <div className="min-w-0">
            <div className="text-white font-semibold text-sm truncate">{shortName} Manager</div>
            <div className="text-xs truncate" style={{ color: 'hsl(var(--text-muted))' }}>Manajemen Toko Roti</div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X size={18} className="text-white" />
          </button>
        )}
      </div>

      {lowStockCount > 0 && user.role === 'owner' && (
        <Link href="/dashboard/inventory?filter=low_stock" onClick={onClose}
          className="flex items-center gap-2 mx-3 mt-3 px-3 py-2 rounded-lg text-xs"
          style={{ background: 'hsl(var(--text-muted))', color: 'hsl(var(--text-muted))' }}>
          <AlertTriangle size={14} />
          <span className="flex-1">{lowStockCount} bahan stok rendah</span>
          <span className="font-bold">{lowStockCount}</span>
        </Link>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {filtered.map(item => {
          const active = isActive(item.href)
          return (
            <div key={item.href}>
              <Link href={item.href} onClick={onClose} className={cn('sidebar-item', active && 'active')}>
                <span className="shrink-0">{item.icon}</span>
                <span className="flex-1 truncate">{item.title}</span>
              </Link>
              {item.children && active && (
                <div className="ml-7 mt-0.5 mb-1 space-y-0.5">
                  {item.children.map(child => (
                    <Link key={child.href} href={child.href} onClick={onClose}
                      className="block px-3 py-1.5 rounded-md text-xs transition-all"
                      style={{
                        color: pathname === child.href ? 'white' : 'hsl(var(--text-muted))',
                        background: pathname === child.href ? 'hsl(var(--foreground))' : 'transparent',
                      }}>
                      {child.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {(user.role === 'owner' || user.role === 'cashier') && (
        <div className="px-3 py-2 border-t" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
          <Link href="/pos" onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ background: 'hsl(var(--primary))' }}>
            <ShoppingCart size={18} />
            <span>Buka POS Kasir</span>
          </Link>
        </div>
      )}

      <div className="px-3 pb-4 pt-2 border-t" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: 'hsl(var(--text-muted))', color: 'hsl(var(--text-muted))' }}>
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white text-xs font-medium truncate">{user.full_name}</div>
            <div className="text-xs truncate capitalize" style={{ color: 'hsl(var(--text-muted))' }}>
              {user.role === 'owner' ? 'Pemilik' : user.role === 'cashier' ? 'Kasir' : 'Baker'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

export function Sidebar({ user, lowStockCount = 0, onClose }: SidebarProps) {
  return <SidebarContent user={user} lowStockCount={lowStockCount} onClose={onClose} />
}
