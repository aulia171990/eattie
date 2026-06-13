import type { Metadata } from 'next'
import { StoreNav } from '@/components/store/store-nav'
import { CartProvider } from '@/contexts/store-cart-context'

export const metadata: Metadata = {
  title: 'Eattie — Premium Artisanal Cakes & Pastries',
  description: 'Pesan kue & pastry premium buatan tangan. Diantar ke seluruh Townsite.',
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {/* Load Playfair Display for serif headings */}
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap"
        rel="stylesheet"
      />
      <div className="min-h-screen" style={{ background: 'hsl(36, 33%, 97%)' }}>
        <StoreNav />
        <main>
          {children}
        </main>
        <div className="h-24 lg:h-0" />
      </div>
    </CartProvider>
  )
}
