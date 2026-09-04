import type { Metadata } from 'next'
import { StoreNav } from '@/components/store/store-nav'
import { StoreFooter } from '@/components/store/store-footer'
import { CartProvider } from '@/contexts/store-cart-context'
import { getStoreSettings } from '@/actions/store-settings'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStoreSettings()
  const name = settings?.short_name ?? settings?.company_name ?? 'Bakery'
  const tagline = settings?.tagline ?? 'Fresh Bread & Cakes, Made to Order'

  return {
    title: `${name} — ${tagline}`,
    description: tagline,
  }
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {/* Load Playfair Display for serif headings */}
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap"
        rel="stylesheet"
      />
      <div className="min-h-screen" style={{ background: 'hsl(var(--background))' }}>
        <StoreNav />
        <main>
          {children}
        </main>
        <StoreFooter />
        <div className="h-24 lg:h-0" />
      </div>
    </CartProvider>
  )
}
