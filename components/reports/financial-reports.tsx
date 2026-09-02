'use client'

import { useState, useEffect } from 'react'
import { getPLReport, getBalanceSheet, getCashFlowReport } from '@/actions/reports'
import type { PLReport, BSReport, CFReport } from '@/actions/reports'
import { formatCurrency } from '@/lib/utils'
import { FileText, TrendingUp, Banknote } from 'lucide-react'

type Tab = 'pl' | 'bs' | 'cf'

export function FinancialReports() {
  const [tab, setTab] = useState<Tab>('pl')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [pl, setPl] = useState<PLReport | null>(null)
  const [bs, setBs] = useState<BSReport | null>(null)
  const [cf, setCf] = useState<CFReport | null>(null)

  // Set default date range to current month
  useEffect(() => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const today = now.toISOString().split('T')[0]
    setFromDate(firstDay)
    setToDate(today)
  }, [])

  async function loadReport() {
    if (!fromDate || !toDate) return
    setLoading(true)
    try {
      const [plRes, bsRes, cfRes] = await Promise.all([
        getPLReport(fromDate, toDate),
        getBalanceSheet(toDate),
        getCashFlowReport(fromDate, toDate),
      ])
      setPl(plRes)
      setBs(bsRes)
      setCf(cfRes)
    } finally {
      setLoading(false)
    }
  }

  const handleLoad = () => { void loadReport() }

  const totalDebit = pl?.revenue.reduce((s, l) => s + l.total, 0) ?? 0
  const totalCredit = (pl?.totalCogs ?? 0) + (pl?.totalOpex ?? 0)

  return (
    <div className="space-y-6">
      {/* Date Range Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'hsl(var(--text-muted))' }}>Tanggal Mulai</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'hsl(var(--border))' }} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'hsl(var(--text-muted))' }}>Tanggal Akhir</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'hsl(var(--border))' }} />
        </div>
        <button
          onClick={handleLoad}
          disabled={loading || !fromDate || !toDate}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: 'hsl(var(--primary))' }}
        >
          {loading ? 'Memuat...' : 'Generate Laporan'}
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
        {[
          { id: 'pl' as Tab, label: 'Laba Rugi', icon: TrendingUp },
          { id: 'bs' as Tab, label: 'Neraca', icon: Banknote },
          { id: 'cf' as Tab, label: 'Arus Kas', icon: FileText },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
            style={{
              borderColor: tab === t.id ? 'hsl(var(--primary))' : 'transparent',
              color: tab === t.id ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
            }}>
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: 'hsl(var(--text-muted))' }}>Memuat laporan...</div>
      ) : (
        <>
          {/* P&L */}
          {tab === 'pl' && pl && (
            <PLContent pl={pl} />
          )}

          {/* Balance Sheet */}
          {tab === 'bs' && bs && (
            <BSContent bs={bs} />
          )}

          {/* Cash Flow */}
          {tab === 'cf' && cf && (
            <CFContent cf={cf} />
          )}
        </>
      )}
    </div>
  )
}

