import { getProductionReport } from '@/actions/reports'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatDate, formatNumber } from '@/lib/utils'
import { ProductionReportCharts } from '@/components/charts/production-report-charts'
import { format, startOfMonth } from 'date-fns'

interface SearchParams { dateFrom?: string; dateTo?: string }

export default async function ProductionReportPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const today = format(new Date(), 'yyyy-MM-dd')
  const dateFrom = sp.dateFrom ?? format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const dateTo = sp.dateTo ?? today

  const data = await getProductionReport(dateFrom, dateTo)

  return (
    <div className="p-6">
      <PageHeader
        title="Laporan Produksi"
        description="Output batch dan efisiensi produksi"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Laporan', href: '/dashboard/reports' },
          { label: 'Produksi' },
        ]}
      />

      <form className="flex flex-wrap gap-3 mb-6 bg-white rounded-xl border p-4"
        style={{ borderColor: 'hsl(var(--border))' }}>
        {[
          { name: 'dateFrom', label: 'Dari', value: dateFrom },
          { name: 'dateTo', label: 'Sampai', value: dateTo },
        ].map((f) => (
          <div key={f.name} className="flex items-center gap-2">
            <label className="text-xs font-medium whitespace-nowrap"
              style={{ color: 'hsl(var(--text-muted))' }}>{f.label}</label>
            <input name={f.name} type="date" defaultValue={f.value}
              className="px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'hsl(var(--border))' }} />
          </div>
        ))}
        <button type="submit"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: 'hsl(var(--primary))' }}>
          Tampilkan
        </button>
      </form>

      {!data ? (
        <div className="text-center py-12 text-sm" style={{ color: 'hsl(var(--text-muted))' }}>
          Tidak ada data
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Batch',     value: data.totalBatches,                              color: 'hsl(var(--info))', bg: 'hsl(var(--info-bg))' },
              { label: 'Total Diproduksi',value: `${formatNumber(data.totalProduced)} pcs`,       color: 'hsl(var(--success))', bg: 'hsl(142, 50%, 92%)' },
              { label: 'Tingkat Sukses',  value: `${data.successRate.toFixed(1)}%`,               color: data.successRate >= 90 ? 'hsl(var(--success))' : 'hsl(var(--primary))', bg: 'hsl(var(--primary-subtle))' },
              { label: 'Defect Rate',     value: `${data.defectRate.toFixed(1)}%`,                color: data.defectRate > 5  ? 'hsl(var(--danger))'     : 'hsl(var(--success))', bg: data.defectRate > 5 ? 'hsl(var(--danger-bg))' : 'hsl(142, 50%, 92%)' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border p-5"
                style={{ borderColor: 'hsl(var(--border))' }}>
                <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-muted))' }}>{s.label}</p>
                <p className="text-2xl font-bold mt-2" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {data.byProduct.length > 0 && (
            <ProductionReportCharts
              byProduct={data.byProduct}
              statusBreakdown={data.statusBreakdown}
            />
          )}

          <div className="mt-6 bg-white rounded-xl border overflow-hidden"
            style={{ borderColor: 'hsl(var(--border))' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
              <h2 className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>
                Detail Batch ({data.totalBatches})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'hsl(var(--surface-raised))' }}>
                    {['No. Batch', 'Produk', 'Jadwal', 'Target', 'Hasil', 'Defect', 'Status'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold"
                        style={{ color: 'hsl(var(--text-muted))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.batches.map((b) => (
                    <tr key={b.id} className="border-t hover:bg-gray-50/50"
                      style={{ borderColor: 'hsl(var(--border))' }}>
                      <td className="px-4 py-3 text-xs font-mono"
                        style={{ color: 'hsl(var(--text-secondary))' }}>{b.batch_number}</td>
                      <td className="px-4 py-3 text-sm"
                        style={{ color: 'hsl(var(--foreground))' }}>{b.products?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-xs"
                        style={{ color: 'hsl(var(--text-muted))' }}>
                        {b.scheduled_date ? formatDate(b.scheduled_date) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm"
                        style={{ color: 'hsl(var(--text-secondary))' }}>{b.quantity_planned}</td>
                      <td className="px-4 py-3 text-sm font-medium"
                        style={{ color: 'hsl(var(--success))' }}>{b.quantity_produced}</td>
                      <td className="px-4 py-3 text-sm"
                        style={{ color: b.quantity_defect > 0 ? 'hsl(var(--danger))' : 'hsl(var(--text-muted))' }}>
                        {b.quantity_defect}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={b.status} type="production" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
