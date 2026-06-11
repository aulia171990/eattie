import type { Metadata } from 'next'
import { StoreNav } from '@/components/store/store-nav'
import { CartProvider } from '@/contexts/store-cart-context'

export const metadata: Metadata = {
  title: 'Eattie Bakery — Toko Online',
  description: 'Pesan roti dan kue segar langsung dari toko kami.',
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="min-h-screen" style={{ background: 'hsl(36, 33%, 97%)' }}>
        <StoreNav />
        <main className="max-w-5xl mx-auto px-4 pb-24">
          {children}
        </main>
        {/* Spacer for mobile bottom bar */}
        <div className="h-20 lg:h-0" />
      </div>
    </CartProvider>
  )
}
