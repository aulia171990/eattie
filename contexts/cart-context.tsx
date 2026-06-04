'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { Product } from '@/types'

export interface CartItem {
  product: Product
  quantity: number
  subtotal: number
}

interface CartContextType {
  items: CartItem[]
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  updateQty: (productId: string, qty: number) => void
  clearCart: () => void
  subtotal: number
  discountPercent: number
  discountAmount: number
  setDiscountPercent: (v: number) => void
  setDiscountAmount: (v: number) => void
  total: number
  itemCount: number
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [discountPercent, setDiscountPercentState] = useState(0)
  const [discountAmount, setDiscountAmountState] = useState(0)

  const addItem = useCallback((product: Product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                subtotal: (i.quantity + 1) * i.product.selling_price,
              }
            : i
        )
      }
      return [...prev, { product, quantity: 1, subtotal: product.selling_price }]
    })
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId))
  }, [])

  const updateQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.product.id !== productId))
      return
    }
    setItems((prev) =>
      prev.map((i) =>
        i.product.id === productId
          ? { ...i, quantity: qty, subtotal: qty * i.product.selling_price }
          : i
      )
    )
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    setDiscountPercentState(0)
    setDiscountAmountState(0)
  }, [])

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0)

  const setDiscountPercent = (v: number) => {
    setDiscountPercentState(v)
    setDiscountAmountState(0)
  }

  const setDiscountAmount = (v: number) => {
    setDiscountAmountState(v)
    setDiscountPercentState(0)
  }

  const computedDiscount =
    discountPercent > 0 ? (subtotal * discountPercent) / 100 : discountAmount

  const total = Math.max(0, subtotal - computedDiscount)

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQty,
        clearCart,
        subtotal,
        discountPercent,
        discountAmount: computedDiscount,
        setDiscountPercent,
        setDiscountAmount,
        total,
        itemCount: items.reduce((s, i) => s + i.quantity, 0),
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextType {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
