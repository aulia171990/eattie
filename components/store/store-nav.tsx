'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingBag, MapPin, Search } from 'lucide-react'
import { useStoreCart } from '@/contexts/store-cart-context'

export function StoreNav() {
  const pathname = usePathname()
  const { itemCount } = useStoreCart()

  return (
    <header
      className="sticky top-0 z-40 border-b"
      style={{ background: 'hsl(25, 30%, 10%)', borderColor: 'hsl(25, 20%, 18%)' }}
    >
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link href="/store" className="flex items-center gap-2 shrink-0">
          <span className="text-xl">🍞</span>
          <span className="font-bold text-sm text-white hidden sm:block">Eattie Bakery</span>
        </Link>

        {/* Center nav - desktop */}
        <nav className="hidden md:flex items-center gap-1">
          {[
            { href: '/store', label: 'Beranda' },
            { href: '/store/track', label: 'Lacak Order' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                color: pathname === href ? 'white' : 'hsl(36, 20%, 65%)',
                background: pathname === href ? 'hsl(25, 20%, 20%)' : 'transparent',
              }}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/store/track"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium md:hidden transition-colors"
            style={{ color: 'hsl(36, 20%, 65%)' }}
          >
            <MapPin size={14} />
          </Link>

          <Link
            href="/store/checkout"
            className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: itemCount > 0 ? 'hsl(32, 95%, 44%)' : 'hsl(25, 20%, 20%)',
              color: 'white',
            }}
          >
            <ShoppingBag size={15} />
            <span className="hidden sm:inline">Keranjang</span>
            {itemCount > 0 && (
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center font-bold"
                style={{ background: 'white', color: 'hsl(32, 95%, 44%)', fontSize: '10px' }}
              >
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
