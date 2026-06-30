import { getSalesReport } from '@/actions/reports'
import { PageHeader } from '@/components/shared/page-header'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { SalesReportCharts } from '@/components/charts/sales-report-charts'
import { format, subDays, startOfMonth } from 'date-fns'

interface SearchParams { dateFrom?: string; dateTo?: string }

export default async function SalesReportPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const today = format(new Date(), 'yyyy-MM-dd')
  const dateFrom = sp.dateFrom ?? format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const dateTo = sp.dateTo ?? today

  const data = await getSalesReport(dateFrom, dateTo)

  const paymentLabels: Record<string, string> = {
    cash: '💵 Tunai', qris: '📱 QRIS', transfer: '🏦 Transfer', card: '💳 Kartu'
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Laporan Penjualan"
        description="Analisis revenue dan transaksi"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Laporan', href: '/dashboard/reports' }, { label: 'Penjualan' }]}
      />

      {/* Date filter */}
      <form className="flex flex-wrap gap-3 mb-6 bg-white rounded-xl border p-4" style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium whitespace-nowrap" style={{ color: 'hsl(var(--text-muted))' }}>Dari</label>
          <input name="dateFrom" type="date" defaultValue={dateFrom}
            className="px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'hsl(var(--border))' }} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium whitespace-nowrap" style={{ color: 'hsl(var(--text-muted))' }}>Sampai</label>
          <input name="dateTo" type="date" defaultValue={dateTo}
            className="px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'hsl(var(--border))' }} />
        </div>
        {/* Preset buttons */}
        {[
          { label: 'Hari Ini', from: today, to: today },
          { label: '7 Hari', from: format(subDays(new Date(), 6), 'yyyy-MM-dd'), to: today },
          { label: 'Bulan Ini', from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: today },
        ].map(p => (
          <a key={p.label} href={`?dateFrom=${p.from}&dateTo=${p.to}`}
            className="px-3 py-2 rounded-lg text-xs font-medium border transition-all hover:bg-gray-50"
            style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-muted))' }}>
            {p.label}
          </a>
        ))}
        <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: 'hsl(var(--primary))' }}>Tampilkan</button>
      </form>

      {!data ? (
        <div className="text-center py-12 text-sm" style={{ color: 'hsl(var(--text-muted))' }}>Tidak ada data</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Pendapatan', value: formatCurrency(data.totalRevenue), color: 'hsl(var(--primary))', bg: 'hsl(var(--primary-subtle))' },
              { label: 'Jumlah Transaksi', value: formatNumber(data.totalTransactions), color: 'hsl(var(--info))', bg: 'hsl(var(--info-bg))' },
              { label: 'Rata-rata Order', value: formatCurrency(data.avgOrder), color: 'hsl(var(--success))', bg: 'hsl(142, 50%, 92%)' },
              { label: 'Total Diskon', value: formatCurrency(data.totalDiscount), color: 'hsl(var(--danger))', bg: 'hsl(var(--danger-bg))' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border p-5" style={{ borderColor: 'hsl(var(--border))' }}>
                <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-muted))' }}>{s.label}</p>
                <p className="text-2xl font-bold mt-2" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <SalesReportCharts dailyData={data.dailyData} byPayment={data.byPayment} />

          {/* Top products + payment breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Top Products */}
            <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                <h2 className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>Produk Terlaris</h2>
              </div>
              <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                {data.topProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-4 px-5 py-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: i < 3 ? 'hsl(var(--primary-subtle))' : 'hsl(var(--border))', color: i < 3 ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))' }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'hsl(var(--foreground))' }}>{p.name}</p>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>{formatNumber(p.qty)} pcs</p>
                    </div>
                    <p className="text-sm font-semibold shrink-0" style={{ color: 'hsl(var(--primary))' }}>
                      {formatCurrency(p.revenue)}
                    </p>
                  </div>
                ))}
                {data.topProducts.length === 0 && (
                  <div className="px-5 py-8 text-center text-sm" style={{ color: 'hsl(var(--text-muted))' }}>Tidak ada data</div>
                )}
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                <h2 className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>Metode Pembayaran</h2>
              </div>
              <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                {data.byPayment.map(p => {
                  const pct = data.totalRevenue > 0 ? (p.total / data.totalRevenue * 100) : 0
                  return (
                    <div key={p.method} className="px-5 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                          {paymentLabels[p.method] ?? p.method}
                        </span>
                        <div className="text-right">
                          <span className="text-sm font-semibold" style={{ color: 'hsl(var(--primary))' }}>
                            {formatCurrency(p.total)}
                          </span>
                          <span className="text-xs ml-2" style={{ color: 'hsl(var(--text-muted))' }}>
                            {p.count}x
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full" style={{ background: 'hsl(var(--border))' }}>
                        <div className="h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%`, background: 'hsl(var(--primary))' }} />
                      </div>
                    </div>
                  )
                })}
                {data.byPayment.length === 0 && (
                  <div className="px-5 py-8 text-center text-sm" style={{ color: 'hsl(var(--text-muted))' }}>Tidak ada data</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
