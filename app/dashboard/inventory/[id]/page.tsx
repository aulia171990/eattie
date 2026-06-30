import { getIngredient, getStockMovements } from '@/actions/ingredients'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatCurrency, formatNumber, formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Edit, TrendingUp, TrendingDown } from 'lucide-react'

export default async function IngredientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let ingredient
  try {
    ingredient = await getIngredient(id)
  } catch {
    notFound()
  }

  const movements = await getStockMovements(id, 20)

  const stockStatus =
    ingredient.current_stock <= 0
      ? 'out'
      : ingredient.current_stock <= ingredient.min_stock
      ? 'critical'
      : ingredient.reorder_point != null &&
        ingredient.current_stock <= ingredient.reorder_point
      ? 'low'
      : 'normal'

  const infoRows = [
    { label: 'Kode', value: ingredient.code ?? '—' },
    { label: 'Kategori', value: ingredient.ingredient_categories?.name ?? '—' },
    { label: 'Satuan Dasar', value: ingredient.base_unit },
    { label: 'Satuan Beli', value: ingredient.purchase_unit ?? '—' },
    {
      label: 'Konversi',
      value:
        ingredient.purchase_unit
          ? `1 ${ingredient.purchase_unit} = ${ingredient.conversion_rate} ${ingredient.base_unit}`
          : '—',
    },
    { label: 'Lokasi', value: ingredient.storage_location ?? '—' },
    { label: 'Harga/Unit', value: formatCurrency(ingredient.price_per_unit) },
    { label: 'Supplier Utama', value: ingredient.suppliers?.name ?? '—' },
  ]

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader
        title={ingredient.name}
        description={ingredient.name_en ?? undefined}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory', href: '/dashboard/inventory' },
          { label: ingredient.name },
        ]}
        action={
          <Link
            href={`/dashboard/inventory/${id}/edit`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'hsl(var(--primary))' }}
          >
            <Edit size={15} /> Edit
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div
          className="bg-white rounded-xl border p-5 col-span-1 lg:col-span-2"
          style={{ borderColor: 'hsl(var(--border))' }}
        >
          <h2 className="font-semibold text-sm mb-4" style={{ color: 'hsl(var(--foreground))' }}>
            Informasi Bahan
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
            {infoRows.map((row) => (
              <div key={row.label}>
                <dt className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>{row.label}</dt>
                <dd className="text-sm font-medium mt-0.5" style={{ color: 'hsl(var(--foreground))' }}>
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'hsl(var(--border))' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>
                Stok Saat Ini
              </h2>
              <StatusBadge status={stockStatus} type="stock" />
            </div>
            <p
              className="text-3xl font-bold"
              style={{
                color:
                  stockStatus === 'out' || stockStatus === 'critical'
                    ? 'hsl(var(--danger))'
                    : 'hsl(var(--foreground))',
              }}
            >
              {formatNumber(ingredient.current_stock, 2)}
            </p>
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-muted))' }}>
              {ingredient.base_unit}
            </p>

            <div className="mt-3 pt-3 border-t space-y-1" style={{ borderColor: 'hsl(var(--border))' }}>
              <div className="flex justify-between text-xs">
                <span style={{ color: 'hsl(var(--text-muted))' }}>Minimum</span>
                <span style={{ color: 'hsl(var(--text-secondary))' }}>
                  {formatNumber(ingredient.min_stock)} {ingredient.base_unit}
                </span>
              </div>
              {ingredient.reorder_point != null && (
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'hsl(var(--text-muted))' }}>Reorder Point</span>
                  <span style={{ color: 'hsl(var(--text-secondary))' }}>
                    {formatNumber(ingredient.reorder_point)} {ingredient.base_unit}
                  </span>
                </div>
              )}
              {ingredient.max_stock != null && (
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'hsl(var(--text-muted))' }}>Maksimum</span>
                  <span style={{ color: 'hsl(var(--text-secondary))' }}>
                    {formatNumber(ingredient.max_stock)} {ingredient.base_unit}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/dashboard/inventory/movements?ingredient=${id}`}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-medium text-center border"
              style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-secondary))' }}
            >
              📊 Pergerakan
            </Link>
            <Link
              href="/dashboard/inventory/purchases/new"
              className="flex-1 py-2 px-3 rounded-lg text-xs font-medium text-center text-white"
              style={{ background: 'hsl(var(--primary))' }}
            >
              + Beli Stok
            </Link>
          </div>
        </div>
      </div>

      {/* Movement history */}
      <div className="bg-white rounded-xl border" style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>
            Riwayat Pergerakan Stok (20 Terakhir)
          </h2>
        </div>
        {movements.length === 0 ? (
          <div className="py-8 text-center text-sm" style={{ color: 'hsl(var(--text-muted))' }}>
            Belum ada pergerakan stok
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
            {movements.map((mv) => {
              const isIn = mv.quantity > 0
              return (
                <div key={mv.id} className="flex items-center gap-4 px-5 py-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: isIn ? 'hsl(142, 50%, 92%)' : 'hsl(var(--danger-bg))',
                      color: isIn ? 'hsl(var(--success))' : 'hsl(var(--danger))',
                    }}
                  >
                    {isIn ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                      {mv.movement_type
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'hsl(var(--text-muted))' }}>
                      {mv.reason ?? mv.notes ?? '—'} • {formatDateTime(mv.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: isIn ? 'hsl(var(--success))' : 'hsl(var(--danger))' }}
                    >
                      {isIn ? '+' : ''}{formatNumber(mv.quantity, 2)} {mv.unit}
                    </p>
                    <p className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
                      → {formatNumber(mv.stock_after, 2)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

