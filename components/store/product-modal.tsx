'use client'

import { useState, useEffect } from 'react'
import { useStoreCart } from '@/contexts/store-cart-context'
import type { StoreProduct } from '@/actions/store'
import { formatCurrency } from '@/lib/utils'
import { X, Plus, Minus, ShoppingBag, Check } from 'lucide-react'

const CAT_EMOJI: Record<string, string> = {
  Kue: '🎂', Roti: '🍞', Pastri: '🥐', Cookies: '🍪',
  cake: '🎂', bread: '🍞', pastry: '🥐', healthy: '🌿', hampers: '🎁',
}

interface ProductModalProps {
  product: StoreProduct | null
  onClose: () => void
}

export function ProductModal({ product, onClose }: ProductModalProps) {
  const { items, addItem, updateQty } = useStoreCart()
  const [added, setAdded] = useState(false)

  const cartItem = product ? items.find(i => i.product.id === product.id) : null
  const qty = cartItem?.quantity ?? 0

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (product) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [product])

  if (!product) return null

  const handleAdd = () => {
    if (qty === 0) addItem(product)
    else updateQty(product.id, qty + 1)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  const description = product.online_description || product.description

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 transition-opacity duration-200"
        style={{ background: 'rgba(20, 14, 10, 0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Modal — slides up from bottom on mobile */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 lg:inset-0 lg:flex lg:items-center lg:justify-center lg:p-4"
        style={{ pointerEvents: 'none' }}
      >
        <div
          className="relative w-full lg:max-w-lg bg-white lg:rounded-3xl overflow-hidden"
          style={{
            maxHeight: '92dvh',
            borderRadius: '28px 28px 0 0',
            pointerEvents: 'auto',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
          }}
        >
          {/* Drag handle (mobile) */}
          <div className="lg:hidden flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full" style={{ background: 'hsl(var(--border))' }} />
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)' }}
          >
            <X size={16} style={{ color: 'white' }} />
          </button>

          {/* Scrollable content */}
          <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: '90dvh' }}>

            {/* Product image */}
            <div className="relative w-full" style={{ aspectRatio: '4/3', background: 'hsl(var(--surface-raised))' }}>
              {product.image_url
                ? <img src={product.image_url} alt={product.name}
                    className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-8xl select-none">
                    {CAT_EMOJI[product.category ?? ''] ?? '🧁'}
                  </div>
              }

              {/* Category badge */}
              {product.category && (
                <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    background: 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(8px)',
                    color: 'hsl(var(--primary))',
                  }}>
                  {CAT_EMOJI[product.category] ?? '•'} {product.category}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="px-5 pt-4 pb-6 space-y-4">

              {/* Name + price */}
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-bold leading-tight flex-1"
                  style={{
                    fontFamily: '"Playfair Display", serif',
                    color: 'hsl(var(--foreground))',
                  }}>
                  {product.name}
                </h2>
                <span className="text-xl font-extrabold shrink-0"
                  style={{ color: 'hsl(var(--primary))' }}>
                  {formatCurrency(product.selling_price)}
                </span>
              </div>

              {/* Description */}
              {description && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'hsl(var(--text-muted))' }}>
                    Deskripsi
                  </p>
                  <p className="text-sm leading-relaxed"
                    style={{ color: 'hsl(var(--text-secondary))' }}>
                    {description}
                  </p>
                </div>
              )}

              {/* Divider */}
              <div className="h-px" style={{ background: 'hsl(var(--border))' }} />

              {/* Qty + Add to cart */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-secondary))' }}>
                    Jumlah
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => qty > 0 && updateQty(product.id, qty - 1)}
                      disabled={qty === 0}
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-bold transition-all disabled:opacity-30"
                      style={{ background: 'hsl(var(--border))', color: 'hsl(var(--text-secondary))' }}>
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-lg font-bold"
                      style={{ color: 'hsl(var(--foreground))' }}>
                      {qty}
                    </span>
                    <button
                      onClick={handleAdd}
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-bold transition-all active:scale-95"
                      style={{ background: 'hsl(var(--primary))', color: 'white' }}>
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Add to cart button */}
                <button
                  onClick={() => {
                    if (qty === 0) handleAdd()
                    onClose()
                  }}
                  className="w-full py-4 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  style={{ background: added ? 'hsl(var(--success))' : 'hsl(var(--primary))' }}>
                  {added
                    ? <><Check size={16} /> Ditambahkan ke Keranjang</>
                    : <><ShoppingBag size={16} /> {qty > 0 ? `Perbarui Keranjang (${qty})` : 'Tambah ke Keranjang'}</>
                  }
                </button>

                {qty > 0 && (
                  <p className="text-center text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
                    Subtotal: {formatCurrency(product.selling_price * qty)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
