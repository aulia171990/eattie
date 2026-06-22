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
        <p className="text-sm" style={{ color: 'hsl(25, 15%, 55%)' }}>Tidak ada produk ditemukan</p>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3" style={{ WebkitOverflowScrolling: 'touch' }}>
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
                borderColor: outOfStock ? 'hsl(0, 40%, 85%)' : inCart ? 'hsl(32, 95%, 44%)' : 'hsl(36, 20%, 88%)',
                background: outOfStock ? 'hsl(0, 30%, 97%)' : inCart ? 'hsl(36, 80%, 97%)' : 'white',
              }}
            >
              {/* Badge qty in cart */}
              {inCart && !outOfStock && (
                <div
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white z-10"
                  style={{ background: 'hsl(32, 95%, 44%)' }}
                >
                  {inCart.quantity}
                </div>
              )}

              {/* Badge stok habis */}
              {outOfStock && (
                <div
                  className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-white z-10 font-bold"
                  style={{ background: 'hsl(0, 70%, 50%)', fontSize: '9px' }}
                >
                  Habis
                </div>
              )}

              {/* Gambar produk */}
              <div
                className="relative w-full"
                style={{
                  paddingTop: '70%',
                  background: outOfStock ? 'hsl(0, 20%, 92%)' : inCart ? 'hsl(32, 60%, 90%)' : 'hsl(36, 80%, 93%)'
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
                  style={{ color: outOfStock ? 'hsl(25, 10%, 55%)' : 'hsl(25, 30%, 15%)' }}>
                  {p.name}
                </p>
                <p className="text-sm font-bold"
                  style={{ color: outOfStock ? 'hsl(25, 10%, 60%)' : 'hsl(32, 95%, 40%)' }}>
                  {formatCurrency(p.selling_price)}
                </p>
                <p className="text-xs" style={{ color: outOfStock ? 'hsl(0, 60%, 55%)' : 'hsl(142, 50%, 40%)' }}>
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