function PLContent({ pl }: { pl: PLReport }) {
  return (
    <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
      <table className="w-full">
        <thead>
          <tr style={{ background: 'hsl(var(--surface-raised))' }}>
            <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-muted))' }}>Akun</th>
            <th className="text-right px-4 py-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-muted))' }}>Jumlah</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colSpan={2} className="px-4 py-2 text-xs font-medium" style={{ color: 'hsl(var(--text-muted))' }}> — REVENUE — </td></tr>
          {pl.revenue.map(r => (
            <tr key={r.account_code} className="border-t" style={{ borderColor: 'hsl(var(--border))' }}>
              <td className="px-4 py-2"><span className="font-mono text-xs" style={{ color: 'hsl(var(--text-secondary))' }}>{r.account_code}</span> <span className="text-sm">{r.account_name}</span></td>
              <td className="px-4 py-2 text-right text-sm font-mono">{formatCurrency(r.total)}</td>
            </tr>
          ))}
          <tr><td colSpan={2} className="px-4 py-2 text-xs font-medium" style={{ color: 'hsl(var(--text-muted))' }}> — COGS — </td></tr>
          {pl.cogs.map(c => (
            <tr key={c.account_code} className="border-t" style={{ borderColor: 'hsl(var(--border))' }}>
              <td className="px-4 py-2"><span className="font-mono text-xs" style={{ color: 'hsl(var(--text-secondary))' }}>{c.account_code}</span> <span className="text-sm">{c.account_name}</span></td>
              <td className="px-4 py-2 text-right text-sm font-mono">{formatCurrency(c.total)}</td>
            </tr>
          ))}
          <tr><td colSpan={2} className="px-4 py-2 text-xs font-medium" style={{ color: 'hsl(var(--text-muted))' }}> — EXPENSES — </td></tr>
          {pl.opex.map(o => (
            <tr key={o.account_code} className="border-t" style={{ borderColor: 'hsl(var(--border))' }}>
              <td className="px-4 py-2"><span className="font-mono text-xs" style={{ color: 'hsl(var(--text-secondary))' }}>{o.account_code}</span> <span className="text-sm">{o.account_name}</span></td>
              <td className="px-4 py-2 text-right text-sm font-mono">{formatCurrency(o.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2" style={{ borderColor: 'hsl(var(--primary))' }}>
            <td className="px-4 py-3 font-semibold">Total Revenue</td>
            <td className="px-4 py-3 text-right font-mono">{formatCurrency(pl.totalRevenue)}</td>
          </tr>
          <tr><td className="px-4 py-2 font-semibold">Total COGS</td><td className="px-4 py-2 text-right font-mono">{formatCurrency(pl.totalCogs)}</td></tr>
          <tr><td className="px-4 py-2 font-semibold">Gross Profit</td><td className="px-4 py-2 text-right font-mono" style={{ color: 'hsl(var(--success))' }}>{formatCurrency(pl.grossProfit)}</td></tr>
          <tr><td className="px-4 py-2 font-semibold">Total Expenses</td><td className="px-4 py-2 text-right font-mono">{formatCurrency(pl.totalOpex)}</td></tr>
          <tr className="border-t-2 font-bold" style={{ borderColor: 'hsl(var(--primary))' }}>
            <td className="px-4 py-3">Net Profit</td>
            <td className="px-4 py-3 text-right" style={{ color: 'hsl(var(--success))' }}>{formatCurrency(pl.netProfit)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function BSContent({ bs }: { bs: BSReport }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <span className="text-sm" style={{ color: 'hsl(var(--text-muted))' }}>Neraca per {bs.asOfDate}</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'hsl(var(--border))' }}>
          <h3 className="font-bold text-sm mb-3" style={{ color: 'hsl(var(--success))' }}>Aset</h3>
          {bs.assets.map(a => (
            <div key={a.account_code} className="flex justify-between text-sm py-1 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
              <span><span className="font-mono text-xs" style={{ color: 'hsl(var(--text-secondary))' }}>{a.account_code}</span> {a.account_name}</span>
              <span className="font-mono">{formatCurrency(a.balance)}</span>
            </div>
          ))}
          <div className="border-t-2 mt-2 pt-2 font-bold flex justify-between" style={{ borderColor: 'hsl(var(--primary))' }}>
            <span>Total Aset</span><span style={{ color: 'hsl(var(--success))' }}>{formatCurrency(bs.totalAssets)}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'hsl(var(--border))' }}>
          <h3 className="font-bold text-sm mb-3" style={{ color: 'hsl(var(--info))' }}>Kewajiban</h3>
          {bs.liabilities.map(l => (
            <div key={l.account_code} className="flex justify-between text-sm py-1 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
              <span><span className="font-mono text-xs" style={{ color: 'hsl(var(--text-secondary))' }}>{l.account_code}</span> {l.account_name}</span>
              <span className="font-mono">{formatCurrency(l.balance)}</span>
            </div>
          ))}
          <div className="border-t-2 mt-2 pt-2 font-bold flex justify-between" style={{ borderColor: 'hsl(var(--primary))' }}>
            <span>Total Kewajiban</span><span style={{ color: 'hsl(var(--info))' }}>{formatCurrency(bs.totalLiabilities)}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'hsl(var(--border))' }}>
          <h3 className="font-bold text-sm mb-3" style={{ color: 'hsl(var(--primary))' }}>Ekuitas</h3>
          {bs.equity.map(e => (
            <div key={e.account_code} className="flex justify-between text-sm py-1 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
              <span><span className="font-mono text-xs" style={{ color: 'hsl(var(--text-secondary))' }}>{e.account_code}</span> {e.account_name}</span>
              <span className="font-mono">{formatCurrency(e.balance)}</span>
            </div>
          ))}
          <div className="border-t-2 mt-2 pt-2 font-bold flex justify-between" style={{ borderColor: 'hsl(var(--primary))' }}>
            <span>Total Ekuitas</span><span style={{ color: 'hsl(var(--primary))' }}>{formatCurrency(bs.totalEquity)}</span>
          </div>
        </div>
      </div>
      {!bs.isBalanced && (
        <div className="p-3 rounded-lg text-sm text-red-600 bg-red-50">
          ⚠️ Neraca tidak seimbang! Total Aset ≠ Total Kewajiban + Total Ekuitas
        </div>
      )}
    </div>
  )
}

