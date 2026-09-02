'use client'

import { useState, useEffect } from 'react'
import { useStoreCart } from '@/contexts/store-cart-context'
import type { StoreProduct } from '@/actions/store'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import {
  ShoppingBag,
  Star,
  Search,
  ChevronRight,
  Plus,
  Check,
  Truck,
  Leaf,
  Palette,
  X,
  ArrowUpDown,
  Sparkles,
  Wheat,
  Heart,
  ShieldCheck,
} from 'lucide-react'
import { CustomCakeModal } from '@/components/store/custom-cake-modal'
import { ProductDetailModal } from '@/components/store/product-detail-modal'

const CATEGORY_LABELS: Record<string, string> = {
  Kue: 'Kue',
  Roti: 'Roti',
  Pastri: 'Pastri',
  Cookies: 'Cookies',
  cake: 'Kue',
  bread: 'Roti',
  pastry: 'Pastri',
  healthy: 'Healthy',
  hampers: 'Hampers',
}

function cleanProductName(name: string) {
  return name
    .replace(/^(cake|kue|roti|bread)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function productDescription(product: StoreProduct) {
  return product.online_description || product.description || 'Dibuat fresh dengan bahan pilihan dan sentuhan handmade.'
}

function ProductImage({ product, priority = false, className = '' }: {
  product: StoreProduct
  priority?: boolean
  className?: string
}) {
  if (product.image_url) {
    return (
      <Image
        src={product.image_url}
        alt={product.name}
        fill
        priority={priority}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        className={`object-cover transition-transform duration-700 group-hover:scale-105 ${className}`}
      />
    )
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-surface text-4xl font-semibold text-primary">
      {cleanProductName(product.name).slice(0, 1).toUpperCase()}
    </div>
  )
}

function ProductCard({ product, signature = false }: { product: StoreProduct; signature?: boolean }) {
  const { addItem, items, updateQty } = useStoreCart()
  const cartItem = items.find(i => i.product_id === product.id)
  const qty = cartItem?.quantity ?? 0
  const [added, setAdded] = useState(false)

  const handleAdd = (e: React.MouseEvent) => {
    // If product has variants, open the detail modal so the user can pick one.
    // Only products without variants can be added directly from the card.
    if (product.has_variants) return
    e.stopPropagation()
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1200)
  }

  return (
    <div
      className={`group flex h-full flex-col overflow-hidden rounded-[1.75rem] border bg-surface transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${signature ? 'shadow-[0_24px_70px_rgba(45,28,18,0.10)]' : 'shadow-sm'}`}
      style={{ borderColor: 'hsl(var(--border))' }}
    >
      <div className="relative w-full shrink-0 overflow-hidden bg-surface-raised" style={{ aspectRatio: signature ? '4/5' : '4/3' }}>
        <ProductImage product={product} />
        {signature && (
          <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-accent shadow-sm backdrop-blur">
            Best Seller
          </div>
        )}
        {qty > 0 && (
          <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-primary-foreground shadow-lg" style={{ background: 'hsl(var(--primary))' }}>
            {qty}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex-1 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-accent">
            {CATEGORY_LABELS[product.category ?? ''] ?? product.category ?? 'Produk'}
          </p>
          <h3 className="line-clamp-2 text-lg font-bold leading-tight text-foreground" style={{ fontFamily: '"Playfair Display", serif' }}>
            {cleanProductName(product.name)}
          </h3>
          {signature && (
            <p className="line-clamp-2 text-sm leading-relaxed text-text-secondary">
              {productDescription(product)}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-extrabold text-primary">
            {formatCurrency(product.selling_price)}
          </span>

          {qty > 0 ? (
            <div className="flex items-center gap-1.5 rounded-full bg-surface-raised p-1">
              <button
                onClick={(e) => { e.stopPropagation(); updateQty(product.id, qty - 1) }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-text-secondary transition-colors hover:bg-white"
                aria-label={`Kurangi ${product.name}`}
              >
                −
              </button>
              <span className="w-5 text-center text-sm font-bold text-foreground">{qty}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleAdd(e) }}
                className="flex h-7 w-7 items-center justify-center rounded-full font-bold text-primary-foreground transition-colors"
                style={{ background: 'hsl(var(--primary))' }}
                aria-label={`Tambah ${product.name}`}
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); handleAdd(e) }}
              className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-primary-foreground transition-all hover:opacity-90"
              style={{ background: added ? 'hsl(var(--success))' : 'hsl(var(--primary))' }}
            >
              {added ? <Check size={12} /> : <Plus size={12} />}
              {added ? 'Ditambah' : 'Pesan'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

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

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 200)
    return () => clearTimeout(t)
  }, [searchInput])

  const categories = ['all', ...Array.from(new Set(allProducts.map(p => p.category).filter(Boolean)))] as string[]
  const filtered = allProducts.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !search
      || p.name.toLowerCase().includes(q)
      || productDescription(p).toLowerCase().includes(q)
    const matchCat = activeCategory === 'all' || p.category === activeCategory
    return matchSearch && matchCat
  })

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case 'price_asc': return a.selling_price - b.selling_price
      case 'price_desc': return b.selling_price - a.selling_price
      case 'name_asc': return a.name.localeCompare(b.name)
      default: return 0
    }
  })

  const hero = bestsellers[0] ?? allProducts[0]
  const signatureProducts = (bestsellers.length > 0 ? bestsellers : allProducts).slice(0, 3)
  const specialProducts = allProducts.filter((product) => {
    const content = `${product.name} ${product.category ?? ''} ${productDescription(product)}`.toLowerCase()
    return ['vegan', 'sugar', 'sehat', 'healthy', 'diet'].some(term => content.includes(term))
  }).slice(0, 3)
  const wellnessProducts = specialProducts.length > 0 ? specialProducts : allProducts.slice(0, 3)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="relative isolate overflow-hidden bg-primary">
        {hero?.image_url && (
          <div className="absolute inset-0 opacity-30">
            <Image src={hero.image_url} alt="Bakery hero background" fill priority sizes="100vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-primary/40" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />

        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-20 pt-16 md:px-6 lg:min-h-[680px] lg:grid-cols-[1fr_440px] lg:items-center lg:py-24">
          <div className="max-w-2xl space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.26em] text-primary-foreground backdrop-blur">
              <Sparkles size={14} />
              Artisanal Luxury Bakery
            </div>

            <div className="space-y-5">
              <h1 className="text-5xl font-bold leading-[0.95] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl" style={{ fontFamily: '"Playfair Display", serif' }}>
                Roti & Kue Dibuat dengan Cinta
              </h1>
              <p className="max-w-xl text-base leading-8 text-text-muted sm:text-lg">
                Premium ingredients, no preservatives, from our kitchen to your hands. Setiap kue dibuat fresh untuk momen yang terasa lebih istimewa.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a href="#katalog" className="inline-flex items-center justify-center rounded-full bg-accent px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-xl transition-all hover:-translate-y-0.5">
                Explore Our Menu
              </a>
              <button
                onClick={() => setShowCustomCake(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-7 py-3.5 text-sm font-bold text-white backdrop-blur transition-all hover:bg-white/15"
              >
                <Palette size={16} />
                Custom Cake
              </button>
            </div>

            <div className="grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-6">
              {[
                { value: `${allProducts.length}+`, label: 'Produk pilihan' },
                { value: '4.9', label: 'Rating pelanggan' },
                { value: '100%', label: 'Fresh harian' },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-2xl font-bold text-white" style={{ fontFamily: '"Playfair Display", serif' }}>{item.value}</p>
                  <p className="mt-1 text-xs text-text-muted">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {hero && (
            <div className="group relative mx-auto w-full max-w-sm lg:max-w-none">
              <div className="absolute -inset-6 rounded-[3rem] bg-accent/20 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2.5rem] border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur">
                <div className="relative overflow-hidden rounded-[2rem] bg-surface-raised" style={{ aspectRatio: '4/5' }}>
                  <ProductImage product={hero} priority />
                </div>
                <div className="absolute bottom-7 left-7 right-7 rounded-[1.5rem] bg-white/95 p-4 shadow-xl backdrop-blur">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-accent">Signature Pick</p>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-xl font-bold text-foreground" style={{ fontFamily: '"Playfair Display", serif' }}>{cleanProductName(hero.name)}</h2>
                      <p className="mt-1 line-clamp-1 text-xs text-text-secondary">{productDescription(hero)}</p>
                    </div>
                    <p className="shrink-0 text-sm font-extrabold text-primary">{formatCurrency(hero.selling_price)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-10 max-w-6xl px-4">
        <div className="grid gap-3 rounded-[2rem] border border-border bg-surface/95 p-3 shadow-[0_24px_80px_rgba(45,28,18,0.10)] backdrop-blur sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Leaf, title: '100% Fresh', desc: 'Made daily from scratch.' },
            { icon: Wheat, title: 'No Additives', desc: 'Pure, natural ingredients.' },
            { icon: Heart, title: 'Custom Design', desc: 'Personalized for your moment.' },
            { icon: Truck, title: 'Safe Shipping', desc: 'Delivered perfectly packed.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-3 rounded-[1.5rem] bg-background p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-primary">
                <Icon size={19} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">{title}</h3>
                <p className="mt-1 text-xs text-text-secondary">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {signatureProducts.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-20 md:px-6">
          <div className="mb-9 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="max-w-xl space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">Signature Collection</p>
              <h2 className="text-4xl font-bold tracking-[-0.03em] text-foreground" style={{ fontFamily: '"Playfair Display", serif' }}>
                Bestsellers yang paling dicari
              </h2>
            </div>
            <a href="#katalog" className="inline-flex items-center gap-2 text-sm font-bold text-primary">
              View full menu <ChevronRight size={16} />
            </a>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {signatureProducts.map(product => (
              <div
                key={product.id}
                role="button"
                tabIndex={0}
                aria-label={`Lihat detail ${cleanProductName(product.name)}`}
                onClick={() => setSelectedProduct(product)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedProduct(product)
                  }
                }}
                className="cursor-pointer"
              >
                <ProductCard product={product} signature />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-accent-subtle py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 md:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div className="space-y-5">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface text-primary shadow-sm">
              <ShieldCheck size={22} />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">Dietary Friendly</p>
            <h2 className="text-4xl font-bold leading-tight tracking-[-0.03em] text-foreground" style={{ fontFamily: '"Playfair Display", serif' }}>
              Indulge without compromise.
            </h2>
            <p className="leading-8 text-text-secondary">
              Pilihan sugar-free, vegan, dan varian sehat tersedia untuk Anda yang ingin menikmati dessert premium dengan rasa tetap maksimal.
            </p>
            <button
              onClick={() => setShowCustomCake(true)}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-all hover:-translate-y-0.5"
            >
              <Palette size={16} />
              Request Custom Order
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {wellnessProducts.map(product => (
              <div
                key={product.id}
                role="button"
                tabIndex={0}
                aria-label={`Lihat detail ${cleanProductName(product.name)}`}
                onClick={() => setSelectedProduct(product)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedProduct(product)
                  }
                }}
                className="group cursor-pointer overflow-hidden rounded-[2rem] bg-surface p-3 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative overflow-hidden rounded-[1.5rem] bg-surface-raised" style={{ aspectRatio: '1/1' }}>
                  <ProductImage product={product} />
                </div>
                <div className="p-3">
                  <h3 className="line-clamp-2 text-base font-bold text-foreground" style={{ fontFamily: '"Playfair Display", serif' }}>{cleanProductName(product.name)}</h3>
                  <p className="mt-2 text-sm font-extrabold text-primary">{formatCurrency(product.selling_price)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="katalog" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 md:px-6">
        <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="max-w-xl space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">Complete Menu</p>
            <h2 className="text-4xl font-bold tracking-[-0.03em] text-foreground" style={{ fontFamily: '"Playfair Display", serif' }}>
              Semua Produk
            </h2>
            <p className="text-sm text-text-secondary">{sorted.length} produk tersedia untuk dipesan online.</p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <div className="relative min-w-0 flex-1 lg:w-80">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Cari produk..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full rounded-full border border-border bg-surface py-3 pl-11 pr-10 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
              {searchInput && (
                <button onClick={() => setSearchInput('')} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full text-text-muted" aria-label="Hapus pencarian">
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="relative shrink-0">
              <select
                value={sort}
                onChange={e => setSort(e.target.value as typeof sort)}
                className="h-full w-full appearance-none rounded-full border border-border bg-surface py-3 pl-4 pr-10 text-sm font-semibold text-foreground outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 sm:w-auto"
                aria-label="Urutkan produk"
              >
                <option value="featured">Unggulan</option>
                <option value="price_asc">Harga Termurah</option>
                <option value="price_desc">Harga Termahal</option>
                <option value="name_asc">Nama A-Z</option>
              </select>
              <ArrowUpDown size={14} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-text-muted" />
            </div>
          </div>
        </div>

        <div className="mb-8 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all"
              style={activeCategory === cat
                ? { background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
                : { background: 'hsl(var(--surface))', color: 'hsl(var(--text-secondary))', border: '1px solid hsl(var(--border))' }
              }
            >
              {cat === 'all' ? 'Semua' : (CATEGORY_LABELS[cat] ?? cat)}
            </button>
          ))}
        </div>

        {sorted.length === 0 ? (
          <div className="rounded-[2rem] border border-border bg-surface py-16 text-center">
            <p className="text-sm font-semibold text-text-secondary">Produk tidak ditemukan</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
            {sorted.map(product => (
              <div
                key={product.id}
                role="button"
                tabIndex={0}
                aria-label={`Lihat detail ${cleanProductName(product.name)}`}
                onClick={() => setSelectedProduct(product)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedProduct(product)
                  }
                }}
                className="cursor-pointer"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </section>

      {reviews.length > 0 && (
        <section className="mx-4 mb-8 rounded-[2.5rem] bg-primary px-4 py-16 md:mx-6">
          <div className="mx-auto max-w-5xl">
            <div className="mx-auto mb-9 max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">Customer Notes</p>
              <h2 className="mt-3 text-3xl font-bold text-white" style={{ fontFamily: '"Playfair Display", serif' }}>
                Dibuat untuk momen yang diingat
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {reviews.map(review => (
                <div key={review.id} className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-5 text-left">
                  <div className="mb-4 flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={13} fill={i < review.rating ? 'currentColor' : 'none'} className={i < review.rating ? 'text-accent' : 'text-white/20'} />
                    ))}
                  </div>
                  {review.comment && (
                    <p className="text-base leading-7 text-text-muted" style={{ fontFamily: '"Playfair Display", serif' }}>
                      “{review.comment}”
                    </p>
                  )}
                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-text-muted">{review.customer_name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {itemCount > 0 && (
        <div className="fixed bottom-4 inset-x-4 z-50 mx-auto max-w-sm" key={itemCount} style={{ animation: 'cart-bump 300ms var(--ease-spring)' }}>
          <Link href="/store/checkout" className="flex w-full items-center justify-between rounded-2xl bg-primary px-4 py-3.5 shadow-2xl transition-all active:scale-[0.98]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-primary-foreground">
                <ShoppingBag size={15} />
              </div>
              <div>
                <p className="text-xs font-bold text-white">{itemCount} item</p>
                <p className="text-[10px] text-text-muted">Tap untuk checkout</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-accent">{formatCurrency(total)}</span>
              <ChevronRight size={15} className="text-text-muted" />
            </div>
          </Link>
        </div>
      )}

      <ProductDetailModal productId={selectedProduct?.id ?? null} onClose={() => setSelectedProduct(null)} />
      <CustomCakeModal open={showCustomCake} onClose={() => setShowCustomCake(false)} />
    </div>
  )
}
