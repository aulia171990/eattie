'use client'

import { useState } from 'react'
import { useStoreCart } from '@/contexts/store-cart-context'
import type { StoreProduct } from '@/actions/store'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { ShoppingBag, Star, Search, ChevronRight, Plus, Check } from 'lucide-react'

const categoryEmoji: Record<string, string> = {
  Kue: '🎂', Roti: '🍞', Pastri: '🥐', Cookies: '🍪', cake: '🎂', bread: '🍞',
}

function ProductCard({ product }: { product: StoreProduct }) {
  const { addItem, items } = useStoreCart()
  const inCart = items.find(i => i.product.id === product.id)
  const [added, setAdded] = useState(false)

  const handleAdd = () => {
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div
      className="bg-white rounded-2xl border overflow-hidden flex flex-col transition-shadow hover:shadow-md"
      style={{ borderColor: 'hsl(36, 20%, 90%)' }}
    >
      {/* Image / placeholder */}
      <div
        className="w-full aspect-square flex items-center justify-center text-5xl shrink-0"
        style={{ background: 'hsl(36, 40%, 95%)' }}
      >
        {product.image_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          : (categoryEmoji[product.category ?? ''] ?? '🧁')
        }
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1 gap-1">
        <p className="text-xs font-medium" style={{ color: 'hsl(25, 15%, 55%)' }}>
          {product.category ?? 'Produk'}
        </p>
        <p className="text-sm font-bold leading-tight" style={{ color: 'hsl(25, 30%, 15%)' }}>
          {product.name}
        </p>
        {(product.online_description ?? product.description) && (
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'hsl(25, 15%, 50%)' }}>
            {product.online_description ?? product.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-auto pt-2">
          <p className="text-sm font-bold" style={{ color: 'hsl(32, 95%, 40%)' }}>
            {formatCurrency(product.selling_price)}
          </p>
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-all"
            style={{
              background: added ? 'hsl(142, 60%, 40%)' : 'hsl(32, 95%, 44%)',
              transform: added ? 'scale(0.95)' : 'scale(1)',
            }}
          >
            {added ? <Check size={13} /> : <Plus size={13} />}
            {added ? 'Ditambah' : 'Tambah'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface StoreLandingProps {
  bestsellers: StoreProduct[]
  allProducts: StoreProduct[]
}

export function StoreLanding({ bestsellers, allProducts }: StoreLandingProps) {
  const { itemCount, total } = useStoreCart()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  const categories = ['all', ...Array.from(new Set(allProducts.map(p => p.category).filter(Boolean)))] as string[]

  const filtered = allProducts.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = activeCategory === 'all' || p.category === activeCategory
    return matchSearch && matchCat
  })

  return (
    <div className="space-y-8 pt-6">

      {/* Hero */}
      <div
        className="rounded-3xl p-6 sm:p-8 text-center space-y-3"
        style={{ background: 'hsl(25, 30%, 12%)' }}
      >
        <p className="text-3xl">🍞</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
          Roti & Kue Segar<br />
          <span style={{ color: 'hsl(32, 95%, 60%)' }}>Dipesan, Dibuat, Diantar</span>
        </h1>
        <p className="text-sm max-w-xs mx-auto" style={{ color: 'hsl(36, 20%, 60%)' }}>
          Pesan langsung dari dapur kami. Tanpa antri, tanpa repot.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Link
            href="#catalog"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'hsl(32, 95%, 44%)' }}
          >
            Lihat Katalog
          </Link>
          <Link
            href="/store/track"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'hsl(25, 20%, 20%)', color: 'hsl(36, 20%, 75%)' }}
          >
            Lacak Pesanan
          </Link>
        </div>
      </div>

      {/* Bestsellers */}
      {bestsellers.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star size={16} fill="hsl(32,95%,44%)" style={{ color: 'hsl(32,95%,44%)' }} />
              <h2 className="text-base font-bold" style={{ color: 'hsl(25, 30%, 15%)' }}>
                Terlaris
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {bestsellers.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Full catalog */}
      <section id="catalog" className="space-y-3">
        <h2 className="text-base font-bold" style={{ color: 'hsl(25, 30%, 15%)' }}>
          Semua Produk
        </h2>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(25,15%,55%)' }} />
          <input
            type="text"
            placeholder="Cari produk..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none"
            style={{ borderColor: 'hsl(36, 20%, 88%)', background: 'white' }}
          />
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={activeCategory === cat
                ? { background: 'hsl(32, 95%, 44%)', color: 'white' }
                : { background: 'white', color: 'hsl(25, 15%, 45%)', border: '1px solid hsl(36,20%,88%)' }
              }
            >
              {categoryEmoji[cat] ?? '🧁'} {cat === 'all' ? 'Semua' : cat}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: 'hsl(25, 15%, 55%)' }}>
            Produk tidak ditemukan
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* Floating cart bar */}
      {itemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto z-50">
          <Link
            href="/store/checkout"
            className="flex items-center justify-between w-full px-5 py-3.5 rounded-2xl shadow-xl text-white font-semibold"
            style={{ background: 'hsl(25, 30%, 12%)' }}
          >
            <div className="flex items-center gap-3">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'hsl(32, 95%, 44%)', color: 'white' }}
              >
                {itemCount}
              </span>
              <span className="text-sm">Lihat Keranjang</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: 'hsl(32, 95%, 70%)' }}>
                {formatCurrency(total)}
              </span>
              <ChevronRight size={16} />
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
