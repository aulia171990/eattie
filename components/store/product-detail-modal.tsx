'use client'

import { useState, useEffect, useRef } from 'react'
import { useStoreCart } from '@/contexts/store-cart-context'
import { getProductDetail } from '@/actions/store'
import type { StoreProductDetail, ProductVariant, ProductAddon, ProductGallery } from '@/types/product-config'
import { formatCurrency } from '@/lib/utils'
import { X, Plus, Minus, Loader, ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  productId: string | null
  onClose: () => void
}

export function ProductDetailModal({ productId, onClose }: Props) {
  const { addConfigurableItem } = useStoreCart()
  const [product, setProduct] = useState<StoreProductDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set())
  const [quantity, setQuantity] = useState(1)
  const [activeImageIdx, setActiveImageIdx] = useState(0)
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    if (!productId) return
    setLoading(true)
    getProductDetail(productId).then(p => {
      setProduct(p)
      setSelectedVariant(p?.variants[0] ?? null)
      setSelectedAddons(new Set())
      setQuantity(1)
      setActiveImageIdx(0)
      setLoading(false)
    })
  }, [productId])

  if (!productId || !product) return null

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
        <div className="bg-white rounded-3xl w-full max-w-sm p-6 text-center">
          <Loader className="animate-spin mx-auto" size={24} />
        </div>
      </div>
    )
  }

  const selectedImage = (() => {
    if (product.gallery?.length > 0) return product.gallery[activeImageIdx].image_url
    if (selectedVariant?.image_url?.trim()) return selectedVariant.image_url
    return product.image_url
  })()

  const addonList = product.addons.filter(a => selectedAddons.has(a.id))
  const totalPrice = (selectedVariant?.price ?? 0) + addonList.reduce((acc, a) => acc + a.price, 0)
  const finalPrice = totalPrice * quantity

  const handleAdd = () => {
    if (!selectedVariant) return
    addConfigurableItem({
      product_id: product.id,
      product_name: product.name,
      product_image: selectedImage,
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

  const handlePrev = () => setActiveImageIdx(i => {
    if (product.gallery?.length > 0) return Math.max(0, i - 1)
    return 0
  })
  const handleNext = () => setActiveImageIdx(i => {
    // Count: gallery images only
    const galleryLen = product.gallery?.length ?? 0
    if (galleryLen > 0) return Math.min(galleryLen - 1, i + 1)
    return i
  })
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(diff) > 40) diff > 0 ? handlePrev() : handleNext()
    touchStartX.current = null
  }

  const allImages = product.gallery ? product.gallery.map(g => g.image_url).filter(Boolean) : []
  const totalImages = allImages.length > 0 ? allImages.length : 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        {/* Image carousel */}
        <div
          className="relative w-full aspect-square bg-gray-100 rounded-t-3xl overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {selectedImage ? (
            <>
              <img src={selectedImage} alt={product.name} className="w-full h-full object-cover" />
              {/* Only show arrows if more than 1 image */}
              {totalImages > 1 && (
                <>
                  <button onClick={handlePrev} disabled={activeImageIdx === 0}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center disabled:opacity-40">
                    <ChevronLeft size={18} />
                  </button>
                  <button onClick={handleNext} disabled={activeImageIdx === totalImages - 1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center disabled:opacity-40">
                    <ChevronRight size={18} />
                  </button>
                  {/* Dots */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                    {allImages.map((_, i) => (
                      <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === activeImageIdx ? 'bg-white' : 'bg-white/50'}`} />
                    ))}
                  </div>
                </>
              )}
              <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center">
                <X size={18} />
              </button>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">Tidak ada foto</div>
          )}
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h2 className="font-bold text-lg">{product.name}</h2>
            {product.description && <p className="text-xs text-gray-500 mt-1">{product.description}</p>}
          </div>

          {/* Variants */}
          {product.variants.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Pilih Ukuran/Varian</p>
              <div className="grid grid-cols-2 gap-2">
                {product.variants.map(v => (
                  <button
                    key={v.id}
                    onClick={() => { setSelectedVariant(v); setActiveImageIdx(0) }}
                    className={`px-3 py-2 text-xs rounded-xl border ${selectedVariant?.id === v.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}
                  >
                    {v.name} <br /> {formatCurrency(v.price)}
                  </button>
                ))}
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
                  className={`flex justify-between w-full p-2 text-xs rounded-lg border ${selectedAddons.has(a.id) ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}
                >
                  {a.name} <span>+{formatCurrency(a.price)}</span>
                </button>
              ))}
            </div>
          )}

          {/* Qty + Add */}
          <div className="flex gap-4 items-center pt-2">
            <div className="flex items-center gap-2">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 rounded-lg border border-gray-200"><Minus size={14}/></button>
              <span className="w-8 text-center text-sm">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 rounded-lg border border-gray-200"><Plus size={14}/></button>
            </div>
            <button onClick={handleAdd} className="flex-1 bg-orange-500 text-white rounded-xl py-3 text-sm font-bold">
              Tambah - {formatCurrency(finalPrice)}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}