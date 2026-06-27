'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useStoreCart } from '@/contexts/store-cart-context'
import { ShoppingBag, MapPin } from 'lucide-react'

export function StoreNav() {
  const pathname = usePathname()
  const { itemCount } = useStoreCart()
  const isHome = pathname === '/store'

  return (
    <nav className="sticky top-0 z-50 transition-all"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid hsl(36,25%,91%)',
      }}>
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">

        {/* Logo */}
        <Link href="/store" className="flex items-center gap-2 shrink-0" style={{ textDecoration: 'none' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
            style={{ background: 'hsl(32, 90%, 44%)' }}>
            🍞
          </div>
          <span style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
            fontSize: '1.1rem',
            color: 'hsl(25, 30%, 12%)',
            letterSpacing: '-0.3px',
          }}>
            Eattie
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {[
            { href: '/store', label: 'Beranda' },
            { href: '/store#katalog', label: 'Katalog' },
            { href: '/store/track', label: 'Lacak' },
          ].map(({ href, label }) => (
            <Link key={href} href={href} style={{
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: pathname === href ? 'hsl(32, 90%, 44%)' : 'hsl(25, 20%, 40%)',
              transition: 'color 0.15s',
            }}>
              {label}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <Link href="/store/track"
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl transition-colors hover:bg-orange-50"
            style={{ color: 'hsl(25, 20%, 50%)' }}>
            <MapPin size={17} />
          </Link>

          <Link href="/store/checkout"
            className="relative flex items-center gap-2 px-3 py-2 rounded-xl font-medium text-sm transition-all"
            style={{
              background: itemCount > 0 ? 'hsl(32, 90%, 44%)' : 'hsl(36, 30%, 93%)',
              color: itemCount > 0 ? 'white' : 'hsl(25, 20%, 45%)',
            }}>
            <ShoppingBag size={15} />
            <span className="hidden sm:inline text-xs font-semibold">Keranjang</span>
            {itemCount > 0 && (
              <span className="flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold"
                style={{ background: 'rgba(255,255,255,0.3)', color: 'white' }}>
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </nav>
  )
}
