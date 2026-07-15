'use client'

import { useState, useEffect } from 'react'
import { useStoreCart } from '@/contexts/store-cart-context'
import type { StoreProduct } from '@/actions/store'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingBag, Star, Search, ChevronRight, Plus, Check, Truck, Leaf, Palette, X, ArrowUpDown } from 'lucide-react'
import { CustomCakeModal } from '@/components/store/custom-cake-modal'
import { ProductModal } from '@/components/store/product-modal'

/* ─── Category config ─────────────────────────────────────── */
const CAT_EMOJI: Record<string, string> = {
  Kue: '🎂', Roti: '🍞', Pastri: '🥐', Cookies: '🍪',
  cake: '🎂', bread: '🍞', pastry: '🥐', healthy: '🌿', hampers: '🎁',
}

/* ─── Product Card ────────────────────────────────────────── */
function ProductCard({ product }: { product: StoreProduct }) {
  const { addItem, items, updateQty } = useStoreCart()
  const cartItem = items.find(i => i.product.id === product.id)
  const qty = cartItem?.quantity ?? 0
  const [added, setAdded] = useState(false)

  const handleAdd = () => {
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1200)
  }

  return (
    <div className="group bg-white rounded-2xl border overflow-hidden flex flex-col transition-all duration-200 hover:shadow-lg"
      style={{ borderColor: 'hsl(var(--border))' }}>

      {/* Image */}
      <div className="relative w-full overflow-hidden shrink-0"
        style={{ aspectRatio: '4/3', background: 'hsl(var(--surface-raised))' }}>
        {product.image_url
          ? <Image src={product.image_url} alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105" />
          : <div className="w-full h-full flex items-center justify-center text-5xl select-none">
              {CAT_EMOJI[product.category ?? ''] ?? '🧁'}
            </div>
        }
        {/* Qty badge */}
        {qty > 0 && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
            style={{ background: 'hsl(var(--primary))' }}>
            {qty}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1 gap-2">
        <div className="flex-1">
          <p className="text-xs font-medium mb-0.5" style={{ color: 'hsl(var(--warning))' }}>
            {product.category ?? 'Produk'}
          </p>
          <p className="text-sm font-bold leading-snug line-clamp-2"
            style={{ color: 'hsl(var(--foreground))', fontFamily: '"Playfair Display", serif' }}>
            {product.name}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-extrabold" style={{ color: 'hsl(var(--primary))' }}>
            {formatCurrency(product.selling_price)}
          </span>

          {qty > 0 ? (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); updateQty(product.id, qty - 1) }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-colors"
                style={{ background: 'hsl(var(--surface-raised))', color: 'hsl(var(--text-secondary))' }}>
                −
              </button>
              <span className="w-5 text-center text-sm font-bold"
                style={{ color: 'hsl(var(--foreground))' }}>{qty}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleAdd() }}
                className="w-7 h-7 rounded-lg flex items-center justify-center font-bold transition-colors"
                style={{ background: 'hsl(var(--primary))', color: 'white' }}>
                +
              </button>
            </div>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); handleAdd() }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-all"
              style={{ background: added ? 'hsl(var(--success))' : 'hsl(var(--primary))' }}>
              {added ? <Check size={11} /> : <Plus size={11} />}
              {added ? 'Added!' : 'Pesan'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Main ────────────────────────────────────────────────── */
export function StoreLanding({ bestsellers, allProducts, reviews }: {
  bestsellers: StoreProduct[]
  allProducts: StoreProduct[]
  reviews: { id: string; customer_name: string; rating: number; comment: string | null }[]
}) {
  const { itemCount, total } = useStoreCart()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [sort, setSort] = useState<'featured' | 'price_asc' | 'price_desc' | 'name_asc'>('featured')
  const [showCustomCake, setShowCustomCake] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null)

  // Debounce search input (200ms) so filtering doesn't run on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 200)
    return () => clearTimeout(t)
  }, [searchInput])

  const categories = ['all', ...Array.from(new Set(allProducts.map(p => p.category).filter(Boolean)))] as string[]
  const filtered = allProducts.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !search
      || p.name.toLowerCase().includes(q)
      || (p.online_description ?? p.description ?? '').toLowerCase().includes(q)
    const matchCat = activeCategory === 'all' || p.category === activeCategory
    return matchSearch && matchCat
  })

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case 'price_asc':  return a.selling_price - b.selling_price
      case 'price_desc': return b.selling_price - a.selling_price
      case 'name_asc':   return a.name.localeCompare(b.name)
      default:           return 0 // featured = urutan asli (online_sort_order)
    }
  })

  const hero = bestsellers[0] ?? allProducts[0]

  return (
    <div style={{ background: '#faf9f7' }}>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden"
        style={{ background: 'linear-gradient(175deg, hsl(var(--sidebar-bg)) 0%, hsl(25,25%,18%) 100%)' }}>

        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'hsl(var(--warning))', transform: 'translate(40%, -40%)' }} />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-5 pointer-events-none"
          style={{ background: 'hsl(var(--text-muted))', transform: 'translate(-30%, 30%)' }} />

        <div className="max-w-5xl mx-auto px-4 pt-10 pb-0">
          <div className="flex flex-col lg:flex-row items-end gap-6 lg:gap-10">

            {/* Text */}
            <div className="flex-1 space-y-4 pb-8 lg:pb-12">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'hsl(var(--text-muted))' }}>
                ✨ Artisanal Bakery
              </span>

              <h1 className="font-bold leading-tight"
                style={{
                  fontFamily: '"Playfair Display", serif',
                  fontSize: 'clamp(1.75rem, 6vw, 3rem)',
                  color: 'white',
                  letterSpacing: '-0.02em',
                }}>
                Roti & Kue<br />
                <span style={{ color: 'hsl(var(--primary))' }}>Dibuat dengan Cinta</span>
              </h1>

              <p className="text-sm leading-relaxed max-w-sm"
                style={{ color: 'hsl(var(--text-muted))' }}>
                Bahan premium, tanpa pengawet, langsung dari dapur kami ke tangan Anda.
              </p>

              <div className="flex gap-2 flex-wrap">
                <a href="#katalog"
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: 'hsl(var(--primary))' }}>
                  Lihat Katalog
                </a>
                <button onClick={() => setShowCustomCake(true)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-all"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <Palette size={14} />
                  Kue Custom
                </button>
              </div>

              {/* Stats */}
              <div className="flex gap-5 pt-2">
                {[
                  { val: `${allProducts.length}+`, label: 'Produk' },
                  { val: '⭐ 4.9', label: 'Rating' },
                  { val: '100%', label: 'Bahan Segar' },
                ].map(s => (
                  <div key={s.label}>
                    <p className="text-base font-bold" style={{ color: 'white' }}>{s.val}</p>
                    <p className="text-[10px]" style={{ color: 'hsl(var(--text-muted))' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero product image — sits at bottom of dark section */}
            {hero && (
              <div className="w-full lg:w-72 shrink-0 relative">
                <div className="rounded-t-2xl overflow-hidden"
                  style={{ aspectRatio: '1/1', background: 'hsl(var(--border))' }}>
                  {hero.image_url
                    ? <Image src={hero.image_url} alt={hero.name} fill priority
                        sizes="(max-width: 1024px) 100vw, 18rem"
                        className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-7xl">
                        {CAT_EMOJI[hero.category ?? ''] ?? '🧁'}
                      </div>
                  }
                </div>
                {/* Floating label */}
                <div className="absolute bottom-3 left-3 right-3 rounded-xl px-3 py-2"
                  style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)' }}>
                  <p className="text-[9px] uppercase font-bold tracking-widest mb-0.5"
                    style={{ color: 'hsl(var(--primary))' }}>
                    🔥 {bestsellers.length > 0 ? 'Paling Laris' : 'Pilihan Kami'}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold truncate"
                      style={{ fontFamily: '"Playfair Display", serif', color: 'hsl(var(--foreground))' }}>
                      {hero.name}
                    </p>
                    <span className="text-xs font-bold shrink-0 ml-2"
                      style={{ color: 'hsl(var(--primary))' }}>
                      {formatCurrency(hero.selling_price)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────── */}
      <section className="py-6 border-b" style={{ borderColor: 'hsl(var(--border))', background: 'white' }}>
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex overflow-x-auto gap-4 pb-1 no-scrollbar">
            {[
              { icon: '🚚', title: 'Pengiriman Aman', desc: 'Dikemas khusus, tiba sempurna' },
              { icon: '🌿', title: 'Bahan Premium', desc: 'Tanpa pengawet buatan' },
              { icon: '💚', title: 'Varian Sehat', desc: 'Sugar-free & vegan tersedia' },
              { icon: '🎂', title: 'Custom Cake', desc: 'Desain sesuai keinginan' },
            ].map(f => (
              <div key={f.title} className="flex items-center gap-2.5 shrink-0 px-4 py-2.5 rounded-xl"
                style={{ background: 'hsl(var(--surface-raised))', border: '1px solid hsl(var(--surface-raised))' }}>
                <span className="text-xl">{f.icon}</span>
                <div>
                  <p className="text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--foreground))' }}>{f.title}</p>
                  <p className="text-[10px] whitespace-nowrap" style={{ color: 'hsl(var(--text-muted))' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BESTSELLERS ──────────────────────────────────── */}
      {bestsellers.length > 0 && (
        <section className="py-8" style={{ background: 'white' }}>
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: 'hsl(var(--primary))' }}>
                <Star size={12} fill="white" style={{ color: 'white' }} />
              </div>
              <h2 className="text-base font-bold"
                style={{ fontFamily: '"Playfair Display", serif', color: 'hsl(var(--foreground))' }}>
                Paling Laris
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {bestsellers.slice(0, 4).map(p => (
                <div key={p.id} onClick={() => setSelectedProduct(p)} className="cursor-pointer">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FULL CATALOG ─────────────────────────────────── */}
      <section id="katalog" className="py-8">
        <div className="max-w-5xl mx-auto px-4 space-y-4">

          {/* Section header */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold"
              style={{ fontFamily: '"Playfair Display", serif', color: 'hsl(var(--foreground))' }}>
              Semua Produk
            </h2>
            <span className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
              {sorted.length} produk
            </span>
          </div>

          {/* Search + Sort */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2"
                style={{ color: 'hsl(var(--text-muted))' }} />
              <input
                type="text"
                placeholder="Cari produk..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-10 py-3 rounded-2xl border text-sm outline-none"
                style={{
                  borderColor: 'hsl(var(--border))',
                  background: 'white',
                  color: 'hsl(var(--foreground))',
                }}
              />
              {searchInput && (
                <button onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full"
                  style={{ color: 'hsl(var(--text-muted))' }}>
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Sort dropdown */}
            <div className="relative shrink-0">
              <select
                value={sort}
                onChange={e => setSort(e.target.value as typeof sort)}
                className="h-full pl-3 pr-8 py-3 rounded-2xl border text-sm font-medium outline-none appearance-none cursor-pointer"
                style={{
                  borderColor: 'hsl(var(--border))',
                  background: 'white',
                  color: 'hsl(var(--foreground))',
                }}
                aria-label="Urutkan produk"
              >
                <option value="featured">Unggulan</option>
                <option value="price_asc">Harga Termurah</option>
                <option value="price_desc">Harga Termahal</option>
                <option value="name_asc">Nama A-Z</option>
              </select>
              <ArrowUpDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'hsl(var(--text-muted))' }} />
            </div>
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={activeCategory === cat
                  ? { background: 'hsl(var(--primary))', color: 'white' }
                  : { background: 'white', color: 'hsl(var(--text-muted))', border: '1px solid hsl(var(--border))' }
                }>
                {cat === 'all' ? '🧁 Semua' : `${CAT_EMOJI[cat] ?? '•'} ${cat}`}
              </button>
            ))}
          </div>

          {/* Grid */}
          {sorted.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <p className="text-3xl">🔍</p>
              <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>
                Produk tidak ditemukan
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {sorted.map(p => (
                <div key={p.id} onClick={() => setSelectedProduct(p)} className="cursor-pointer">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── TESTIMONIAL (curated by admin via is_featured) ── */}
      {reviews.length > 0 && (
        <section className="py-10 mx-4 mb-4 rounded-3xl"
          style={{ background: 'hsl(var(--foreground))' }}>
          <div className="max-w-3xl mx-auto px-4">
            <div className="flex justify-center gap-0.5 mb-5">
              <Star size={14} fill="hsl(var(--warning))" style={{ color: 'hsl(var(--warning))' }} />
              <span className="text-xs font-semibold ml-2" style={{ color: 'hsl(var(--text-muted))' }}>
                Ulasan Pelanggan
              </span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {reviews.map(rv => (
                <div key={rv.id} className="text-left p-4 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="flex gap-0.5 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={11}
                        fill={i < rv.rating ? 'hsl(var(--warning))' : 'none'}
                        style={{ color: i < rv.rating ? 'hsl(var(--warning))' : 'hsl(var(--text-muted))' }} />
                    ))}
                  </div>
                  {rv.comment && (
                    <p className="text-sm leading-relaxed"
                      style={{ fontFamily: '"Playfair Display", serif', color: 'hsl(var(--border-strong))' }}>
                      "{rv.comment}"
                    </p>
                  )}
                  <p className="text-xs font-semibold mt-2" style={{ color: 'hsl(var(--text-muted))' }}>
                    — {rv.customer_name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FLOATING CART ────────────────────────────────── */}
      {itemCount > 0 && (
        <div className="fixed bottom-4 inset-x-4 max-w-sm mx-auto z-50"
          key={itemCount}
          style={{ animation: 'cart-bump 300ms var(--ease-spring)' }}>
          <Link href="/store/checkout"
            className="flex items-center justify-between w-full px-4 py-3.5 rounded-2xl shadow-xl transition-all active:scale-[0.98]"
            style={{ background: 'hsl(var(--foreground))' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'hsl(var(--primary))' }}>
                <ShoppingBag size={14} style={{ color: 'white' }} />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{itemCount} item</p>
                <p className="text-[10px]" style={{ color: 'hsl(var(--text-muted))' }}>Tap untuk checkout</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold" style={{ color: 'hsl(var(--primary))' }}>
                {formatCurrency(total)}
              </span>
              <ChevronRight size={15} style={{ color: 'hsl(var(--text-muted))' }} />
            </div>
          </Link>
        </div>
      )}

      {/* Product Detail Modal */}
      <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />

      {/* Custom Cake Modal */}
      <CustomCakeModal open={showCustomCake} onClose={() => setShowCustomCake(false)} />
    </div>
  )
}
