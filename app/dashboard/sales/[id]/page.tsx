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
    completed: { label: 'Selesai',    bg: 'hsl(var(--success-bg))', text: 'hsl(var(--success))' },
    cancelled: { label: 'Dibatalkan', bg: 'hsl(var(--danger-bg))',   text: 'hsl(var(--danger))' },
    refunded:  { label: 'Refund',     bg: 'hsl(210, 60%, 93%)', text: 'hsl(210, 60%, 35%)' },
    pending:   { label: 'Pending',    bg: 'hsl(var(--primary-subtle))',  text: 'hsl(var(--primary-hover))' },
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
      is_available_online: false,
      online_description: null,
      online_sort_order: 0,
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
      <div className="bg-white rounded-xl border p-5 mb-4" style={{ borderColor: 'hsl(var(--border))' }}>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Kasir', value: sale.profiles?.full_name ?? '—' },
            { label: 'Pelanggan', value: sale.customer_name ?? 'Umum' },
            { label: 'Metode Bayar', value: paymentLabel[sale.payment_method ?? ''] ?? '—' },
            { label: 'Dibayar', value: formatCurrency(sale.payment_amount ?? 0) },
            { label: 'Kembalian', value: formatCurrency(sale.change_amount ?? 0) },
          ].map((row) => (
            <div key={row.label}>
              <dt className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>{row.label}</dt>
              <dd className="text-sm font-medium mt-0.5" style={{ color: 'hsl(var(--foreground))' }}>
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
        {sale.notes && (
          <p className="mt-3 pt-3 border-t text-sm" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-muted))' }}>
            {sale.notes}
          </p>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>Item Pembelian</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'hsl(var(--surface-raised))' }}>
              {['Produk', 'Qty', 'Harga', 'Subtotal'].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: 'hsl(var(--text-muted))' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sale.sale_items.map((item) => (
              <tr key={item.id} className="border-t" style={{ borderColor: 'hsl(var(--border))' }}>
                <td className="px-4 py-3 text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                  {item.product_name}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>
                  {item.quantity} pcs
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>
                  {formatCurrency(item.unit_price)}
                </td>
                <td className="px-4 py-3 text-sm font-semibold" style={{ color: 'hsl(var(--primary))' }}>
                  {formatCurrency(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t" style={{ borderColor: 'hsl(var(--border))' }}>
              <td colSpan={3} className="px-4 py-2.5 text-xs text-right" style={{ color: 'hsl(var(--text-muted))' }}>
                Subtotal
              </td>
              <td className="px-4 py-2.5 text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>
                {formatCurrency(sale.subtotal)}
              </td>
            </tr>
            {sale.discount_amount > 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-2 text-xs text-right" style={{ color: 'hsl(var(--success))' }}>
                  Diskon
                </td>
                <td className="px-4 py-2 text-sm" style={{ color: 'hsl(var(--success))' }}>
                  -{formatCurrency(sale.discount_amount)}
                </td>
              </tr>
            )}
            <tr className="border-t" style={{ borderColor: 'hsl(var(--border))' }}>
              <td colSpan={3} className="px-4 py-3 text-sm font-bold text-right" style={{ color: 'hsl(var(--foreground))' }}>
                TOTAL
              </td>
              <td className="px-4 py-3 text-base font-bold" style={{ color: 'hsl(var(--primary))' }}>
                {formatCurrency(sale.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
