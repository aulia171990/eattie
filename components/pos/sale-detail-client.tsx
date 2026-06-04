'use client'

import { useRef, useState } from 'react'
import { ReceiptTemplate } from './receipt-template'
import { voidSale } from '@/actions/sales'
import type { CartItem } from '@/contexts/cart-context'
import { Printer, XCircle } from 'lucide-react'

interface SaleDetailClientProps {
  saleId: string
  saleStatus: string
  sale: {
    invoiceNumber: string
    items: CartItem[]
    subtotal: number
    discountAmount: number
    total: number
    paymentMethod: string
    paymentAmount: number
    change: number
    customerName?: string
  }
}

export function SaleDetailClient({ saleId, saleStatus, sale }: SaleDetailClientProps) {
  const receiptRef = useRef<HTMLDivElement>(null)
  const [voiding, setVoiding] = useState(false)
  const [confirmVoid, setConfirmVoid] = useState(false)

  const handlePrint = () => {
    if (!receiptRef.current) return
    const content = receiptRef.current.innerHTML
    const win = window.open('', '_blank', 'width=350,height=600')
    if (!win) return
    win.document.write(`
      <html><head><title>Struk ${sale.invoiceNumber}</title>
      <style>body{font-family:monospace;font-size:12px;margin:12px}@media print{button{display:none}}</style>
      </head><body>${content}<br/><button onclick="window.print()">Print</button></body></html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 300)
  }

  const handleVoid = async () => {
    setVoiding(true)
    await voidSale(saleId)
    setVoiding(false)
    setConfirmVoid(false)
    window.location.reload()
  }

  return (
    <>
      <div className="hidden">
        <ReceiptTemplate
          ref={receiptRef}
          invoiceNumber={sale.invoiceNumber}
          items={sale.items}
          subtotal={sale.subtotal}
          discountAmount={sale.discountAmount}
          total={sale.total}
          paymentMethod={sale.paymentMethod}
          paymentAmount={sale.paymentAmount}
          change={sale.change}
          customerName={sale.customerName}
        />
      </div>

      <button onClick={handlePrint}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:bg-gray-50"
        style={{ borderColor: 'hsl(36, 20%, 85%)', color: 'hsl(25, 30%, 30%)' }}>
        <Printer size={14} /> Print Struk
      </button>

      {saleStatus === 'completed' && (
        confirmVoid ? (
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'hsl(0, 70%, 45%)' }}>Batalkan transaksi ini?</span>
            <button onClick={handleVoid} disabled={voiding}
              className="px-2 py-1 rounded-lg text-xs font-medium text-white disabled:opacity-60"
              style={{ background: 'hsl(0, 70%, 50%)' }}>
              {voiding ? '...' : 'Ya, Batalkan'}
            </button>
            <button onClick={() => setConfirmVoid(false)}
              className="px-2 py-1 rounded-lg text-xs border"
              style={{ borderColor: 'hsl(36, 20%, 85%)', color: 'hsl(25, 15%, 50%)' }}>
              Tidak
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmVoid(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
            style={{ borderColor: 'hsl(0, 70%, 80%)', color: 'hsl(0, 70%, 50%)' }}>
            <XCircle size={14} /> Void
          </button>
        )
      )}
    </>
  )
}
