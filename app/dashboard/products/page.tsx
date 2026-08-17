import Link from 'next/link'
import { getProducts } from '@/actions/products'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Plus } from 'lucide-react'
import type { Product } from '@/types'
import { ProductListControls } from '@/components/products/product-list-controls'

type FilterKey = 'all' | 'active' | 'inactive' | 'out_of_stock'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Total Produk' },
  { key: 'active', label: 'Aktif' },
  { key: 'inactive', label: 'Nonaktif' },
  { key: 'out_of_stock', label: 'Stok Habis' },
]

type SearchParams = { status?: string }

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const products = await getProducts()
  const typedProducts = products as (Product & { current_stock: number; min_stock: number })[]
  const active = typedProducts.filter(p => p.is_active)
  const inactive = typedProducts.filter(p => !p.is_active)
  const outOfStock = active.filter(p => p.current_stock <= 0)

  const activeFilter = (sp.status as FilterKey) ?? 'all'
  const filteredProducts = activeFilter === 'all'
    ? typedProducts
    : activeFilter === 'active'
      ? active
      : activeFilter === 'inactive'
        ? inactive
        : outOfStock

  const counts: Record<FilterKey, number> = {
    all: typedProducts.length,
    active: active.length,
    inactive: inactive.length,
    out_of_stock: outOfStock.length,
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Katalog Produk"
        description="Kelola produk roti dan kue"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Produk' }]}
        action={
          <Link href="/dashboard/products/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'hsl(var(--primary))' }}>
            <Plus size={16} /> Tambah Produk
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {FILTERS.map(f => {
          const href = f.key === 'all' ? '/dashboard/products' : `/dashboard/products?status=${f.key}`
          const selected = activeFilter === f.key
          return (
            <Link
              key={f.key}
              href={href}
              className="rounded-xl border p-4 transition-all hover:shadow-sm"
              style={{
                borderColor: selected ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                background: selected ? 'hsl(var(--primary-subtle))' : 'white',
              }}
            >
              <p className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>{f.label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'hsl(var(--foreground))' }}>{counts[f.key]}</p>
            </Link>
          )
        })}
      </div>

      {filteredProducts.length === 0 ? (
        <EmptyState icon="🥐" title="Belum ada produk" actionLabel="Tambah Produk" actionHref="/dashboard/products/new" />
      ) : (
        <ProductListControls products={filteredProducts} />
      )}
    </div>
  )
}
