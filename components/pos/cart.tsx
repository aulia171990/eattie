'use client'

import { useState } from 'react'
import { useCart } from '@/contexts/cart-context'
import { formatCurrency } from '@/lib/utils'
import { Minus, Plus, Trash2, Tag, ShoppingCart } from 'lucide-react'

interface CartProps {
  onCheckout: () => void
}

export function Cart({ onCheckout }: CartProps) {
  const {
    items, updateQty, removeItem, clearCart,
    subtotal, discountPercent, discountAmount,
    setDiscountPercent, setDiscountAmount,
    total, itemCount,
  } = useCart()

  const [discountMode, setDiscountMode] = useState<'percent' | 'amount'>('percent')
  const [discountInput, setDiscountInput] = useState('')
  const [showDiscount, setShowDiscount] = useState(false)

  const applyDiscount = () => {
    const val = parseFloat(discountInput) || 0
    if (discountMode === 'percent') {
      setDiscountPercent(Math.min(100, val))
    } else {
      setDiscountAmount(Math.min(subtotal, val))
    }
    setShowDiscount(false)
    setDiscountInput('')
  }

  const removeDiscount = () => {
    setDiscountPercent(0)
    setDiscountAmount(0)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Cart header */}
      <div className="px-4 py-3 border-b flex items-center justify-between shrink-0"
        style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="flex items-center gap-2">
          <ShoppingCart size={16} style={{ color: 'hsl(var(--primary))' }} />
          <span className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>
            Keranjang
          </span>
          {itemCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-xs font-bold text-white"
              style={{ background: 'hsl(var(--primary))' }}>
              {itemCount}
            </span>
          )}
        </div>
        {items.length > 0 && (
          <button onClick={clearCart} className="text-xs hover:underline"
            style={{ color: 'hsl(var(--danger))' }}>
            Kosongkan
          </button>
        )}
      </div>

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <div className="text-4xl mb-3">🛒</div>
            <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>
              Keranjang kosong
            </p>
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-muted))' }}>
              Pilih produk di sebelah kiri
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
            {items.map(item => (
              <div key={item.product.id} className="px-4 py-3 flex items-center gap-3">
                {/* Product info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'hsl(var(--foreground))' }}>
                    {item.product.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-muted))' }}>
                    {formatCurrency(item.product.selling_price)} / pcs
                  </p>
                </div>

                {/* Qty controls */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => updateQty(item.product.id, item.quantity - 1)}
                    className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:opacity-80"
                    style={{ background: 'hsl(var(--border))', color: 'hsl(var(--text-secondary))' }}>
                    <Minus size={11} />
                  </button>
                  <span className="w-7 text-center text-sm font-semibold"
                    style={{ color: 'hsl(var(--foreground))' }}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQty(item.product.id, item.quantity + 1)}
                    className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:opacity-80"
                    style={{ background: 'hsl(var(--primary))', color: 'white' }}>
                    <Plus size={11} />
                  </button>
                </div>

                {/* Subtotal + delete */}
                <div className="text-right shrink-0 w-20">
                  <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                    {formatCurrency(item.subtotal)}
                  </p>
                  <button onClick={() => removeItem(item.product.id)}
                    className="mt-0.5 hover:opacity-70 transition-opacity"
                    style={{ color: 'hsl(0, 70%, 60%)' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary + checkout */}
      {items.length > 0 && (
        <div className="border-t shrink-0" style={{ borderColor: 'hsl(var(--border))' }}>
          {/* Discount section */}
          <div className="px-4 py-3 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
            {discountAmount > 0 ? (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs"
                  style={{ color: 'hsl(var(--success))' }}>
                  <Tag size={12} />
                  Diskon {discountPercent > 0 ? `${discountPercent}%` : ''}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: 'hsl(var(--success))' }}>
                    -{formatCurrency(discountAmount)}
                  </span>
                  <button onClick={removeDiscount} className="text-xs hover:underline"
                    style={{ color: 'hsl(var(--danger))' }}>
                    Hapus
                  </button>
                </div>
              </div>
            ) : showDiscount ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setDiscountMode('percent')}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all"
                    style={discountMode === 'percent'
                      ? { background: 'hsl(var(--primary))', color: 'white', borderColor: 'transparent' }
                      : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-muted))' }}>
                    Persen (%)
                  </button>
                  <button
                    onClick={() => setDiscountMode('amount')}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all"
                    style={discountMode === 'amount'
                      ? { background: 'hsl(var(--primary))', color: 'white', borderColor: 'transparent' }
                      : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-muted))' }}>
                    Nominal (Rp)
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={discountInput}
                    onChange={e => setDiscountInput(e.target.value)}
                    placeholder={discountMode === 'percent' ? 'Contoh: 10' : 'Contoh: 5000'}
                    className="flex-1 px-3 py-1.5 rounded-lg border text-sm outline-none"
                    style={{ borderColor: 'hsl(var(--border))' }}
                    onKeyDown={e => e.key === 'Enter' && applyDiscount()}
                    autoFocus
                  />
                  <button onClick={applyDiscount}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                    style={{ background: 'hsl(var(--success))' }}>
                    OK
                  </button>
                  <button onClick={() => setShowDiscount(false)}
                    className="px-3 py-1.5 rounded-lg text-xs border"
                    style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-muted))' }}>
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDiscount(true)}
                className="flex items-center gap-1.5 text-xs hover:underline"
                style={{ color: 'hsl(var(--primary))' }}>
                <Tag size={12} /> Tambah Diskon
              </button>
            )}
          </div>

          {/* Totals */}
          <div className="px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span style={{ color: 'hsl(var(--text-muted))' }}>Subtotal</span>
              <span style={{ color: 'hsl(var(--text-secondary))' }}>{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span style={{ color: 'hsl(var(--success))' }}>Diskon</span>
                <span style={{ color: 'hsl(var(--success))' }}>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t"
              style={{ borderColor: 'hsl(var(--border))' }}>
              <span className="font-bold text-base" style={{ color: 'hsl(var(--foreground))' }}>Total</span>
              <span className="font-bold text-xl" style={{ color: 'hsl(var(--primary))' }}>
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          {/* Checkout button */}
          <div className="px-4 pb-4">
            <button
              onClick={onCheckout}
              className="w-full py-3.5 rounded-xl font-bold text-white text-base transition-all active:scale-98 hover:opacity-90 shadow-sm"
              style={{ background: 'hsl(var(--primary))' }}>
              💳 Bayar {formatCurrency(total)}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
