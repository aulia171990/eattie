import Link from 'next/link'
import { getProductionBatches } from '@/actions/production'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatDate } from '@/lib/utils'
import { PRODUCT_CATEGORIES } from '@/lib/constants'
import { Plus, Calendar } from 'lucide-react'

interface SearchParams { status?: string }

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const batches = await getProductionBatches({ status: sp.status })

  const counts = {
    all: batches.length,
    planned: batches.filter((b) => b.status === 'planned').length,
    in_progress: batches.filter((b) => b.status === 'in_progress').length,
    completed: batches.filter((b) => b.status === 'completed').length,
  }

  const tabs = [
    { value: '', label: 'Semua', count: counts.all },
    { value: 'planned', label: 'Direncanakan', count: counts.planned },
    { value: 'in_progress', label: 'Berlangsung', count: counts.in_progress },
    { value: 'completed', label: 'Selesai', count: counts.completed },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="Produksi"
        description="Jadwal dan tracking batch produksi"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Produksi' },
        ]}
        action={
          <Link
            href="/dashboard/production/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'hsl(var(--primary))' }}
          >
            <Plus size={16} /> Buat Batch
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Batch',    value: counts.all,         color: 'hsl(var(--info))', bg: 'hsl(var(--info-bg))' },
          { label: 'Direncanakan',   value: counts.planned,     color: 'hsl(var(--primary))',  bg: 'hsl(var(--primary-subtle))' },
          { label: 'Berlangsung',    value: counts.in_progress, color: 'hsl(var(--success))', bg: 'hsl(var(--success-bg))' },
          { label: 'Selesai',        value: counts.completed,   color: 'hsl(var(--info))', bg: 'hsl(var(--info-bg))' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border p-4" style={{ borderColor: 'hsl(var(--border))' }}>
            <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-muted))' }}>{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = sp.status === tab.value || (!sp.status && !tab.value)
          return (
            <Link
              key={tab.value}
              href={tab.value ? `/dashboard/production?status=${tab.value}` : '/dashboard/production'}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap"
              style={
                isActive
                  ? { background: 'hsl(var(--primary))', color: 'white' }
                  : { background: 'hsl(var(--surface-raised))', color: 'hsl(var(--text-muted))' }
              }
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded-full text-xs"
                  style={
                    isActive
                      ? { background: 'rgba(255,255,255,0.3)' }
                      : { background: 'hsl(var(--border))' }
                  }
                >
                  {tab.count}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {batches.length === 0 ? (
        <EmptyState
          icon="🏭"
          title="Belum ada batch produksi"
          actionLabel="Buat Batch Produksi"
          actionHref="/dashboard/production/new"
        />
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'hsl(var(--surface-raised))' }}>
                  {['No. Batch', 'Produk', 'Jadwal', 'Target', 'Hasil', 'Status', 'Aksi'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold"
                      style={{ color: 'hsl(var(--text-muted))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => {
                  const emoji =
                    PRODUCT_CATEGORIES.find((c) => c.value === batch.products?.category)?.emoji ?? '🥐'
                  return (
                    <tr key={batch.id} className="border-t hover:bg-gray-50/50 transition-colors"
                      style={{ borderColor: 'hsl(var(--border))' }}>
                      <td className="px-4 py-3 text-xs font-mono font-medium"
                        style={{ color: 'hsl(var(--text-secondary))' }}>
                        {batch.batch_number}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span>{emoji}</span>
                          <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                            {batch.products?.name ?? '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs"
                          style={{ color: 'hsl(var(--text-muted))' }}>
                          <Calendar size={12} />
                          {batch.scheduled_date ? formatDate(batch.scheduled_date) : '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'hsl(var(--foreground))' }}>
                        {batch.quantity_planned} pcs
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                          {batch.quantity_produced}
                        </span>
                        <span className="text-xs ml-1" style={{ color: 'hsl(var(--text-muted))' }}>
                          / {batch.quantity_planned}
                        </span>
                        {batch.quantity_defect > 0 && (
                          <span className="text-xs ml-2" style={{ color: 'hsl(var(--danger))' }}>
                            ({batch.quantity_defect} defect)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={batch.status} type="production" />
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/production/${batch.id}`}
                          className="text-xs px-2 py-1 rounded-md hover:bg-gray-100"
                          style={{ color: 'hsl(var(--info))' }}>
                          Detail
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
