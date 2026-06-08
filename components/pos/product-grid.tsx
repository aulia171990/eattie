'use client'

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
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
        {products.map(product => {
          const inCart = items.find(i => i.product.id === product.id)
          const outOfStock = product.current_stock <= 0
          return (
            <button
              key={product.id}
              onClick={() => !outOfStock && addItem(product)}
              disabled={outOfStock}
              className="relative flex flex-col items-center p-3 rounded-xl border text-left transition-all active:scale-95 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                borderColor: outOfStock ? 'hsl(0, 40%, 85%)' : inCart ? 'hsl(32, 95%, 44%)' : 'hsl(36, 20%, 88%)',
                background: outOfStock ? 'hsl(0, 30%, 97%)' : inCart ? 'hsl(36, 80%, 97%)' : 'white',
              }}
            >
              {/* Badge qty in cart */}
              {inCart && !outOfStock && (
                <div
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white z-10"
                  style={{ background: 'hsl(32, 95%, 44%)' }}
                >
                  {inCart.quantity}
                </div>
              )}

              {/* Badge stok habis */}
              {outOfStock && (
                <div
                  className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold text-white z-10"
                  style={{ background: 'hsl(0, 70%, 50%)', fontSize: '9px' }}
                >
                  Habis
                </div>
              )}

              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-2 shrink-0"
                style={{ background: outOfStock ? 'hsl(0, 20%, 92%)' : inCart ? 'hsl(32, 80%, 90%)' : 'hsl(36, 80%, 93%)' }}
              >
                {categoryEmoji[product.category ?? ''] ?? '🧁'}
              </div>

              <p className="text-xs font-semibold text-center leading-tight w-full line-clamp-2"
                style={{ color: outOfStock ? 'hsl(25, 10%, 55%)' : 'hsl(25, 30%, 15%)' }}>
                {product.name}
              </p>

              <p className="text-sm font-bold mt-1.5"
                style={{ color: outOfStock ? 'hsl(25, 10%, 60%)' : 'hsl(32, 95%, 40%)' }}>
                {formatCurrency(product.selling_price)}
              </p>

              <p className="text-xs mt-0.5"
                style={{ color: outOfStock ? 'hsl(0, 60%, 55%)' : 'hsl(142, 50%, 40%)' }}>
                {outOfStock ? 'Stok habis' : `Stok: ${product.current_stock}`}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
