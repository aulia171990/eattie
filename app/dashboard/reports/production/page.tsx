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
        style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
        {[
          { name: 'dateFrom', label: 'Dari', value: dateFrom },
          { name: 'dateTo', label: 'Sampai', value: dateTo },
        ].map((f) => (
          <div key={f.name} className="flex items-center gap-2">
            <label className="text-xs font-medium whitespace-nowrap"
              style={{ color: 'hsl(25, 15%, 50%)' }}>{f.label}</label>
            <input name={f.name} type="date" defaultValue={f.value}
              className="px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'hsl(36, 20%, 85%)' }} />
          </div>
        ))}
        <button type="submit"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: 'hsl(32, 95%, 44%)' }}>
          Tampilkan
        </button>
      </form>

      {!data ? (
        <div className="text-center py-12 text-sm" style={{ color: 'hsl(25, 15%, 55%)' }}>
          Tidak ada data
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Batch',     value: data.totalBatches,                              color: 'hsl(210, 70%, 40%)', bg: 'hsl(210, 70%, 93%)' },
              { label: 'Total Diproduksi',value: `${formatNumber(data.totalProduced)} pcs`,       color: 'hsl(142, 60%, 35%)', bg: 'hsl(142, 50%, 92%)' },
              { label: 'Tingkat Sukses',  value: `${data.successRate.toFixed(1)}%`,               color: data.successRate >= 90 ? 'hsl(142, 60%, 35%)' : 'hsl(32, 95%, 40%)', bg: 'hsl(36, 80%, 93%)' },
              { label: 'Defect Rate',     value: `${data.defectRate.toFixed(1)}%`,                color: data.defectRate > 5  ? 'hsl(0, 70%, 45%)'     : 'hsl(142, 60%, 35%)', bg: data.defectRate > 5 ? 'hsl(0, 80%, 95%)' : 'hsl(142, 50%, 92%)' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border p-5"
                style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
                <p className="text-xs font-medium" style={{ color: 'hsl(25, 15%, 50%)' }}>{s.label}</p>
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
            style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'hsl(36, 20%, 92%)' }}>
              <h2 className="font-semibold text-sm" style={{ color: 'hsl(25, 30%, 15%)' }}>
                Detail Batch ({data.totalBatches})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'hsl(36, 20%, 97%)' }}>
                    {['No. Batch', 'Produk', 'Jadwal', 'Target', 'Hasil', 'Defect', 'Status'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold"
                        style={{ color: 'hsl(25, 15%, 45%)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.batches.map((b) => (
                    <tr key={b.id} className="border-t hover:bg-gray-50/50"
                      style={{ borderColor: 'hsl(36, 20%, 94%)' }}>
                      <td className="px-4 py-3 text-xs font-mono"
                        style={{ color: 'hsl(25, 30%, 25%)' }}>{b.batch_number}</td>
                      <td className="px-4 py-3 text-sm"
                        style={{ color: 'hsl(25, 30%, 15%)' }}>{b.products?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-xs"
                        style={{ color: 'hsl(25, 15%, 50%)' }}>
                        {b.scheduled_date ? formatDate(b.scheduled_date) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm"
                        style={{ color: 'hsl(25, 30%, 20%)' }}>{b.quantity_planned}</td>
                      <td className="px-4 py-3 text-sm font-medium"
                        style={{ color: 'hsl(142, 60%, 35%)' }}>{b.quantity_produced}</td>
                      <td className="px-4 py-3 text-sm"
                        style={{ color: b.quantity_defect > 0 ? 'hsl(0, 70%, 45%)' : 'hsl(25, 15%, 55%)' }}>
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
