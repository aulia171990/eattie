'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import type { StoreProduct } from '@/actions/store'
import type { ConfigurableCartItem, CartVariantPick, CartAddonPick } from '@/types/product-config'
import { useToast } from '@/contexts/toast-context'

export interface StoreCartItem {
  id: string // unique ID for cart item (product_id + variant_id + addon_ids)
  product_id: string
  product_name: string
  product_image: string | null
  variant: CartVariantPick
  addons: CartAddonPick[]
  quantity: number
  unit_price: number   // variant_price + addons sum
  subtotal: number     // unit_price * qty
}

interface CartContextType {
  items: StoreCartItem[]
  addConfigurableItem: (item: ConfigurableCartItem) => void
  addItem: (product: StoreProduct, qty?: number) => void
  removeItem: (id: string) => void
  updateQty: (id: string, qty: number) => void
  clearCart: () => void
  itemCount: number
  total: number
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<StoreCartItem[]>([])
  const { addToast } = useToast()

  const addConfigurableItem = useCallback((item: ConfigurableCartItem) => {
    const id = `${item.product_id}-${item.variant.variant_id}-${item.addons.map(a => a.addon_id).sort().join(',')}`
    setItems(prev => {
      const existing = prev.find((i) => i.id === id)
      if (existing) {
        const mergedQty = existing.quantity + item.quantity
        return prev.map((i) =>
          i.id === id
            ? { ...i, quantity: mergedQty, subtotal: i.unit_price * mergedQty }
            : i
        )
      }
      addToast(`${item.product_name} ditambahkan ke keranjang`, 'success')
      return [...prev, { ...item, id }]
    })
  }, [addToast])

  const addItem = useCallback((product: StoreProduct, qty = 1) => {
    addConfigurableItem({
      product_id: product.id,
      product_name: product.name,
      product_image: product.image_url,
      variant: { variant_id: 'default', variant_name: 'Standard', variant_price: product.selling_price },
      addons: [],
      quantity: qty,
      unit_price: product.selling_price,
      subtotal: product.selling_price * qty,
    })
  }, [addConfigurableItem])

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const updateQty = useCallback((id: string, qty: number) => {
    if (qty <= 0) {
      setItems(prev => prev.filter(i => i.id !== id))
    } else {
      setItems(prev =>
        prev.map(i => i.id === id ? { ...i, quantity: qty, subtotal: i.unit_price * qty } : i)
      )
    }
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const itemCount = items.reduce((s, i) => s + i.quantity, 0)
  const total = items.reduce((s, i) => s + i.subtotal, 0)

  return (
    <CartContext.Provider value={{ items, addItem, addConfigurableItem, removeItem, updateQty, clearCart, itemCount, total }}>
      {children}
    </CartContext.Provider>
  )
}

export function useStoreCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useStoreCart must be used within CartProvider')
  return ctx
}
