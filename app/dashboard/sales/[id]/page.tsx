import { getSale } from '@/actions/sales'
import { PageHeader } from '@/components/shared/page-header'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { notFound } from 'next/navigation'
import { SaleDetailClient } from '@/components/pos/sale-detail-client'
import type { CartItem } from '@/types'

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let sale
  try {
    sale = await getSale(id)
  } catch {
    notFound()
  }

  const statusStyle: Record<string, { label: string; bg: string; text: string }> = {
    completed: { label: 'Selesai',    bg: 'hsl(142, 50%, 90%)', text: 'hsl(142, 60%, 28%)' },
    cancelled: { label: 'Dibatalkan', bg: 'hsl(0, 60%, 93%)',   text: 'hsl(0, 70%, 40%)' },
    refunded:  { label: 'Refund',     bg: 'hsl(210, 60%, 93%)', text: 'hsl(210, 60%, 35%)' },
    pending:   { label: 'Pending',    bg: 'hsl(36, 80%, 90%)',  text: 'hsl(32, 95%, 38%)' },
  }
  const ss = statusStyle[sale.status] ?? {
    label: sale.status,
    bg: 'hsl(210,10%,93%)',
    text: 'hsl(210,10%,40%)',
  }

  const paymentLabel: Record<string, string> = {
    cash: 'Tunai', card: 'Kartu', transfer: 'Transfer', qris: 'QRIS',
  }

  // Build CartItem[] for receipt printing
  const cartItems: CartItem[] = sale.sale_items.map((item) => ({
    product: {
      id: item.product_id ?? '',
      name: item.product_name,
      name_en: null,
      description: null,
      category: item.products?.category ?? null,
      selling_price: item.unit_price,
      cost_price: 0,
      current_stock: 0,
      min_stock: 0,
      image_url: null,
      is_active: true,
      created_at: item.created_at,
      updated_at: item.created_at,
    },
    quantity: item.quantity,
    subtotal: item.subtotal,
  }))

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader
        title={sale.invoice_number}
        description={formatDateTime(sale.created_at)}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Penjualan', href: '/dashboard/sales' },
          { label: sale.invoice_number },
        ]}
        action={
          <div className="flex items-center gap-2">
            <span
              className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: ss.bg, color: ss.text }}
            >
              {ss.label}
            </span>
            <SaleDetailClient
              saleId={sale.id}
              saleStatus={sale.status}
              sale={{
                invoiceNumber: sale.invoice_number,
                items: cartItems,
                subtotal: sale.subtotal,
                discountAmount: sale.discount_amount,
                total: sale.total,
                paymentMethod: sale.payment_method ?? 'cash',
                paymentAmount: sale.payment_amount ?? sale.total,
                change: sale.change_amount ?? 0,
                customerName: sale.customer_name ?? undefined,
              }}
            />
          </div>
        }
      />

      {/* Info */}
      <div className="bg-white rounded-xl border p-5 mb-4" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Kasir', value: sale.profiles?.full_name ?? '—' },
            { label: 'Pelanggan', value: sale.customer_name ?? 'Umum' },
            { label: 'Metode Bayar', value: paymentLabel[sale.payment_method ?? ''] ?? '—' },
            { label: 'Dibayar', value: formatCurrency(sale.payment_amount ?? 0) },
            { label: 'Kembalian', value: formatCurrency(sale.change_amount ?? 0) },
          ].map((row) => (
            <div key={row.label}>
              <dt className="text-xs" style={{ color: 'hsl(25, 15%, 50%)' }}>{row.label}</dt>
              <dd className="text-sm font-medium mt-0.5" style={{ color: 'hsl(25, 30%, 15%)' }}>
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
        {sale.notes && (
          <p className="mt-3 pt-3 border-t text-sm" style={{ borderColor: 'hsl(36, 20%, 92%)', color: 'hsl(25, 15%, 50%)' }}>
            {sale.notes}
          </p>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'hsl(36, 20%, 92%)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'hsl(25, 30%, 15%)' }}>Item Pembelian</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'hsl(36, 20%, 97%)' }}>
              {['Produk', 'Qty', 'Harga', 'Subtotal'].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: 'hsl(25, 15%, 45%)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sale.sale_items.map((item) => (
              <tr key={item.id} className="border-t" style={{ borderColor: 'hsl(36, 20%, 94%)' }}>
                <td className="px-4 py-3 text-sm font-medium" style={{ color: 'hsl(25, 30%, 15%)' }}>
                  {item.product_name}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'hsl(25, 30%, 20%)' }}>
                  {item.quantity} pcs
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'hsl(25, 30%, 20%)' }}>
                  {formatCurrency(item.unit_price)}
                </td>
                <td className="px-4 py-3 text-sm font-semibold" style={{ color: 'hsl(32, 95%, 40%)' }}>
                  {formatCurrency(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
              <td colSpan={3} className="px-4 py-2.5 text-xs text-right" style={{ color: 'hsl(25, 15%, 50%)' }}>
                Subtotal
              </td>
              <td className="px-4 py-2.5 text-sm" style={{ color: 'hsl(25, 30%, 20%)' }}>
                {formatCurrency(sale.subtotal)}
              </td>
            </tr>
            {sale.discount_amount > 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-2 text-xs text-right" style={{ color: 'hsl(142, 60%, 35%)' }}>
                  Diskon
                </td>
                <td className="px-4 py-2 text-sm" style={{ color: 'hsl(142, 60%, 35%)' }}>
                  -{formatCurrency(sale.discount_amount)}
                </td>
              </tr>
            )}
            <tr className="border-t" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
              <td colSpan={3} className="px-4 py-3 text-sm font-bold text-right" style={{ color: 'hsl(25, 30%, 15%)' }}>
                TOTAL
              </td>
              <td className="px-4 py-3 text-base font-bold" style={{ color: 'hsl(32, 95%, 40%)' }}>
                {formatCurrency(sale.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

