'use client'

import { useState, useEffect } from 'react'
import { ProductGrid } from './product-grid'
import { Cart } from './cart'
import { PaymentDialog } from './payment-dialog'
import { useCart } from '@/contexts/cart-context'
import type { Product } from '@/types'
import Link from 'next/link'
import { ArrowLeft, Clock } from 'lucide-react'

interface PosInterfaceProps {
  products: Product[]
  cashierName: string
}

export function PosInterface({ products, cashierName }: PosInterfaceProps) {
  const { items, clearCart } = useCart()
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [lastSale, setLastSale] = useState<{ invoiceNumber: string; total: number } | null>(null)
  const [time, setTime] = useState(new Date())
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const handleSaleComplete = (invoiceNumber: string, total: number) => {
    setLastSale({ invoiceNumber, total })
    setPaymentOpen(false)
    clearCart()
  }

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))] as string[]

  const filteredProducts = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    const matchCategory = activeCategory === 'all' || p.category === activeCategory
    return matchSearch && matchCategory
  })

  const categoryEmoji: Record<string, string> = {
    all: '🧁', bread: '🍞', cake: '🎂', pastry: '🥐', cookies: '🍪', other: '🍰'
  }
  const categoryLabel: Record<string, string> = {
    all: 'Semua', bread: 'Roti', cake: 'Kue', pastry: 'Pastri', cookies: 'Kue Kering', other: 'Lainnya'
  }

  return (
    <>
      {/* POS Header */}
      <header className="h-12 flex items-center justify-between px-4 shrink-0 border-b"
        style={{ background: 'hsl(25, 30%, 12%)', borderColor: 'hsl(25, 20%, 20%)' }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-base"
            style={{ background: 'hsl(32, 95%, 44%)' }}>🍞</div>
          <span className="text-white font-semibold text-sm">Bakery POS</span>
        </div>

        <div className="flex items-center gap-2 text-xs" style={{ color: 'hsl(32, 80%, 70%)' }}>
          <Clock size={13} />
          {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          <span className="ml-2" style={{ color: 'hsl(36, 20%, 55%)' }}>| {cashierName}</span>
        </div>

        <Link href="/dashboard"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{ background: 'hsl(25, 20%, 22%)', color: 'hsl(36, 20%, 75%)' }}>
          <ArrowLeft size={13} /> Dashboard
        </Link>
      </header>

      {/* POS Body */}
      <div className="flex flex-1 min-h-0 gap-0">
        {/* Left — Product Grid */}
        <div className="flex-1 flex flex-col min-w-0 border-r" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
          {/* Search + Category Filter */}
          <div className="p-3 border-b bg-white shrink-0" style={{ borderColor: 'hsl(36, 20%, 90%)' }}>
            <input
              type="text"
              placeholder="🔍  Cari produk..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none mb-2"
              style={{ borderColor: 'hsl(36, 20%, 85%)', background: 'hsl(36, 20%, 98%)' }}
            />
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all"
                  style={activeCategory === cat
                    ? { background: 'hsl(32, 95%, 44%)', color: 'white' }
                    : { background: 'hsl(36, 20%, 93%)', color: 'hsl(25, 15%, 45%)' }
                  }>
                  {categoryEmoji[cat] ?? '🧁'} {categoryLabel[cat] ?? cat}
                </button>
              ))}
            </div>
          </div>

          <ProductGrid products={filteredProducts} />
        </div>

        {/* Right — Cart */}
        <div className="w-80 xl:w-96 flex flex-col bg-white shrink-0">
          <Cart onCheckout={() => setPaymentOpen(true)} />
        </div>
      </div>

      {/* Success toast */}
      {lastSale && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white z-50 flex items-center gap-3"
          style={{ background: 'hsl(142, 60%, 40%)' }}
          onClick={() => setLastSale(null)}
        >
          ✓ Transaksi {lastSale.invoiceNumber} berhasil
          <span className="text-xs opacity-80">(klik untuk tutup)</span>
        </div>
      )}

      {/* Payment modal */}
      {paymentOpen && (
        <PaymentDialog
          onClose={() => setPaymentOpen(false)}
          onSuccess={handleSaleComplete}
        />
      )}
    </>
  )
}
