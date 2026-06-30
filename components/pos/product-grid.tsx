'use client'

import Image from 'next/image'
import { useCart } from '@/contexts/cart-context'
import type { Product } from '@/types'
import { formatCurrency } from '@/lib/utils'

const categoryEmoji: Record<string, string> = {
  bread: '🍞', cake: '🎂', pastry: '🥐', cookies: '🍪', other: '🍰'
}

interface ProductGridProps {
  products: Product[]
}

export function ProductGrid({ products }: ProductGridProps) {
  const { addItem, items } = useCart()

  if (products.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm" style={{ color: 'hsl(var(--text-muted))' }}>Tidak ada produk ditemukan</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
        {products.map(product => {
          const p = product as Product & { current_stock: number }
          const inCart = items.find(i => i.product.id === p.id)
          const outOfStock = p.current_stock <= 0
          const emoji = categoryEmoji[p.category ?? ''] ?? '🧁'

          return (
            <button
              key={p.id}
              onClick={() => !outOfStock && addItem(p)}
              disabled={outOfStock}
              className="relative flex flex-col rounded-xl border text-left transition-all active:scale-95 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 overflow-hidden"
              style={{
                borderColor: outOfStock ? 'hsl(var(--danger-bg))' : inCart ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                background: outOfStock ? 'hsl(var(--danger-bg))' : inCart ? 'hsl(var(--primary-subtle))' : 'white',
              }}
            >
              {/* Badge qty in cart */}
              {inCart && !outOfStock && (
                <div
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white z-10"
                  style={{ background: 'hsl(var(--primary))' }}
                >
                  {inCart.quantity}
                </div>
              )}

              {/* Badge stok habis */}
              {outOfStock && (
                <div
                  className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-white z-10 font-bold"
                  style={{ background: 'hsl(var(--danger))', fontSize: '9px' }}
                >
                  Habis
                </div>
              )}

              {/* Gambar produk */}
              <div
                className="relative w-full"
                style={{
                  paddingTop: '70%',
                  background: outOfStock ? 'hsl(var(--danger-bg))' : inCart ? 'hsl(var(--text-muted))' : 'hsl(var(--primary-subtle))'
                }}
              >
                {p.image_url ? (
                  <Image
                    src={p.image_url}
                    alt={p.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-3xl">
                    {emoji}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-2 flex flex-col gap-0.5">
                <p className="text-xs font-semibold leading-tight line-clamp-2"
                  style={{ color: outOfStock ? 'hsl(var(--text-muted))' : 'hsl(var(--foreground))' }}>
                  {p.name}
                </p>
                <p className="text-sm font-bold"
                  style={{ color: outOfStock ? 'hsl(var(--border-strong))' : 'hsl(var(--primary))' }}>
                  {formatCurrency(p.selling_price)}
                </p>
                <p className="text-xs" style={{ color: outOfStock ? 'hsl(var(--danger))' : 'hsl(var(--success))' }}>
                  {outOfStock ? 'Stok habis' : `Stok: ${p.current_stock}`}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