function CFContent({ cf }: { cf: CFReport }) {
  return (
    <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
      <table className="w-full">
        <thead>
          <tr style={{ background: 'hsl(var(--surface-raised))' }}>
            <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-muted))' }}>Keterangan</th>
            <th className="text-right px-4 py-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-muted))' }}>Jumlah</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className="px-4 py-2 text-xs font-medium" style={{ color: 'hsl(var(--text-muted))' }}> — Aktivitas Operasional — </td><td colSpan={2}></td></tr>
          {cf.operating.map((l, i) => (
            <tr key={i} className="border-t" style={{ borderColor: 'hsl(var(--border))' }}>
              <td className="px-4 py-2 text-sm">{l.label}</td>
              <td className="px-4 py-2 text-right font-mono">{formatCurrency(l.amount)}</td>
            </tr>
          ))}
          <tr className="border-t-2" style={{ borderColor: 'hsl(var(--border))' }}>
            <td className="px-4 py-2 font-bold">Total Aktivitas Operasional</td>
            <td className="px-4 py-2 text-right font-bold">{formatCurrency(cf.operatingTotal)}</td>
          </tr>
          <tr><td className="px-4 py-2 text-xs font-medium" style={{ color: 'hsl(var(--text-muted))' }}> — Aktivitas Investasi — </td><td colSpan={2}></td></tr>
          {cf.investing.map((l, i) => (
            <tr key={i} className="border-t" style={{ borderColor: 'hsl(var(--border))' }}>
              <td className="px-4 py-2 text-sm">{l.label}</td>
              <td className="px-4 py-2 text-right font-mono">{formatCurrency(l.amount)}</td>
            </tr>
          ))}
          <tr className="border-t-2" style={{ borderColor: 'hsl(var(--border))' }}>
            <td className="px-4 py-2 font-bold">Total Aktivitas Investasi</td>
            <td className="px-4 py-2 text-right font-bold">{formatCurrency(cf.investingTotal)}</td>
          </tr>
          <tr><td className="px-4 py-2 text-xs font-medium" style={{ color: 'hsl(var(--text-muted))' }}> — Aktivitas Pendanaan — </td><td colSpan={2}></td></tr>
          {cf.financing.map((l, i) => (
            <tr key={i} className="border-t" style={{ borderColor: 'hsl(var(--border))' }}>
              <td className="px-4 py-2 text-sm">{l.label}</td>
              <td className="px-4 py-2 text-right font-mono">{formatCurrency(l.amount)}</td>
            </tr>
          ))}
          <tr className="border-t-2" style={{ borderColor: 'hsl(var(--border))' }}>
            <td className="px-4 py-2 font-bold">Total Aktivitas Pendanaan</td>
            <td className="px-4 py-2 text-right font-bold">{formatCurrency(cf.financingTotal)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="border-t-3 font-bold" style={{ borderColor: 'hsl(var(--success))' }}>
            <td className="px-4 py-3">Net Cash Flow</td>
            <td className="px-4 py-3 text-right" style={{ color: cf.netCashFlow >= 0 ? 'hsl(var(--success))' : 'hsl(var(--danger))' }}>{formatCurrency(cf.netCashFlow)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
