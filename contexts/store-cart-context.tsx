'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import type { StoreProduct } from '@/actions/store'

export interface StoreCartItem {
  product: StoreProduct
  quantity: number
  notes?: string
}

interface CartContextType {
  items: StoreCartItem[]
  addItem: (product: StoreProduct, qty?: number) => void
  removeItem: (productId: string) => void
  updateQty: (productId: string, qty: number) => void
  clearCart: () => void
  itemCount: number
  total: number
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<StoreCartItem[]>([])

  const addItem = useCallback((product: StoreProduct, qty = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + qty }
            : i
        )
      }
      return [...prev, { product, quantity: qty }]
    })
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems(prev => prev.filter(i => i.product.id !== productId))
  }, [])

  const updateQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setItems(prev => prev.filter(i => i.product.id !== productId))
    } else {
      setItems(prev =>
        prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i)
      )
    }
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const itemCount = items.reduce((s, i) => s + i.quantity, 0)
  const total = items.reduce((s, i) => s + i.product.selling_price * i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, itemCount, total }}>
      {children}
    </CartContext.Provider>
  )
}

export function useStoreCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useStoreCart must be used within CartProvider')
  return ctx
}
