'use client'

import { useState } from 'react'
import { useStoreCart } from '@/contexts/store-cart-context'
import type { StoreProduct } from '@/actions/store'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { ShoppingBag, Star, Search, ChevronRight, Plus, Check, Truck, Cookie, Leaf } from 'lucide-react'

/* ─── Helpers ─────────────────────────────────────────────── */
const categoryEmoji: Record<string, string> = {
  Kue: '🎂', Roti: '🍞', Pastri: '🥐', Cookies: '🍪',
  cake: '🎂', bread: '🍞', pastry: '🥐', healthy: '🌿', hampers: '🎁',
}

/* ─── Product Card ────────────────────────────────────────── */
function ProductCard({ product }: { product: StoreProduct }) {
  const { addItem, items } = useStoreCart()
  const inCart = items.some(i => i.product.id === product.id)
  const [added, setAdded] = useState(false)

  const handleAdd = () => {
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1600)
  }

  return (
    <div className="group bg-white rounded-3xl border overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      style={{ borderColor: 'hsl(36, 25%, 90%)' }}>

      {/* Image */}
      <div className="relative w-full aspect-[4/3] overflow-hidden shrink-0"
        style={{ background: 'hsl(36, 40%, 95%)' }}>
        {product.image_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={product.image_url} alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          : <div className="w-full h-full flex items-center justify-center text-5xl">
              {categoryEmoji[product.category ?? ''] ?? '🧁'}
            </div>
        }
        {/* Category pill */}
        <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm"
          style={{ background: 'rgba(255,255,255,0.95)', color: 'hsl(32, 90%, 40%)' }}>
          {product.category ?? 'Produk'}
        </span>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        <div className="space-y-1 flex-1">
          <p className="text-sm font-bold leading-snug line-clamp-1"
            style={{ color: 'hsl(25, 30%, 12%)', fontFamily: '"Playfair Display", serif' }}>
            {product.name}
          </p>
          {(product.online_description ?? product.description) && (
            <p className="text-xs leading-relaxed line-clamp-2"
              style={{ color: 'hsl(25, 15%, 52%)' }}>
              {product.online_description ?? product.description}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between pt-2">
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: 'hsl(25, 15%, 55%)' }}>Mulai dari</span>
            <span className="text-sm font-extrabold" style={{ color: 'hsl(32, 90%, 42%)' }}>
              {formatCurrency(product.selling_price)}
            </span>
          </div>
          <button onClick={handleAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-white transition-all duration-200"
            style={{
              background: added ? 'hsl(142, 55%, 40%)' : 'hsl(32, 90%, 44%)',
              transform: added ? 'scale(0.95)' : 'scale(1)',
            }}>
            {added ? <Check size={12} /> : <Plus size={12} />}
            {added ? 'Ditambah!' : 'Pesan'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Feature Strip ───────────────────────────────────────── */
const FEATURES = [
  {
    icon: Truck,
    title: 'Pengiriman Aman',
    desc: 'Dikemas khusus agar kue tiba dalam kondisi sempurna.',
  },
  {
    icon: Cookie,
    title: 'Bahan Premium',
    desc: 'Susu segar, cokelat premium, tanpa pengawet buatan.',
  },
  {
    icon: Leaf,
    title: 'Ada Varian Minimalis',
    desc: 'Sekali "HAP", memang mantap',
  },
]

/* ─── Main Landing ────────────────────────────────────────── */
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
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.online_description ?? p.description ?? '').toLowerCase().includes(search.toLowerCase())
    const matchCat = activeCategory === 'all' || p.category === activeCategory
    return matchSearch && matchCat
  })

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-14 lg:py-20"
        style={{ background: 'linear-gradient(160deg, #fff 0%, hsl(36, 40%, 96%) 100%)' }}>
        <div className="max-w-6xl mx-auto px-5 flex flex-col lg:flex-row items-center gap-10">

          {/* Left */}
          <div className="flex-1 space-y-5 text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
              style={{ background: 'hsl(36, 80%, 92%)', color: 'hsl(32, 90%, 40%)' }}>
              ✨ Premium Artisanal Patisserie
            </span>
            <h1 style={{ fontFamily: '"Playfair Display", serif', color: 'hsl(25, 30%, 12%)' }}
              className="text-4xl sm:text-5xl font-bold leading-[1.18] tracking-tight">
              Cita Rasa Mewah<br />
              <span className="italic" style={{ color: 'hsl(32, 90%, 44%)' }}>Tanpa Rasa Khawatir</span>
            </h1>
            <p className="text-sm sm:text-base max-w-md mx-auto lg:mx-0 leading-relaxed"
              style={{ color: 'hsl(25, 20%, 40%)' }}>
              Pilihan premium cake klasik, croissant renyah, dan Healthy Cake Series
              buatan tangan. Diantar langsung ke rumah Anda.
            </p>
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start pt-1">
              <a href="#katalog"
                className="px-6 py-3 rounded-full text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
                style={{ background: 'hsl(32, 90%, 44%)' }}>
                Pesan Sekarang <ChevronRight size={14} className="inline ml-1" />
              </a>
              <Link href="/store/track"
                className="px-6 py-3 rounded-full text-sm font-semibold border transition-all hover:bg-orange-50"
                style={{ borderColor: 'hsl(36, 30%, 82%)', color: 'hsl(25, 25%, 35%)' }}>
                Lacak Pesanan
              </Link>
            </div>

            {/* Stats */}
            <div className="flex gap-6 justify-center lg:justify-start pt-4 border-t"
              style={{ borderColor: 'hsl(36, 30%, 88%)' }}>
              {[
                { val: '40+', label: 'Varian Mewah' },
                { val: '100%', label: 'Bahan Alami' },
                { val: '10k+', label: 'Kue Terjual' },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-xl font-bold" style={{ color: 'hsl(25, 30%, 12%)' }}>{s.val}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5"
                    style={{ color: 'hsl(32, 60%, 50%)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: decorative card */}
          <div className="flex-1 w-full max-w-sm lg:max-w-none relative">
            <div className="absolute -inset-3 rounded-3xl opacity-20 blur-2xl"
              style={{ background: 'linear-gradient(135deg, hsl(36,70%,70%), hsl(32,90%,55%))' }} />
            <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/3]"
              style={{ background: 'hsl(36, 30%, 88%)' }}>
              <div className="w-full h-full flex items-center justify-center text-8xl select-none">
                🎂
              </div>
              {/* Card overlay */}
              <div className="absolute bottom-4 left-4 right-4 rounded-2xl p-3 shadow-lg"
                style={{ background: 'rgba(255,255,255,0.97)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-widest block mb-0.5"
                      style={{ color: 'hsl(32, 90%, 44%)' }}>Best Seller</span>
                    <p className="text-sm font-bold" style={{ fontFamily: '"Playfair Display", serif', color: 'hsl(25, 30%, 12%)' }}>
                      Signature Opera Cake
                    </p>
                  </div>
                  <div className="flex text-xs gap-0.5" style={{ color: 'hsl(32, 90%, 50%)' }}>
                    {[...Array(5)].map((_, i) => <Star key={i} size={11} fill="currentColor" />)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature Strip ─────────────────────────────────── */}
      <section className="py-10" style={{ background: 'hsl(25, 30%, 12%)' }}>
        <div className="max-w-6xl mx-auto px-5 grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="flex items-start gap-4">
              <div className="rounded-full p-3 shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <f.icon size={20} style={{ color: 'hsl(36, 60%, 70%)' }} />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm"
                  style={{ fontFamily: '"Playfair Display", serif' }}>{f.title}</h3>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: 'hsl(36, 20%, 62%)' }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bestsellers ───────────────────────────────────── */}
      {bestsellers.length > 0 && (
        <section className="py-14" style={{ background: 'white' }}>
          <div className="max-w-6xl mx-auto px-5 space-y-6">
            <div className="flex items-center gap-2">
              <Star size={18} fill="hsl(32,90%,44%)" style={{ color: 'hsl(32,90%,44%)' }} />
              <h2 className="text-xl font-bold"
                style={{ fontFamily: '"Playfair Display", serif', color: 'hsl(25, 30%, 12%)' }}>
                Paling Laris
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {bestsellers.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── Full Catalog ──────────────────────────────────── */}
      <section id="katalog" className="py-14" style={{ background: 'hsl(36, 33%, 97%)' }}>
        <div className="max-w-6xl mx-auto px-5 space-y-6">

          {/* Section header */}
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'hsl(32, 90%, 44%)' }}>Pilih Favorit Anda</span>
            <h2 className="text-2xl sm:text-3xl font-bold"
              style={{ fontFamily: '"Playfair Display", serif', color: 'hsl(25, 30%, 12%)' }}>
              Katalog Menu & Paket Premium
            </h2>
            <p className="text-xs sm:text-sm" style={{ color: 'hsl(25, 15%, 50%)' }}>
              Pilih kue terbaik, tambahkan ke keranjang, dan checkout dengan mudah.
            </p>
          </div>

          {/* Search + filters */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 border-b pb-5"
            style={{ borderColor: 'hsl(36, 25%, 88%)' }}>
            {/* Search */}
            <div className="relative flex-1 md:max-w-xs">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2"
                style={{ color: 'hsl(25, 15%, 55%)' }} />
              <input type="text" placeholder="Cari kue atau pastry..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-full border text-sm outline-none transition-all"
                style={{ borderColor: 'hsl(36, 25%, 85%)', background: 'white' }} />
            </div>

            {/* Category pills */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className="shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all"
                  style={activeCategory === cat
                    ? { background: 'hsl(32, 90%, 44%)', color: 'white' }
                    : { background: 'white', color: 'hsl(25, 20%, 42%)', border: '1px solid hsl(36,25%,86%)' }
                  }>
                  {categoryEmoji[cat] ?? '🧁'} {cat === 'all' ? 'Semua' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="text-5xl">🍪</div>
              <p className="font-semibold" style={{ fontFamily: '"Playfair Display", serif', color: 'hsl(25, 25%, 35%)' }}>
                Menu tidak ditemukan
              </p>
              <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>Coba kata kunci lain.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* ── Promo Banner ──────────────────────────────────── */}
      <section className="py-14 bg-white">
        <div className="max-w-6xl mx-auto px-5">
          <div className="relative overflow-hidden rounded-3xl px-8 py-12 text-center space-y-5"
            style={{ background: 'hsl(25, 30%, 12%)' }}>
            <h2 className="text-2xl sm:text-3xl font-bold text-white"
              style={{ fontFamily: '"Playfair Display", serif' }}>
              Diskon Rp 50.000 untuk Pesanan Pertama
            </h2>
            <p className="text-sm max-w-md mx-auto" style={{ color: 'hsl(36, 20%, 62%)' }}>
              Gunakan kode{' '}
              <span className="px-2 py-1 rounded font-mono font-bold text-white"
                style={{ background: 'rgba(255,255,255,0.15)' }}>NEW50K</span>
              {' '}pada catatan pesanan Anda.
            </p>
            <a href="#katalog"
              className="inline-block px-7 py-3 rounded-full text-sm font-semibold transition-all hover:shadow-xl hover:-translate-y-0.5"
              style={{ background: 'white', color: 'hsl(25, 30%, 12%)' }}>
              Mulai Belanja
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="border-t py-10" style={{ background: 'hsl(25, 30%, 10%)', borderColor: 'hsl(25, 20%, 18%)' }}>
        <div className="max-w-6xl mx-auto px-5 flex flex-col md:flex-row items-start justify-between gap-8">
          {/* Brand */}
          <div className="space-y-2 max-w-xs">
            <p className="text-2xl font-bold" style={{ fontFamily: '"Playfair Display", serif', color: 'white' }}>
              Eattie<span style={{ color: 'hsl(32, 90%, 50%)' }}>.</span>
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'hsl(36, 15%, 55%)' }}>
              Premium artisan patisserie — kue mewah buatan tangan, bahan alami pilihan.
            </p>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-8 text-xs" style={{ color: 'hsl(36, 15%, 55%)' }}>
            <div className="space-y-2">
              <p className="font-semibold uppercase tracking-wider text-white text-[10px]">Navigasi</p>
              <Link href="/store" className="block hover:text-orange-300 transition-colors">Katalog</Link>
              <Link href="/store/track" className="block hover:text-orange-300 transition-colors">Lacak Pesanan</Link>
              <Link href="/store/checkout" className="block hover:text-orange-300 transition-colors">Keranjang</Link>
            </div>
            <div className="space-y-2">
              <p className="font-semibold uppercase tracking-wider text-white text-[10px]">Bantuan</p>
              <span className="block">Pangkalan Kerinci delivery</span>
              <span className="block">Varian diet</span>
              <span className="block">Hampers & Korporat</span>
            </div>
          </div>
        </div>
        <div className="mt-10 border-t pt-6 text-center text-[10px]"
          style={{ borderColor: 'hsl(25, 20%, 18%)', color: 'hsl(36, 10%, 45%)' }}>
          © {new Date().getFullYear()} Eattie — By ANA. Hak Cipta Dilindungi.
        </div>
      </footer>

      {/* ── Floating Cart Bar ─────────────────────────────── */}
      {itemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto z-50">
          <Link href="/store/checkout"
            className="flex items-center justify-between w-full px-5 py-3.5 rounded-2xl shadow-2xl text-white font-semibold"
            style={{ background: 'hsl(25, 30%, 12%)', border: '1px solid hsl(25, 20%, 22%)' }}>
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'hsl(32, 90%, 44%)' }}>
                {itemCount}
              </span>
              <span className="text-sm">Lihat Keranjang</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: 'hsl(32, 90%, 65%)' }}>
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
