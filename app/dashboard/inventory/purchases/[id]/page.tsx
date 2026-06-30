import { getPurchase } from '@/actions/stock-purchases'
import { updatePaymentStatus } from '@/actions/update-payment-status'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { PaymentStatusForm } from '@/components/forms/payment-status-form'
import { formatCurrency, formatDate } from '@/lib/utils'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let po
  try {
    po = await getPurchase(id)
  } catch {
    notFound()
  }

  const boundUpdatePayment = updatePaymentStatus.bind(null, id)

  return (
    <div className="p-6 max-w-3xl">
      <PageHeader
        title={po.purchase_number}
        description={`${po.suppliers?.name ?? 'Tanpa Supplier'} • ${formatDate(po.purchase_date)}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory', href: '/dashboard/inventory' },
          { label: 'Pembelian', href: '/dashboard/inventory/purchases' },
          { label: po.purchase_number },
        ]}
        action={
          <div className="flex gap-2 items-center">
            <StatusBadge status={po.status} type="purchase" />
            {po.status === 'ordered' && (
              <Link
                href={`/dashboard/inventory/purchases/${id}/receive`}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                style={{ background: 'hsl(var(--success))' }}
              >
                Terima Stok
              </Link>
            )}
          </div>
        }
      />

      <div
        className="bg-white rounded-xl border p-5 mb-4"
        style={{ borderColor: 'hsl(var(--border))' }}
      >
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Tanggal PO', value: formatDate(po.purchase_date) },
            { label: 'Tanggal Terima', value: po.received_date ? formatDate(po.received_date) : '—' },
            { label: 'Jatuh Tempo', value: po.payment_due_date ? formatDate(po.payment_due_date) : '—' },
            { label: 'No. Faktur', value: po.invoice_number ?? '—' },
            { label: 'Status Bayar', value: <StatusBadge status={po.payment_status} type="payment" /> },
          ].map((row) => (
            <div key={row.label}>
              <dt className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>{row.label}</dt>
              <dd className="text-sm font-medium mt-0.5" style={{ color: 'hsl(var(--foreground))' }}>
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
        {po.notes && (
          <p className="mt-3 pt-3 border-t text-sm" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-muted))' }}>
            {po.notes}
          </p>
        )}
      </div>

      <PaymentStatusForm
        action={boundUpdatePayment}
        currentStatus={po.payment_status ?? 'unpaid'}
      />

      <div
        className="bg-white rounded-xl border overflow-hidden"
        style={{ borderColor: 'hsl(var(--border))' }}
      >
        <div className="px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>
            Item Pembelian
          </h2>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'hsl(var(--surface-raised))' }}>
              {['Bahan', 'Dipesan', 'Diterima', 'Satuan', 'Harga/Unit', 'Subtotal'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-muted))' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {po.stock_purchase_items.map((item) => (
              <tr key={item.id} className="border-t" style={{ borderColor: 'hsl(var(--border))' }}>
                <td className="px-4 py-3 text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                  {item.ingredients?.name ?? '—'}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>
                  {item.quantity_ordered}
                </td>
                <td
                  className="px-4 py-3 text-sm"
                  style={{
                    color:
                      item.quantity_received >= item.quantity_ordered
                        ? 'hsl(var(--success))'
                        : 'hsl(var(--text-secondary))',
                  }}
                >
                  {item.quantity_received}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
                  {item.unit}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>
                  {formatCurrency(item.unit_price)}
                </td>
                <td className="px-4 py-3 text-sm font-medium" style={{ color: 'hsl(var(--primary))' }}>
                  {formatCurrency(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t" style={{ borderColor: 'hsl(var(--border))' }}>
              <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-right" style={{ color: 'hsl(var(--foreground))' }}>
                Total
              </td>
              <td className="px-4 py-3 text-sm font-bold" style={{ color: 'hsl(var(--primary))' }}>
                {formatCurrency(po.total_amount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
