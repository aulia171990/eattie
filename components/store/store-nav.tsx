'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingBag, MapPin } from 'lucide-react'
import { useStoreCart } from '@/contexts/store-cart-context'

export function StoreNav() {
  const pathname = usePathname()
  const { itemCount } = useStoreCart()

  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur-md"
      style={{ borderColor: 'hsl(36, 30%, 88%)' }}>
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/store" className="flex items-center gap-1 group shrink-0">
          <span className="font-serif text-2xl font-bold tracking-tight transition-colors"
            style={{ color: 'hsl(25, 30%, 12%)', fontFamily: '"Playfair Display", serif' }}>
            Eattie
          </span>
          <span className="text-2xl font-bold" style={{ color: 'hsl(32, 90%, 44%)' }}>.</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {[
            { href: '/store', label: 'Katalog' },
            { href: '/store/track', label: 'Lacak Pesanan' },
          ].map(({ href, label }) => (
            <Link key={href} href={href}
              className="transition-colors"
              style={{
                color: pathname === href ? 'hsl(32, 90%, 44%)' : 'hsl(25, 20%, 40%)',
                fontWeight: pathname === href ? 600 : 500,
              }}>
              {label}
            </Link>
          ))}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* Mobile: track */}
          <Link href="/store/track"
            className="p-2 rounded-full md:hidden transition-colors hover:bg-orange-50"
            style={{ color: 'hsl(25, 20%, 45%)' }}>
            <MapPin size={18} />
          </Link>

          {/* Cart */}
          <Link href="/store/checkout"
            className="relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all"
            style={{
              background: itemCount > 0 ? 'hsl(32, 90%, 44%)' : 'hsl(36, 30%, 93%)',
              color: itemCount > 0 ? 'white' : 'hsl(25, 25%, 35%)',
            }}>
            <ShoppingBag size={16} />
            <span className="hidden sm:inline">Keranjang</span>
            {itemCount > 0 && (
              <span className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
                style={{ background: 'rgba(255,255,255,0.3)', color: 'white' }}>
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
