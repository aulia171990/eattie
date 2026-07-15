import Link from 'next/link'
import { getProducts } from '@/actions/products'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Plus } from 'lucide-react'
import type { Product } from '@/types'
import { ProductListControls } from '@/components/products/product-list-controls'

export default async function ProductsPage() {
  const products = await getProducts()
  const active = products.filter(p => p.is_active) as (Product & { current_stock: number; min_stock: number })[]

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

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Produk', value: products.length },
          { label: 'Aktif', value: active.length },
          { label: 'Nonaktif', value: products.length - active.length },
          { label: 'Stok Habis', value: active.filter(p => p.current_stock <= 0).length },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border p-4" style={{ borderColor: 'hsl(var(--border))' }}>
            <p className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'hsl(var(--foreground))' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {active.length === 0 ? (
        <EmptyState icon="🥐" title="Belum ada produk" actionLabel="Tambah Produk" actionHref="/dashboard/products/new" />
      ) : (
        <ProductListControls products={active} />
      )}
    </div>
  )
}
