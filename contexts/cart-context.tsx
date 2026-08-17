'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { Product } from '@/types'
import type { ConfigurableCartItem } from '@/types/product-config'

export interface CartItem {
  product: Product
  quantity: number
  subtotal: number
  // Unique cart id for variant/addon-aware dedup (computed)
  _cartId?: string
}

interface CartContextType {
  items: CartItem[]
  addItem: (product: Product) => void
  addConfigurableItem: (item: ConfigurableCartItem) => void
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

  const addConfigurableItem = useCallback((item: ConfigurableCartItem) => {
    const cartId = `${item.product_id}-${item.variant.variant_id}-${item.addons.map(a => a.addon_id).sort().join(',')}`
    setItems((prev) => {
      const existing = prev.find((i) => i._cartId === cartId)
      if (existing) {
        return prev.map((i) =>
          i._cartId === cartId
            ? { ...i, quantity: i.quantity + item.quantity, subtotal: i.subtotal + item.subtotal }
            : i
        )
      }
      // Build a synthetic Product for POS compatibility
      const synProduct: Product = {
        id: item.product_id,
        name: `${item.product_name} - ${item.variant.variant_name}`,
        name_en: null,
        description: null,
        category: null,
        selling_price: item.unit_price,
        cost_price: 0,
        current_stock: 99,
        min_stock: 0,
        image_url: item.product_image,
        is_active: true,
        is_available_online: false,
        online_description: null,
        online_sort_order: 0,
        category_id: null,
        is_featured: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      return [...prev, { product: synProduct, quantity: item.quantity, subtotal: item.subtotal, _cartId: cartId }]
    })
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => (i._cartId || i.product.id) !== productId))
  }, [])

  const updateQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => (i._cartId || i.product.id) !== productId))
      return
    }
    setItems((prev) =>
      prev.map((i) =>
        (i._cartId || i.product.id) === productId
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
        addConfigurableItem,
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
