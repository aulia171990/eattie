'use client'

import { useState, useEffect } from 'react'
import { useCart } from '@/contexts/cart-context'
import { getProductDetail } from '@/actions/store' // Reusing store's getProductDetail
import type { StoreProductDetail, ProductVariant, ProductAddon } from '@/types/product-config'
import { formatCurrency } from '@/lib/utils'
import { X, Plus, Minus, Loader } from 'lucide-react'

interface Props {
  productId: string | null
  onClose: () => void
}

export function PosProductConfiguratorModal({ productId, onClose }: Props) {
  const { addConfigurableItem } = useCart() // useCart from POS context
  const [product, setProduct] = useState<StoreProductDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set())
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (!productId) {
      setProduct(null)
      return
    }
    setLoading(true)
    getProductDetail(productId).then(p => {
      setProduct(p)
      // If no variants, use a dummy one for consistent logic
      setSelectedVariant(p?.variants.length ? p.variants[0] : { id: 'default', name: 'Standard', price: p?.min_price ?? 0, product_id: productId, sort_order: 0, is_active: true, created_at: '', updated_at: '' })
      setSelectedAddons(new Set())
      setQuantity(1)
      setLoading(false)
    })
  }, [productId])

  if (!productId || !product) return null

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
        <div className="bg-white rounded-lg w-full max-w-sm p-6 text-center">
          <Loader className="animate-spin mx-auto" size={24} />
        </div>
      </div>
    )
  }

  const basePrice = product.min_price // Fallback if no variants
  const variantPrice = selectedVariant?.price ?? basePrice
  const addonList = product.addons.filter(a => selectedAddons.has(a.id))
  const totalPrice = variantPrice + addonList.reduce((acc, a) => acc + a.price, 0)
  const finalPrice = totalPrice * quantity

  const handleAdd = () => {
    if (!selectedVariant) return // Should not happen with default variant logic

    addConfigurableItem({
      product_id: product.id,
      product_name: product.name,
      product_image: product.image_url,
      variant: {
        variant_id: selectedVariant.id,
        variant_name: selectedVariant.name,
        variant_price: selectedVariant.price,
      },
      addons: addonList.map(a => ({ addon_id: a.id, name: a.name, price: a.price })),
      quantity,
      unit_price: totalPrice,
      subtotal: finalPrice,
    })
    onClose()
  }

  const toggleAddon = (addonId: string) => {
    const next = new Set(selectedAddons)
    if (next.has(addonId)) next.delete(addonId)
    else next.add(addonId)
    setSelectedAddons(next)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-lg w-full max-w-sm p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-lg">{product.name}</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        {/* Variants */}
        {product.variants.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Pilih Varian</p>
            <div className="grid grid-cols-2 gap-2">
              {product.variants.map(v => {
                const vStock = v.stock ?? 0
                const vOut = vStock <= 0
                return (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    disabled={vOut}
                    className={`px-3 py-2 text-xs rounded-lg border text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                      selectedVariant?.id === v.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                    }`}
                  >
                    <span className="font-medium">{v.name}</span> <br />
                    <span>{formatCurrency(v.price)}</span>
                    <span className={`ml-1 ${vOut ? 'text-red-600 font-semibold' : 'text-green-600'}`}>
                      · Stok: {vStock}
                    </span>
                    {vOut && <span className="block text-red-600 font-semibold mt-0.5">Habis</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Addons */}
        {product.addons.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Tambahan (Opsional)</p>
            {product.addons.map(a => (
              <button
                key={a.id}
                onClick={() => toggleAddon(a.id)}
                className={`flex justify-between w-full p-2 text-xs rounded-lg border ${selectedAddons.has(a.id) ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}
              >
                {a.name} <span>+{formatCurrency(a.price)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Quantity + Add to Cart */}
        <div className="flex gap-4 items-center pt-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 rounded-lg border border-gray-200"><Minus size={14}/></button>
            <span className="w-8 text-center text-sm">{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 rounded-lg border border-gray-200"><Plus size={14}/></button>
          </div>
          <button onClick={handleAdd} className="flex-1 bg-indigo-500 text-white rounded-lg py-3 text-sm font-bold">
            Tambah ke Keranjang - {formatCurrency(finalPrice)}
          </button>
        </div>
      </div>
    </div>
  )
}