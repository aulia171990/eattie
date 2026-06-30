import { getOrder } from '@/actions/orders'
import { confirmOrderPayment, cancelOrder, updateOrderStatus, markOrderAsPaid } from '@/actions/orders'
import { PageHeader } from '@/components/shared/page-header'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { notFound } from 'next/navigation'
import { OrderActionButtons, MarkPaidButton } from '@/components/forms/order-action-buttons'

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  NEW:             { label: 'Menunggu',    bg: 'hsl(36,80%,90%)',  color: 'hsl(32,95%,35%)' },
  PAID:            { label: 'Sudah Bayar', bg: 'hsl(210,70%,93%)', color: 'hsl(210,70%,35%)' },
  IN_PRODUCTION:   { label: 'Produksi',   bg: 'hsl(270,50%,93%)', color: 'hsl(270,50%,35%)' },
  READY_FOR_PICKUP:{ label: 'Siap Ambil', bg: 'hsl(142,50%,90%)', color: 'hsl(142,60%,28%)' },
  DELIVERED:       { label: 'Dikirim',    bg: 'hsl(210,60%,90%)', color: 'hsl(210,60%,30%)' },
  COMPLETED:       { label: 'Selesai',    bg: 'hsl(142,50%,90%)', color: 'hsl(142,60%,28%)' },
  CANCELLED:       { label: 'Dibatalkan', bg: 'hsl(0,80%,95%)',   color: 'hsl(0,70%,40%)' },
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let order
  try {
    order = await getOrder(id)
  } catch {
    notFound()
  }

  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.NEW
  const boundConfirm = confirmOrderPayment.bind(null, id)
  const boundCancel  = cancelOrder.bind(null, id)
  const boundUpdate  = updateOrderStatus.bind(null, id)
  const boundMarkPaid = markOrderAsPaid.bind(null, id)
  const isDone = ['CANCELLED','COMPLETED','cancelled','completed'].includes(order.status)
  const isPaid = ['PAID','paid'].includes(order.payment_status)

  return (
    <div className="p-4 lg:p-6 max-w-2xl space-y-4">
      <PageHeader
        title={order.order_number}
        description={`${order.customer_name} · ${formatDateTime(order.created_at)}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Pesanan Online', href: '/dashboard/orders' },
          { label: order.order_number },
        ]}
        action={
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.label}
          </span>
        }
      />

      {/* Customer info */}
      <div className="bg-white rounded-xl border p-4 space-y-3" style={{ borderColor: 'hsl(var(--border))' }}>
        <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-muted))' }}>INFO PEMESAN</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Nama',     value: order.customer_name },
            { label: 'HP / WA', value: order.customer_phone },
            { label: 'Tipe',    value: ['PICKUP','pickup'].includes(order.order_type) ? '🏪 Ambil di Toko' : '🛵 Dikirim' },
            { label: 'Pembayaran', value: isPaid ? '✓ Lunas' : 'Belum Lunas' },
            ...(order.pickup_date ? [{ label: 'Tanggal Ambil', value: formatDate(order.pickup_date) }] : []),
            ...(order.pickup_time ? [{ label: 'Jam Ambil', value: order.pickup_time }] : []),
            ...(order.delivery_address ? [{ label: 'Alamat Kirim', value: order.delivery_address }] : []),
          ].map(row => (
            <div key={row.label}>
              <p className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>{row.label}</p>
              <p className="text-sm font-medium mt-0.5" style={{ color: 'hsl(var(--foreground))' }}>{row.value}</p>
            </div>
          ))}
        </div>
        {order.notes && (
          <div className="pt-3 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
            <p className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>Catatan</p>
            <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--text-secondary))' }}>{order.notes}</p>
          </div>
        )}
      </div>

      {/* Payment proof */}
      {order.payment_proof_url && (
        <div className="bg-white rounded-xl border p-4 space-y-3" style={{ borderColor: 'hsl(var(--border))' }}>
          <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-muted))' }}>BUKTI PEMBAYARAN</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={order.payment_proof_url} alt="Bukti pembayaran"
            className="w-full max-w-xs rounded-xl border object-cover"
            style={{ borderColor: 'hsl(var(--border))' }} />
        </div>
      )}

      {/* Order items */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
          <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-muted))' }}>DETAIL PESANAN</p>
        </div>
        {order.order_items.map((item, idx) => (
          <div key={item.id}
            className={`flex items-center justify-between px-4 py-3 ${idx > 0 ? 'border-t' : ''}`}
            style={{ borderColor: 'hsl(var(--border))' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>{item.product_name}</p>
              <p className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
                {item.quantity} × {formatCurrency(item.unit_price)}
              </p>
            </div>
            <p className="text-sm font-bold" style={{ color: 'hsl(var(--primary))' }}>
              {formatCurrency(item.subtotal)}
            </p>
          </div>
        ))}
        <div className="flex justify-between items-center px-4 py-3 border-t"
          style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--surface-raised))' }}>
          <span className="text-sm font-semibold">Total</span>
          <span className="text-base font-bold" style={{ color: 'hsl(var(--primary))' }}>
            {formatCurrency(order.total_amount)}
          </span>
        </div>
      </div>

      {/* Sale link */}
      {order.sale_id && (
        <div className="p-3 rounded-xl text-sm"
          style={{ background: 'hsl(var(--success-subtle))', color: 'hsl(142, 60%, 30%)' }}>
          ✓ Order sudah dikonfirmasi dan masuk sebagai sale.
        </div>
      )}

      {/* Actions */}
      {!isDone && (
        <OrderActionButtons
          order={order}
          confirmAction={boundConfirm}
          cancelAction={boundCancel}
          updateStatusAction={boundUpdate}
        />
      )}

      {/* Mark as paid - for completed orders with unpaid status */}
      {isDone && !isPaid && order.status !== 'CANCELLED' && (
        <MarkPaidButton markPaidAction={boundMarkPaid} />
      )}
    </div>
  )
}
