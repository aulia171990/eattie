'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAccountsReceivable, getAccountsPayable, recordPayment, getAgingReport, type ARItem, type APItem, type AgingReport } from '@/actions/ar-ap'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/shared/badge'
import { DollarSign, Clock, CheckCircle, CreditCard } from 'lucide-react'

type Tab = 'receivable' | 'payable' | 'aging'

export function ARAPDashboard() {
  const [tab, setTab] = useState<Tab>('receivable')
  const [arItems, setArItems] = useState<ARItem[]>([])
  const [apItems, setApItems] = useState<APItem[]>([])
  const [aging, setAging] = useState<AgingReport>({ receivable: [], payable: [], totalReceivable: 0, totalPayable: 0, netPosition: 0 })
  const [loading, setLoading] = useState(true)
  const [paymentModal, setPaymentModal] = useState<{ type: 'receivable' | 'payable'; id: string; remaining: number } | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paying, setPaying] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [ar, ap, ag] = await Promise.all([
      getAccountsReceivable() as unknown as ARItem[],
      getAccountsPayable() as unknown as APItem[],
      getAgingReport(),
    ])
    setArItems(ar)
    setApItems(ap)
    setAging(ag)
    setLoading(false)
  }, [])

  useEffect(() => { void loadData() }, [loadData])

  async function handlePay() {
    if (!paymentModal || !paymentAmount) return
    const amt = parseFloat(paymentAmount)
    if (!Number.isFinite(amt) || amt <= 0) return
    setPaying(true)
    const res = await recordPayment(paymentModal.type, paymentModal.id, amt, paymentDate, paymentMethod, paymentNotes || undefined)
    setPaying(false)
    if (res.error) { alert(res.error); return }
    setPaymentModal(null)
    setPaymentAmount('')
    setPaymentNotes('')
    void loadData()
  }

  function statusBadge(status: string) {
    const map: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }> = {
      paid: { label: 'Lunas', variant: 'success' },
      partial: { label: 'Sebagian', variant: 'warning' },
      unpaid: { label: 'Belum Bayar', variant: 'danger' },
      overdue: { label: 'Jatuh Tempo', variant: 'danger' },
    }
    const s = map[status] || { label: status, variant: 'default' as const }
    return <Badge variant={s.variant}>{s.label}</Badge>
  }

  const totalAR = arItems.reduce((s, i) => s + i.amount - i.paid_amount, 0)
  const totalAP = apItems.reduce((s, i) => s + i.amount - i.paid_amount, 0)

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Piutang & Hutang"
        description="Lacak piutang pelanggan dan hutang supplier"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Piutang & Hutang' }]}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'hsl(var(--border))' }}>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} style={{ color: 'hsl(var(--primary))' }} />
            <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-muted))' }}>Total Piutang</span>
          </div>
          <p className="text-xl font-bold" style={{ color: 'hsl(var(--primary))' }}>{formatCurrency(totalAR)}</p>
          <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-muted))' }}>{arItems.filter(i => i.status !== 'paid').length} invoice aktif</p>
        </div>
        <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'hsl(var(--border))' }}>
          <div className="flex items-center gap-2 mb-2">
            <CreditCard size={16} style={{ color: 'hsl(var(--danger))' }} />
            <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-muted))' }}>Total Hutang</span>
          </div>
          <p className="text-xl font-bold" style={{ color: 'hsl(var(--danger))' }}>{formatCurrency(totalAP)}</p>
          <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-muted))' }}>{apItems.filter(i => i.status !== 'paid').length} invoice aktif</p>
        </div>
        <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'hsl(var(--border))' }}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={16} style={{ color: 'hsl(var(--success))' }} />
            <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-muted))' }}>Posisi Bersih</span>
          </div>
          <p className="text-xl font-bold" style={{ color: 'hsl(var(--success))' }}>{formatCurrency(aging.netPosition)}</p>
          <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-muted))' }}>Piutang - Hutang</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
        {([
          { id: 'receivable' as Tab, label: 'Piutang', icon: DollarSign },
          { id: 'payable' as Tab, label: 'Hutang', icon: CreditCard },
          { id: 'aging' as Tab, label: 'Aging', icon: Clock },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
            style={{
              borderColor: tab === t.id ? 'hsl(var(--primary))' : 'transparent',
              color: tab === t.id ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
            }}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: 'hsl(var(--text-muted))' }}>Memuat data...</div>
      ) : (
        <>
          {/* Receivable Tab */}
          {tab === 'receivable' && (
            <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
              {arItems.length === 0 ? (
                <div className="text-center py-12" style={{ color: 'hsl(var(--text-muted))' }}>Belum ada piutang</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'hsl(var(--surface-raised))' }}>
                      {['Invoice', 'Pelanggan', 'Total', 'Dibayar', 'Sisa', 'Jatuh Tempo', 'Status', 'Aksi'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-muted))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {arItems.map(i => {
                      const remaining = i.amount - i.paid_amount
                      return (
                        <tr key={i.id} className="border-t hover:bg-gray-50/50" style={{ borderColor: 'hsl(var(--border))' }}>
                          <td className="px-4 py-3 text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>{i.invoice_number}</td>
                          <td className="px-4 py-3 text-sm">{i.customer_name}</td>
                          <td className="px-4 py-3 text-sm">{formatCurrency(i.amount)}</td>
                          <td className="px-4 py-3 text-sm" style={{ color: 'hsl(var(--success))' }}>{formatCurrency(i.paid_amount)}</td>
                          <td className="px-4 py-3 text-sm font-semibold" style={{ color: remaining > 0 ? 'hsl(var(--danger))' : 'hsl(var(--success))' }}>{formatCurrency(remaining)}</td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-muted))' }}>{formatDate(i.due_date)}</td>
                          <td className="px-4 py-3">{statusBadge(i.status)}</td>
                          <td className="px-4 py-3">
                            {remaining > 0.01 && (
                              <button onClick={() => setPaymentModal({ type: 'receivable', id: i.id, remaining })}
                                className="text-xs px-2 py-1 rounded-md hover:bg-gray-100" style={{ color: 'hsl(var(--primary))' }}>
                                Bayar
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Payable Tab */}
          {tab === 'payable' && (
            <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
              {apItems.length === 0 ? (
                <div className="text-center py-12" style={{ color: 'hsl(var(--text-muted))' }}>Belum ada hutang</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'hsl(var(--surface-raised))' }}>
                      {['Invoice', 'Supplier', 'Total', 'Dibayar', 'Sisa', 'Jatuh Tempo', 'Status', 'Aksi'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-muted))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {apItems.map(i => {
                      const remaining = i.amount - i.paid_amount
                      return (
                        <tr key={i.id} className="border-t hover:bg-gray-50/50" style={{ borderColor: 'hsl(var(--border))' }}>
                          <td className="px-4 py-3 text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>{i.invoice_number}</td>
                          <td className="px-4 py-3 text-sm">{i.supplier_name}</td>
                          <td className="px-4 py-3 text-sm">{formatCurrency(i.amount)}</td>
                          <td className="px-4 py-3 text-sm" style={{ color: 'hsl(var(--success))' }}>{formatCurrency(i.paid_amount)}</td>
                          <td className="px-4 py-3 text-sm font-semibold" style={{ color: remaining > 0 ? 'hsl(var(--danger))' : 'hsl(var(--success))' }}>{formatCurrency(remaining)}</td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-muted))' }}>{formatDate(i.due_date)}</td>
                          <td className="px-4 py-3">{statusBadge(i.status)}</td>
                          <td className="px-4 py-3">
                            {remaining > 0.01 && (
                              <button onClick={() => setPaymentModal({ type: 'payable', id: i.id, remaining })}
                                className="text-xs px-2 py-1 rounded-md hover:bg-gray-100" style={{ color: 'hsl(var(--primary))' }}>
                                Bayar
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Aging Tab */}
          {tab === 'aging' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
                <div className="px-4 py-3 font-medium text-sm border-b" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                  Piutang (Aging)
                </div>
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'hsl(var(--surface-raised))' }}>
                      {['Periode', 'Jumlah', 'Nominal'].map(h => (
                        <th key={h} className="text-left px-4 py-2 text-xs font-semibold" style={{ color: 'hsl(var(--text-muted))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {aging.receivable.map(b => (
                      <tr key={b.bucket} className="border-t" style={{ borderColor: 'hsl(var(--border))' }}>
                        <td className="px-4 py-2 text-sm">{b.bucket}</td>
                        <td className="px-4 py-2 text-sm">{b.count}</td>
                        <td className="px-4 py-2 text-sm font-medium">{formatCurrency(b.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-semibold" style={{ borderColor: 'hsl(var(--border))' }}>
                      <td className="px-4 py-2 text-sm">Total</td>
                      <td className="px-4 py-2 text-sm">{aging.receivable.reduce((s, b) => s + b.count, 0)}</td>
                      <td className="px-4 py-2 text-sm" style={{ color: 'hsl(var(--primary))' }}>{formatCurrency(aging.totalReceivable)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
                <div className="px-4 py-3 font-medium text-sm border-b" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                  Hutang (Aging)
                </div>
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'hsl(var(--surface-raised))' }}>
                      {['Periode', 'Jumlah', 'Nominal'].map(h => (
                        <th key={h} className="text-left px-4 py-2 text-xs font-semibold" style={{ color: 'hsl(var(--text-muted))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {aging.payable.map(b => (
                      <tr key={b.bucket} className="border-t" style={{ borderColor: 'hsl(var(--border))' }}>
                        <td className="px-4 py-2 text-sm">{b.bucket}</td>
                        <td className="px-4 py-2 text-sm">{b.count}</td>
                        <td className="px-4 py-2 text-sm font-medium">{formatCurrency(b.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-semibold" style={{ borderColor: 'hsl(var(--border))' }}>
                      <td className="px-4 py-2 text-sm">Total</td>
                      <td className="px-4 py-2 text-sm">{aging.payable.reduce((s, b) => s + b.count, 0)}</td>
                      <td className="px-4 py-2 text-sm" style={{ color: 'hsl(var(--danger))' }}>{formatCurrency(aging.totalPayable)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPaymentModal(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" style={{ borderColor: 'hsl(var(--border))' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>
              Catat Pembayaran {paymentModal.type === 'receivable' ? 'Piutang' : 'Hutang'}
            </h3>
            <p className="text-sm mb-4" style={{ color: 'hsl(var(--text-muted))' }}>Sisa: {formatCurrency(paymentModal.remaining)}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'hsl(var(--text-muted))' }}>Jumlah</label>
                <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'hsl(var(--border))' }}
                  placeholder="0" min="0" max={paymentModal.remaining} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'hsl(var(--text-muted))' }}>Tanggal</label>
                <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'hsl(var(--border))' }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'hsl(var(--text-muted))' }}>Metode</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'hsl(var(--border))' }}>
                  <option value="cash">Tunai</option>
                  <option value="transfer">Transfer</option>
                  <option value="qris">QRIS</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'hsl(var(--text-muted))' }}>Catatan</label>
                <input type="text" value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'hsl(var(--border))' }}
                  placeholder="Opsional" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setPaymentModal(null)}
                className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium" style={{ borderColor: 'hsl(var(--border))' }}>
                Batal
              </button>
              <button onClick={handlePay} disabled={paying || !paymentAmount}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ background: 'hsl(var(--primary))' }}>
                {paying ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
