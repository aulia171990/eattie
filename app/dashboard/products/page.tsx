import Link from 'next/link'
import Image from 'next/image'
import { getProducts } from '@/actions/products'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { formatCurrency } from '@/lib/utils'
import { PRODUCT_CATEGORIES } from '@/lib/constants'
import { Plus } from 'lucide-react'
import type { Product } from '@/types'

export default async function ProductsPage() {
  const products = await getProducts()
  const active = products.filter(p => p.is_active)
  const byCategory = PRODUCT_CATEGORIES.map(cat => ({
    ...cat,
    items: active.filter(p => p.category === cat.value)
  })).filter(c => c.items.length > 0)
  const uncategorized = active.filter(p => !p.category)

  return (
    <div className="p-6">
      <PageHeader
        title="Katalog Produk"
        description="Kelola produk roti dan kue"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Produk' }]}
        action={
          <Link href="/dashboard/products/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'hsl(32, 95%, 44%)' }}>
            <Plus size={16} /> Tambah Produk
          </Link>
        }
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Produk', value: products.length },
          { label: 'Aktif', value: active.length },
          { label: 'Nonaktif', value: products.length - active.length },
          { label: 'Stok Habis', value: active.filter(p => (p as Product & { current_stock: number }).current_stock <= 0).length },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border p-4" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
            <p className="text-xs" style={{ color: 'hsl(25, 15%, 50%)' }}>{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'hsl(25, 30%, 12%)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {active.length === 0 ? (
        <EmptyState icon="🥐" title="Belum ada produk" actionLabel="Tambah Produk" actionHref="/dashboard/products/new" />
      ) : (
        <div className="space-y-6">
          {byCategory.map(cat => (
            <div key={cat.value}>
              <h2 className="flex items-center gap-2 font-semibold text-sm mb-3" style={{ color: 'hsl(25, 30%, 20%)' }}>
                <span>{cat.emoji}</span> {cat.label} <span className="text-xs font-normal" style={{ color: 'hsl(25, 15%, 55%)' }}>({cat.items.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {cat.items.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          ))}
          {uncategorized.length > 0 && (
            <div>
              <h2 className="font-semibold text-sm mb-3" style={{ color: 'hsl(25, 30%, 20%)' }}>Lainnya</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {uncategorized.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

type ProductCardType = Product & { current_stock?: number; min_stock?: number }

function ProductCard({ product }: { product: ProductCardType }) {
  const p = product as ProductCardType & { current_stock: number; min_stock: number }
  const margin = p.cost_price > 0 ? ((p.selling_price - p.cost_price) / p.selling_price * 100) : null
  const emoji = PRODUCT_CATEGORIES.find(c => c.value === p.category)?.emoji ?? '🧁'

  return (
    <div className="bg-white rounded-xl border overflow-hidden hover:shadow-sm transition-all" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
      {/* Gambar produk */}
      <div className="relative w-full h-36" style={{ background: 'hsl(36, 50%, 96%)' }}>
        {p.image_url ? (
          <Image
            src={p.image_url}
            alt={p.name}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            {emoji}
          </div>
        )}
        {/* Edit button overlay */}
        <Link
          href={`/dashboard/products/${p.id}/edit`}
          className="absolute top-2 right-2 text-xs px-2 py-1 rounded-md font-medium backdrop-blur-sm"
          style={{ background: 'rgba(255,255,255,0.9)', color: 'hsl(32, 95%, 44%)' }}
        >
          Edit
        </Link>
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-sm leading-tight" style={{ color: 'hsl(25, 30%, 15%)' }}>{p.name}</h3>
        {p.name_en && <p className="text-xs mt-0.5" style={{ color: 'hsl(25, 15%, 55%)' }}>{p.name_en}</p>}
        <div className="mt-2 pt-2 border-t" style={{ borderColor: 'hsl(36, 20%, 92%)' }}>
          <p className="text-base font-bold" style={{ color: 'hsl(32, 95%, 40%)' }}>{formatCurrency(p.selling_price)}</p>
          <div className="flex items-center justify-between mt-0.5">
            <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>HPP: {formatCurrency(p.cost_price)}</p>
            {margin !== null && <span className="text-xs font-medium" style={{ color: 'hsl(142, 60%, 35%)' }}>~{margin.toFixed(0)}%</span>}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: 'hsl(36, 20%, 94%)' }}>
            <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>Stok</p>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                background: p.current_stock <= 0 ? 'hsl(0, 80%, 95%)' : p.current_stock <= p.min_stock ? 'hsl(36, 80%, 90%)' : 'hsl(142, 50%, 90%)',
                color: p.current_stock <= 0 ? 'hsl(0, 70%, 40%)' : p.current_stock <= p.min_stock ? 'hsl(32, 95%, 38%)' : 'hsl(142, 60%, 28%)',
              }}
            >
              {p.current_stock <= 0 ? 'Habis' : `${p.current_stock} pcs`}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
