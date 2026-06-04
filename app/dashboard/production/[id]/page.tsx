import { getProductionBatch, updateBatchStatus } from '@/actions/production'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatDate, formatDateTime } from '@/lib/utils'
import { notFound } from 'next/navigation'
import { BatchUpdateForm } from '@/components/forms/batch-update-form'

export default async function ProductionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let batch
  try {
    batch = await getProductionBatch(id)
  } catch {
    notFound()
  }

  const boundAction = updateBatchStatus.bind(null, id)
  const canUpdate =
    batch.status !== 'completed' && batch.status !== 'cancelled'

  const statsRows = [
    { label: 'Target Produksi', value: `${batch.quantity_planned} pcs` },
    { label: 'Hasil Produksi', value: `${batch.quantity_produced} pcs` },
    { label: 'Defect / Reject', value: `${batch.quantity_defect} pcs` },
    { label: 'Tanggal Jadwal', value: batch.scheduled_date ? formatDate(batch.scheduled_date) : '—' },
  ]

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader
        title={batch.batch_number}
        description={batch.products?.name ?? 'Batch Produksi'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Produksi', href: '/dashboard/production' },
          { label: batch.batch_number },
        ]}
        action={<StatusBadge status={batch.status} type="production" />}
      />

      <div className="grid grid-cols-2 gap-4 mb-6">
        {statsRows.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border p-4" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
            <p className="text-xs" style={{ color: 'hsl(25, 15%, 50%)' }}>{s.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: 'hsl(25, 30%, 12%)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border p-5 mb-4" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
        <h2 className="font-semibold text-sm mb-3" style={{ color: 'hsl(25, 30%, 15%)' }}>Timeline</h2>
        <div className="space-y-2 text-sm">
          {[
            { label: 'Dibuat', value: formatDateTime(batch.created_at) },
            { label: 'Mulai Produksi', value: batch.started_at ? formatDateTime(batch.started_at) : '—' },
            { label: 'Selesai', value: batch.completed_at ? formatDateTime(batch.completed_at) : '—' },
            { label: 'Dibuat Oleh', value: batch.profiles?.full_name ?? '—' },
          ].map((row) => (
            <div key={row.label} className="flex justify-between">
              <span style={{ color: 'hsl(25, 15%, 50%)' }}>{row.label}</span>
              <span style={{ color: 'hsl(25, 30%, 20%)' }}>{row.value}</span>
            </div>
          ))}
        </div>
        {batch.notes && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: 'hsl(36, 20%, 92%)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'hsl(25, 15%, 50%)' }}>Catatan</p>
            <p className="text-sm" style={{ color: 'hsl(25, 30%, 20%)' }}>{batch.notes}</p>
          </div>
        )}
      </div>

      {canUpdate && (
        <BatchUpdateForm
          action={boundAction}
          currentStatus={batch.status}
          currentProduced={batch.quantity_produced}
        />
      )}
    </div>
  )
}
