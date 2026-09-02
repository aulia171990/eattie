'use client'

import { useState, useEffect } from 'react'
import { getTrialBalance, getJournalEntries, getChartOfAccounts, type AccountSummary, type JournalEntryWithLines } from '@/actions/accounting'
import { formatCurrency } from '@/lib/utils'
import { BookOpen, Calculator, FileText } from 'lucide-react'

interface AccountRow {
  id: string
  code: string
  name: string
  type: string
  is_active: boolean
  created_at: string
}

type Tab = 'trial-balance' | 'journal' | 'accounts'

export function LedgerDashboard() {
  const [tab, setTab] = useState<Tab>('trial-balance')
  const [trialBalance, setTrialBalance] = useState<AccountSummary[]>([])
  const [journalEntries, setJournalEntries] = useState<JournalEntryWithLines[]>([])
  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [tb, je, ac] = await Promise.all([
      getTrialBalance(),
      getJournalEntries(),
      getChartOfAccounts(),
    ])
    setTrialBalance(tb)
    setJournalEntries(je)
    setAccounts((ac ?? []) as unknown as AccountRow[])
    setLoading(false)
  }

  const totalDebit = trialBalance.reduce((s, a) => s + a.total_debit, 0)
  const totalCredit = trialBalance.reduce((s, a) => s + a.total_credit, 0)

  return (
    <div className="space-y-6">
      {/* Tab Bar */}
      <div className="flex gap-2 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
        {[
          { id: 'trial-balance' as Tab, label: 'Neraca Saldo', icon: Calculator },
          { id: 'journal' as Tab, label: 'Jurnal', icon: BookOpen },
          { id: 'accounts' as Tab, label: 'Perkiraan', icon: FileText },
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
        <div className="text-center py-12" style={{ color: 'hsl(var(--text-muted))' }}>Memuat data...</div>
      ) : (
        <>
          {/* Trial Balance */}
          {tab === 'trial-balance' && (
            <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'hsl(var(--surface-raised))' }}>
                    {['Kode', 'Nama', 'Debit', 'Kredit', 'Saldo'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-muted))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trialBalance.map(a => (
                    <tr key={a.id} className="border-t" style={{ borderColor: 'hsl(var(--border))' }}>
                      <td className="px-4 py-2 text-xs font-mono" style={{ color: 'hsl(var(--text-secondary))' }}>{a.code}</td>
                      <td className="px-4 py-2 text-sm" style={{ color: 'hsl(var(--foreground))' }}>{a.name}</td>
                      <td className="px-4 py-2 text-sm text-right" style={{ color: 'hsl(var(--text-secondary))' }}>{a.total_debit > 0 ? formatCurrency(a.total_debit) : '—'}</td>
                      <td className="px-4 py-2 text-sm text-right" style={{ color: 'hsl(var(--text-secondary))' }}>{a.total_credit > 0 ? formatCurrency(a.total_credit) : '—'}</td>
                      <td className="px-4 py-2 text-sm text-right font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{formatCurrency(Math.abs(a.balance))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-bold" style={{ borderColor: 'hsl(var(--primary))', background: 'hsl(var(--surface-raised))' }}>
                    <td colSpan={2} className="px-4 py-3 text-sm">Total</td>
                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(totalDebit)}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(totalCredit)}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(Math.abs(totalDebit - totalCredit))}</td>
                  </tr>
                </tfoot>
              </table>
              {Math.abs(totalDebit - totalCredit) > 0.01 && (
                <div className="px-4 py-2 text-sm text-red-600 bg-red-50">
                  ⚠️ Neraca tidak seimbang! Debit ≠ Credit sebesar {formatCurrency(Math.abs(totalDebit - totalCredit))}
                </div>
              )}
            </div>
          )}

          {/* Journal Entries */}
          {tab === 'journal' && (
            <div className="space-y-3">
              {journalEntries.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-muted))' }}>
                  Belum ada jurnal
                </div>
              ) : (
                journalEntries.map(je => (
                  <div key={je.id} className="bg-white rounded-xl border p-4" style={{ borderColor: 'hsl(var(--border))' }}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-muted))' }}>{je.entry_number}</span>
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: 'hsl(var(--primary-subtle))', color: 'hsl(var(--primary))' }}>
                          {je.source}
                        </span>
                      </div>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>{je.entry_date}</span>
                    </div>
                    <p className="text-sm font-medium mb-2" style={{ color: 'hsl(var(--foreground))' }}>{je.description}</p>
                    <div className="ml-4 space-y-1">
                      {je.journal_lines?.map((line) => (
                        <div key={line.id} className="flex items-center text-xs gap-4">
                          <span className="font-mono w-16" style={{ color: 'hsl(var(--text-muted))' }}>{line.chart_of_accounts?.code}</span>
                          <span className="flex-1" style={{ color: 'hsl(var(--foreground))' }}>{line.chart_of_accounts?.name}</span>
                          {line.debit > 0 && <span className="w-24 text-right font-mono" style={{ color: 'hsl(var(--success))' }}>D {formatCurrency(line.debit)}</span>}
                          {line.credit > 0 && <span className="w-24 text-right font-mono" style={{ color: 'hsl(var(--danger))' }}>C {formatCurrency(line.credit)}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Chart of Accounts */}
          {tab === 'accounts' && (
            <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'hsl(var(--surface-raised))' }}>
                    {['Kode', 'Nama', 'Tipe'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-muted))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {accounts.map(a => (
                    <tr key={a.id} className="border-t" style={{ borderColor: 'hsl(var(--border))' }}>
                      <td className="px-4 py-2 text-xs font-mono" style={{ color: 'hsl(var(--text-secondary))' }}>{a.code}</td>
                      <td className="px-4 py-2 text-sm" style={{ color: 'hsl(var(--foreground))' }}>{a.name}</td>
                      <td className="px-4 py-2">
                        <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                          style={{
                            background: a.type === 'asset' ? 'hsl(var(--success-subtle))' : a.type === 'revenue' ? 'hsl(var(--info-bg))' : a.type === 'expense' ? 'hsl(var(--danger-subtle))' : 'hsl(var(--surface-raised))',
                            color: a.type === 'asset' ? 'hsl(var(--success))' : a.type === 'revenue' ? 'hsl(var(--info))' : a.type === 'expense' ? 'hsl(var(--danger))' : 'hsl(var(--text-muted))',
                          }}>
                          {a.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
