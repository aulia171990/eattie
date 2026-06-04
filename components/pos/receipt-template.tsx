import { forwardRef } from 'react'
import type { CartItem } from '@/contexts/cart-context'
import { formatCurrency, formatDateTime } from '@/lib/utils'

interface ReceiptTemplateProps {
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

const paymentLabels: Record<string, string> = {
  cash: 'Tunai', card: 'Kartu', transfer: 'Transfer', qris: 'QRIS'
}

export const ReceiptTemplate = forwardRef<HTMLDivElement, ReceiptTemplateProps>(
  function ReceiptTemplate({
    invoiceNumber, items, subtotal, discountAmount,
    total, paymentMethod, paymentAmount, change, customerName
  }, ref) {
    return (
      <div ref={ref} style={{
        fontFamily: 'monospace',
        fontSize: '12px',
        width: '280px',
        padding: '12px',
        color: '#000',
        background: '#fff',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '18px', marginBottom: '4px' }}>🍞</div>
          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>BAKERY MANAGER</div>
          <div style={{ fontSize: '10px', color: '#555' }}>Toko Roti & Kue</div>
          <div style={{ borderTop: '1px dashed #000', marginTop: '8px', paddingTop: '8px' }}>
            <div>{formatDateTime(new Date())}</div>
            <div style={{ fontWeight: 'bold' }}>No: {invoiceNumber}</div>
            {customerName && <div>Pelanggan: {customerName}</div>}
          </div>
        </div>

        {/* Items */}
        <div style={{ borderTop: '1px dashed #000', paddingTop: '8px', marginBottom: '8px' }}>
          {items.map(item => (
            <div key={item.product.id} style={{ marginBottom: '6px' }}>
              <div style={{ fontWeight: 'bold' }}>{item.product.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{item.quantity} x {formatCurrency(item.product.selling_price)}</span>
                <span>{formatCurrency(item.subtotal)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div style={{ borderTop: '1px dashed #000', paddingTop: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Diskon</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginTop: '4px', borderTop: '1px solid #000', paddingTop: '4px' }}>
            <span>TOTAL</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span>Bayar ({paymentLabels[paymentMethod] ?? paymentMethod})</span>
            <span>{formatCurrency(paymentAmount)}</span>
          </div>
          {paymentMethod === 'cash' && change > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>Kembalian</span>
              <span>{formatCurrency(change)}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px dashed #000', marginTop: '12px', paddingTop: '8px', textAlign: 'center', fontSize: '10px', color: '#555' }}>
          <div>Terima kasih atas kunjungan Anda!</div>
          <div>Barang yang sudah dibeli tidak dapat ditukar.</div>
        </div>
      </div>
    )
  }
)
