import { getFinancialReport } from '@/actions/reports'
import { PageHeader } from '@/components/shared/page-header'
import { formatCurrency } from '@/lib/utils'
import { FinancialReportCharts } from '@/components/charts/financial-report-charts'
import { EXPENSE_CATEGORIES } from '@/lib/constants'
import { format, startOfYear } from 'date-fns'

interface SearchParams { dateFrom?: string; dateTo?: string }

export default async function FinancialReportPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const today = format(new Date(), 'yyyy-MM-dd')
  const dateFrom = sp.dateFrom ?? format(startOfYear(new Date()), 'yyyy-MM-dd')
  const dateTo = sp.dateTo ?? today

  const data = await getFinancialReport(dateFrom, dateTo)

  return (
    <div className="p-6">
      <PageHeader
        title="Laporan Keuangan"
        description="Profit & Loss, pendapatan vs pengeluaran"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Laporan', href: '/dashboard/reports' }, { label: 'Keuangan' }]}
      />

      <form className="flex flex-wrap gap-3 mb-6 bg-white rounded-xl border p-4" style={{ borderColor: 'hsl(var(--border))' }}>
        {[
          { name: 'dateFrom', label: 'Dari', value: dateFrom },
          { name: 'dateTo', label: 'Sampai', value: dateTo },
        ].map(f => (
          <div key={f.name} className="flex items-center gap-2">
            <label className="text-xs font-medium whitespace-nowrap" style={{ color: 'hsl(var(--text-muted))' }}>{f.label}</label>
            <input name={f.name} type="date" defaultValue={f.value}
              className="px-3 py-2 rounded-lg border text-sm outline-none" style={{ borderColor: 'hsl(var(--border))' }} />
          </div>
        ))}
        {[
          { label: 'Bulan Ini', from: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'), to: today },
          { label: 'Tahun Ini', from: format(startOfYear(new Date()), 'yyyy-MM-dd'), to: today },
        ].map(p => (
          <a key={p.label} href={`?dateFrom=${p.from}&dateTo=${p.to}`}
            className="px-3 py-2 rounded-lg text-xs font-medium border"
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
          {/* P&L Summary */}
          <div className="bg-white rounded-xl border p-6 mb-6" style={{ borderColor: 'hsl(var(--border))' }}>
            <h2 className="font-semibold text-sm mb-5" style={{ color: 'hsl(var(--foreground))' }}>Ringkasan P&L</h2>
            <div className="space-y-3">
              {[
                { label: 'Pendapatan Kotor', value: data.revenue, color: 'hsl(var(--success))', indent: false },
                { label: 'Total Diskon', value: -data.totalDiscount, color: 'hsl(var(--danger))', indent: true },
                { label: 'Total Pengeluaran', value: -data.totalExpenses, color: 'hsl(var(--danger))', indent: false },
                { label: 'Laba Bersih', value: data.netProfit, color: data.netProfit >= 0 ? 'hsl(var(--success))' : 'hsl(var(--danger))', indent: false, bold: true },
              ].map(row => (
                <div key={row.label}
                  className={`flex items-center justify-between py-2 ${row.bold ? 'border-t-2 pt-3 mt-1' : 'border-t'}`}
                  style={{ borderColor: row.bold ? 'hsl(var(--foreground))' : 'hsl(var(--border))' }}>
                  <span className={`${row.bold ? 'font-bold text-base' : 'text-sm'} ${row.indent ? 'pl-4' : ''}`}
                    style={{ color: 'hsl(var(--text-secondary))' }}>
                    {row.indent && '↳ '}{row.label}
                  </span>
                  <span className={row.bold ? 'font-bold text-xl' : 'font-semibold text-sm'}
                    style={{ color: row.color }}>
                    {row.value < 0 ? `-${formatCurrency(Math.abs(row.value))}` : formatCurrency(row.value)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t flex items-center justify-between"
              style={{ borderColor: 'hsl(var(--border))' }}>
              <span className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>Margin Laba</span>
              <span className="text-lg font-bold"
                style={{ color: data.profitMargin >= 0 ? 'hsl(var(--success))' : 'hsl(var(--danger))' }}>
                {data.profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Monthly P&L chart */}
          {data.monthlyTrend.length > 1 && (
            <FinancialReportCharts monthlyTrend={data.monthlyTrend} />
          )}

          {/* Expense breakdown */}
          {data.expenseBreakdown.length > 0 && (
            <div className="mt-6 bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                <h2 className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>Rincian Pengeluaran</h2>
              </div>
              <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                {data.expenseBreakdown.map(exp => {
                  const cat = EXPENSE_CATEGORIES.find(c => c.value === exp.category)
                  const pct = data.totalExpenses > 0 ? (exp.amount / data.totalExpenses * 100) : 0
                  return (
                    <div key={exp.category} className="px-5 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                          {cat?.label ?? exp.category}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
                            {pct.toFixed(1)}%
                          </span>
                          <span className="text-sm font-semibold" style={{ color: 'hsl(var(--danger))' }}>
                            {formatCurrency(exp.amount)}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full" style={{ background: 'hsl(var(--border))' }}>
                        <div className="h-1.5 rounded-full"
                          style={{ width: `${pct}%`, background: 'hsl(0, 70%, 55%)' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="px-5 py-3 border-t flex justify-between"
                style={{ borderColor: 'hsl(var(--border))' }}>
                <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-secondary))' }}>Total</span>
                <span className="text-sm font-bold" style={{ color: 'hsl(var(--danger))' }}>
                  {formatCurrency(data.totalExpenses)}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
