'use client'

import { useState, useRef } from 'react'
import { useCart } from '@/contexts/cart-context'
import { createSale } from '@/actions/sales'
import { formatCurrency } from '@/lib/utils'
import { ReceiptTemplate } from './receipt-template'
import { X, Banknote, CreditCard, Smartphone, Building2 } from 'lucide-react'

const QRIS_IMAGE_URL = process.env.NEXT_PUBLIC_QRIS_IMAGE_URL ?? ''

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Tunai', icon: <Banknote size={20} />, color: 'hsl(142, 60%, 40%)' },
  { id: 'qris', label: 'QRIS', icon: <Smartphone size={20} />, color: 'hsl(210, 70%, 45%)' },
  { id: 'transfer', label: 'Transfer', icon: <Building2 size={20} />, color: 'hsl(262, 60%, 50%)' },
  { id: 'card', label: 'Kartu', icon: <CreditCard size={20} />, color: 'hsl(32, 95%, 44%)' },
] as const

const QUICK_CASH = [5000, 10000, 20000, 50000, 100000]

interface PaymentDialogProps {
  onClose: () => void
  onSuccess: (invoiceNumber: string, total: number) => void
}

export function PaymentDialog({ onClose, onSuccess }: PaymentDialogProps) {
  const { items, subtotal, discountPercent, discountAmount, total } = useCart()
  const [method, setMethod] = useState<'cash' | 'card' | 'transfer' | 'qris'>('cash')
  const [paymentInput, setPaymentInput] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [completedSale, setCompletedSale] = useState<{
    invoiceNumber: string
    total: number
    paymentAmount: number
    change: number
    method: string
  } | null>(null)

  const receiptRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    if (!receiptRef.current) return
    const content = receiptRef.current.innerHTML
    const win = window.open('', '_blank', 'width=350,height=600')
    if (!win) return
    win.document.write(`
      <html><head><title>Struk</title>
      <style>body{font-family:monospace;font-size:12px;margin:12px}@media print{button{display:none}}</style>
      </head><body>${content}<br/><button onclick="window.print()">Print</button></body></html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 300)
  }

  const paymentAmount = parseFloat(paymentInput) || 0
  const change = method === 'cash' ? Math.max(0, paymentAmount - total) : 0
  const canPay = method !== 'cash' || paymentAmount >= total

  const handleConfirm = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await createSale({
        items: items.map(i => ({
          product_id: i.product.id,
          product_name: i.product.name,
          quantity: i.quantity,
          unit_price: i.product.selling_price,
          subtotal: i.subtotal,
        })),
        subtotal,
        discount_amount: discountAmount,
        discount_percent: discountPercent,
        tax_amount: 0,
        total,
        payment_method: method,
        payment_amount: method === 'cash' ? paymentAmount : total,
        change_amount: change,
        customer_name: customerName || undefined,
      })

      if (result.error) { setError(result.error); return }

      setCompletedSale({
        invoiceNumber: result.invoiceNumber!,
        total,
        paymentAmount: method === 'cash' ? paymentAmount : total,
        change,
        method,
      })
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  if (completedSale) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
          <div className="p-6 text-center" style={{ background: 'hsl(142, 50%, 95%)' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-3 text-white" style={{ background: 'hsl(142, 60%, 40%)' }}>✓</div>
            <h2 className="text-lg font-bold" style={{ color: 'hsl(142, 60%, 25%)' }}>Pembayaran Berhasil!</h2>
            <p className="text-sm mt-1" style={{ color: 'hsl(142, 30%, 40%)' }}>{completedSale.invoiceNumber}</p>
          </div>
          <div className="p-5 space-y-3">
            {[
              { label: 'Total', value: formatCurrency(completedSale.total), bold: true },
              { label: 'Dibayar', value: formatCurrency(completedSale.paymentAmount) },
              ...(completedSale.method === 'cash' ? [{ label: 'Kembalian', value: formatCurrency(completedSale.change), highlight: true }] : []),
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center">
                <span className="text-sm" style={{ color: 'hsl(25, 15%, 50%)' }}>{row.label}</span>
                <span className={`font-${row.bold ? 'bold text-base' : 'semibold text-sm'}`}
                  style={{ color: row.highlight ? 'hsl(32, 95%, 40%)' : 'hsl(25, 30%, 15%)' }}>
                  {row.value}
                </span>
              </div>
            ))}

            {/* Hidden receipt */}
            <div className="hidden">
              <ReceiptTemplate
                ref={receiptRef}
                invoiceNumber={completedSale.invoiceNumber}
                items={items}
                subtotal={subtotal}
                discountAmount={discountAmount}
                total={completedSale.total}
                paymentMethod={completedSale.method}
                paymentAmount={completedSale.paymentAmount}
                change={completedSale.change}
                customerName={customerName}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={handlePrint}
                className="flex-1 py-2.5 rounded-xl border text-sm font-medium"
                style={{ borderColor: 'hsl(36, 20%, 85%)', color: 'hsl(25, 30%, 30%)' }}>
                🖨️ Print Struk
              </button>
              <button onClick={() => onSuccess(completedSale.invoiceNumber, completedSale.total)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: 'hsl(32, 95%, 44%)' }}>
                Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col" style={{ maxHeight: '92dvh' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'hsl(36, 20%, 90%)' }}>
          <h2 className="font-bold text-base" style={{ color: 'hsl(25, 30%, 12%)' }}>Pembayaran</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          <div className="rounded-xl p-4 text-center" style={{ background: 'hsl(36, 80%, 95%)' }}>
            <p className="text-sm" style={{ color: 'hsl(25, 15%, 50%)' }}>Total Pembayaran</p>
            <p className="text-3xl font-bold mt-1" style={{ color: 'hsl(32, 95%, 40%)' }}>{formatCurrency(total)}</p>
            <p className="text-xs mt-1" style={{ color: 'hsl(25, 15%, 55%)' }}>
              {items.length} item · {items.reduce((s, i) => s + i.quantity, 0)} pcs
              {discountAmount > 0 && ` · Diskon ${formatCurrency(discountAmount)}`}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(25, 15%, 45%)' }}>METODE PEMBAYARAN</p>
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_METHODS.map(pm => (
                <button key={pm.id} onClick={() => { setMethod(pm.id); setPaymentInput('') }}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all"
                  style={{
                    borderColor: method === pm.id ? pm.color : 'hsl(36, 20%, 88%)',
                    background: method === pm.id ? `${pm.color}20` : 'white',
                    color: method === pm.id ? pm.color : 'hsl(25, 15%, 50%)',
                  }}>
                  {pm.icon}
                  <span className="text-xs font-medium">{pm.label}</span>
                </button>
              ))}
            </div>
          </div>

          {method === 'qris' && (
            <div className="flex flex-col items-center gap-3">
              {QRIS_IMAGE_URL ? (
                <>
                  <div
                    className="rounded-2xl p-3 border-2"
                    style={{ borderColor: 'hsl(210, 70%, 75%)', background: 'hsl(210, 60%, 97%)' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={QRIS_IMAGE_URL}
                      alt="QRIS BCA"
                      className="w-44 h-44 object-contain"
                    />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-semibold" style={{ color: 'hsl(25, 30%, 15%)' }}>
                      Scan QRIS untuk membayar
                    </p>
                    <p className="text-2xl font-bold" style={{ color: 'hsl(210, 70%, 45%)' }}>
                      {formatCurrency(total)}
                    </p>
                    <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>
                      GoPay · OVO · Dana · ShopeePay · semua m-banking
                    </p>
                  </div>
                  <div
                    className="w-full flex items-start gap-2 p-3 rounded-xl text-xs"
                    style={{ background: 'hsl(210, 60%, 95%)', color: 'hsl(210, 50%, 35%)' }}
                  >
                    <span>ℹ️</span>
                    <span>Setelah customer scan dan bayar, klik <strong>Konfirmasi</strong> di bawah.</span>
                  </div>
                </>
              ) : (
                <div
                  className="w-full p-5 rounded-2xl border-2 border-dashed text-center space-y-2"
                  style={{ borderColor: 'hsl(210, 40%, 75%)', background: 'hsl(210, 30%, 97%)' }}
                >
                  <p className="text-3xl">📷</p>
                  <p className="text-sm font-semibold" style={{ color: 'hsl(25, 30%, 25%)' }}>
                    QR belum dikonfigurasi
                  </p>
                  <p className="text-xs" style={{ color: 'hsl(25, 15%, 50%)' }}>
                    Tambahkan <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_QRIS_IMAGE_URL</code> di Vercel
                  </p>
                </div>
              )}
            </div>
          )}

          {method === 'cash' && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(25, 15%, 45%)' }}>UANG DITERIMA</p>
              <input type="number" value={paymentInput} onChange={e => setPaymentInput(e.target.value)}
                placeholder="Masukkan jumlah uang..."
                className="w-full px-4 py-3 rounded-xl border-2 text-lg font-semibold outline-none"
                style={{ borderColor: 'hsl(36, 20%, 85%)', color: 'hsl(25, 30%, 15%)' }} autoFocus />
              <div className="flex gap-2 mt-2 flex-wrap">
                {QUICK_CASH.filter(v => v >= total * 0.5).slice(0, 4).map(v => (
                  <button key={v} onClick={() => setPaymentInput(String(v))}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                    style={{ borderColor: 'hsl(36, 20%, 85%)', color: 'hsl(25, 15%, 45%)' }}>
                    {formatCurrency(v)}
                  </button>
                ))}
                <button onClick={() => setPaymentInput(String(total))}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                  style={{ background: 'hsl(142, 60%, 40%)' }}>
                  Pas {formatCurrency(total)}
                </button>
              </div>
              {paymentAmount >= total && (
                <div className="mt-3 p-3 rounded-xl flex justify-between items-center" style={{ background: 'hsl(36, 80%, 93%)' }}>
                  <span className="text-sm font-medium" style={{ color: 'hsl(32, 95%, 35%)' }}>Kembalian</span>
                  <span className="text-xl font-bold" style={{ color: 'hsl(32, 95%, 40%)' }}>{formatCurrency(change)}</span>
                </div>
              )}
            </div>
          )}

          <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
            placeholder="Nama pelanggan (opsional)"
            className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
            style={{ borderColor: 'hsl(36, 20%, 85%)' }} />

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <button onClick={handleConfirm} disabled={loading || !canPay}
            className="w-full py-3.5 rounded-xl font-bold text-white text-base disabled:opacity-50"
            style={{ background: canPay ? 'hsl(142, 60%, 40%)' : 'hsl(210, 10%, 70%)' }}>
            {loading ? 'Memproses...' : method === 'cash' && !canPay
              ? `Kurang ${formatCurrency(total - paymentAmount)}`
              : `✓ Konfirmasi ${PAYMENT_METHODS.find(p => p.id === method)?.label}`}
          </button>
        </div>
      </div>
    </div>
  )
}
