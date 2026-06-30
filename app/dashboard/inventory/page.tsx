import Link from 'next/link'
import { getIngredients, getCategories } from '@/actions/ingredients'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { Plus, Search, Package, AlertTriangle, TrendingDown, Archive } from 'lucide-react'

interface SearchParams { search?: string; category?: string; filter?: string }

export default async function InventoryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const ingredients = await getIngredients({ search: sp.search, categoryId: sp.category, isActive: true, lowStock: sp.filter === 'low_stock' })
  const categories = await getCategories()

  const totalValue = ingredients.reduce((sum, i) => sum + (i.current_stock * i.price_per_unit), 0)
  const lowStockItems = ingredients.filter(i => i.current_stock <= i.min_stock)
  const outOfStock = ingredients.filter(i => i.current_stock <= 0)

  const statData = [
    { label: 'Total Item', value: ingredients.length, color: 'hsl(var(--info-bg))', iconColor: 'hsl(var(--info))' },
    { label: 'Nilai Inventory', value: formatCurrency(totalValue), color: 'hsl(var(--primary-subtle))', iconColor: 'hsl(var(--primary))' },
    { label: 'Stok Rendah', value: lowStockItems.length, color: lowStockItems.length > 0 ? 'hsl(var(--danger-bg))' : 'hsl(142, 50%, 92%)', iconColor: lowStockItems.length > 0 ? 'hsl(0, 70%, 48%)' : 'hsl(var(--success))' },
    { label: 'Stok Habis', value: outOfStock.length, color: outOfStock.length > 0 ? 'hsl(var(--danger-bg))' : 'hsl(142, 50%, 92%)', iconColor: outOfStock.length > 0 ? 'hsl(0, 70%, 48%)' : 'hsl(var(--success))' },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="Inventory Bahan Baku"
        description="Kelola stok dan bahan baku toko roti"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Inventory' }]}
        action={
          <Link href="/dashboard/inventory/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'hsl(var(--primary))' }}>
            <Plus size={16} /> Tambah Bahan
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statData.map(s => (
          <div key={s.label} className="bg-white rounded-xl border p-4" style={{ borderColor: 'hsl(var(--border))' }}>
            <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-muted))' }}>{s.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: 'hsl(var(--foreground))' }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border mb-4" style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="flex flex-col sm:flex-row gap-3 p-4">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-muted))' }} />
            <input name="search" defaultValue={sp.search} placeholder="Cari bahan baku..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/inventory"
              className="px-3 py-2 rounded-lg text-xs font-medium"
              style={!sp.filter ? { background: 'hsl(var(--primary))', color: 'white' } : { background: 'hsl(36, 15%, 93%)', color: 'hsl(var(--text-muted))' }}>
              Semua
            </Link>
            <Link href="/dashboard/inventory?filter=low_stock"
              className="px-3 py-2 rounded-lg text-xs font-medium"
              style={sp.filter === 'low_stock' ? { background: 'hsl(var(--primary))', color: 'white' } : { background: 'hsl(36, 15%, 93%)', color: 'hsl(var(--text-muted))' }}>
              Stok Rendah {lowStockItems.length > 0 && `(${lowStockItems.length})`}
            </Link>
          </div>
        </div>
        <div className="flex gap-2 px-4 pb-4 overflow-x-auto">
          <Link href={sp.filter ? `/dashboard/inventory?filter=${sp.filter}` : '/dashboard/inventory'}
            className="px-3 py-1 rounded-full text-xs whitespace-nowrap"
            style={!sp.category ? { background: 'hsl(var(--text-secondary))', color: 'white' } : { background: 'hsl(36, 15%, 93%)', color: 'hsl(var(--text-muted))' }}>
            Semua Kategori
          </Link>
          {categories.map(cat => (
            <Link key={cat.id} href={`/dashboard/inventory?category=${cat.id}${sp.filter ? `&filter=${sp.filter}` : ''}`}
              className="px-3 py-1 rounded-full text-xs whitespace-nowrap"
              style={sp.category === cat.id ? { background: 'hsl(var(--text-secondary))', color: 'white' } : { background: 'hsl(36, 15%, 93%)', color: 'hsl(var(--text-muted))' }}>
              {cat.name}
            </Link>
          ))}
        </div>
      </div>

      {ingredients.length === 0 ? (
        <EmptyState icon="📦" title="Belum ada bahan baku" actionLabel="Tambah Bahan Baku" actionHref="/dashboard/inventory/new" />
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'hsl(var(--surface-raised))' }}>
                  {['Kode', 'Nama Bahan', 'Kategori', 'Stok', 'Satuan', 'Harga/Unit', 'Status', 'Aksi'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-muted))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ingredients.map(item => {
                  const stockStatus = item.current_stock <= 0 ? 'out' : item.current_stock <= item.min_stock ? 'critical' : item.reorder_point && item.current_stock <= item.reorder_point ? 'low' : 'normal'
                  return (
                    <tr key={item.id} className="border-t hover:bg-gray-50/50 transition-colors" style={{ borderColor: 'hsl(var(--border))' }}>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--text-muted))' }}>{item.code ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/inventory/${item.id}`} className="text-sm font-medium hover:underline" style={{ color: 'hsl(var(--foreground))' }}>{item.name}</Link>
                        {item.name_en && <p className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>{item.name_en}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-muted))' }}>{(item.ingredient_categories as { name: string } | null)?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold" style={{ color: stockStatus === 'out' || stockStatus === 'critical' ? 'hsl(var(--danger))' : stockStatus === 'low' ? 'hsl(var(--primary-hover))' : 'hsl(var(--foreground))' }}>
                          {formatNumber(item.current_stock, 2)}
                        </span>
                        {item.min_stock > 0 && <span className="text-xs ml-1" style={{ color: 'hsl(var(--text-muted))' }}>/ min {formatNumber(item.min_stock)}</span>}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-muted))' }}>{item.base_unit}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'hsl(var(--foreground))' }}>{formatCurrency(item.price_per_unit)}</td>
                      <td className="px-4 py-3"><StatusBadge status={stockStatus} type="stock" /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link href={`/dashboard/inventory/${item.id}`} className="text-xs px-2 py-1 rounded-md hover:bg-gray-100" style={{ color: 'hsl(var(--info))' }}>Detail</Link>
                          <Link href={`/dashboard/inventory/${item.id}/edit`} className="text-xs px-2 py-1 rounded-md hover:bg-gray-100" style={{ color: 'hsl(var(--primary))' }}>Edit</Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t text-xs" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-muted))' }}>
            Menampilkan {ingredients.length} bahan baku
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
        {[
          { href: '/dashboard/inventory/purchases', label: '📋 Pembelian', desc: 'Catat stok masuk' },
          { href: '/dashboard/inventory/movements', label: '📊 Pergerakan', desc: 'History stok' },
          { href: '/dashboard/inventory/opname', label: '🔍 Stock Opname', desc: 'Audit stok fisik' },
          { href: '/dashboard/inventory/suppliers', label: '🏪 Supplier', desc: 'Kelola pemasok' },
        ].map(link => (
          <Link key={link.href} href={link.href} className="bg-white rounded-xl border p-4 hover:shadow-sm transition-all" style={{ borderColor: 'hsl(var(--border))' }}>
            <div className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>{link.label}</div>
            <div className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-muted))' }}>{link.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
