import { getOrder } from '@/actions/orders'
import { confirmOrderPayment, cancelOrder, updateOrderStatus } from '@/actions/orders'
import { PageHeader } from '@/components/shared/page-header'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { notFound } from 'next/navigation'
import { OrderActionButtons } from '@/components/forms/order-action-buttons'

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  pending:       { label: 'Menunggu',     bg: 'hsl(36,80%,90%)',    color: 'hsl(32,95%,35%)' },
  confirmed:     { label: 'Dikonfirmasi', bg: 'hsl(210,70%,93%)',   color: 'hsl(210,70%,35%)' },
  in_production: { label: 'Produksi',     bg: 'hsl(270,50%,93%)',   color: 'hsl(270,50%,35%)' },
  ready:         { label: 'Siap Ambil',   bg: 'hsl(142,50%,90%)',   color: 'hsl(142,60%,28%)' },
  delivered:     { label: 'Dikirim',      bg: 'hsl(210,60%,90%)',   color: 'hsl(210,60%,30%)' },
  completed:     { label: 'Selesai',      bg: 'hsl(142,50%,90%)',   color: 'hsl(142,60%,28%)' },
  cancelled:     { label: 'Dibatalkan',   bg: 'hsl(0,80%,95%)',     color: 'hsl(0,70%,40%)' },
  PENDING:       { label: 'Menunggu',     bg: 'hsl(36,80%,90%)',    color: 'hsl(32,95%,35%)' },
  CONFIRMED:     { label: 'Dikonfirmasi', bg: 'hsl(210,70%,93%)',   color: 'hsl(210,70%,35%)' },
  IN_PRODUCTION: { label: 'Produksi',     bg: 'hsl(270,50%,93%)',   color: 'hsl(270,50%,35%)' },
  READY:         { label: 'Siap Ambil',   bg: 'hsl(142,50%,90%)',   color: 'hsl(142,60%,28%)' },
  DELIVERED:     { label: 'Dikirim',      bg: 'hsl(210,60%,90%)',   color: 'hsl(210,60%,30%)' },
  COMPLETED:     { label: 'Selesai',      bg: 'hsl(142,50%,90%)',   color: 'hsl(142,60%,28%)' },
  CANCELLED:     { label: 'Dibatalkan',   bg: 'hsl(0,80%,95%)',     color: 'hsl(0,70%,40%)' },
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

  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending
  const boundConfirm = confirmOrderPayment.bind(null, id)
  const boundCancel  = cancelOrder.bind(null, id)
  const boundUpdate  = updateOrderStatus.bind(null, id)

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
      <div className="bg-white rounded-xl border p-4 space-y-3" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
        <p className="text-xs font-semibold" style={{ color: 'hsl(25, 15%, 45%)' }}>INFO PEMESAN</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Nama',     value: order.customer_name },
            { label: 'HP / WA', value: order.customer_phone },
            { label: 'Tipe',    value: order.order_type === 'pickup' ? '🏪 Ambil di Toko' : '🛵 Dikirim' },
            { label: 'Pembayaran', value: order.payment_status === 'PAID' || order.payment_status === 'paid' ? '✓ Lunas' : 'Belum Lunas' },
            ...(order.pickup_date ? [{ label: 'Tanggal Ambil', value: formatDate(order.pickup_date) }] : []),
            ...(order.pickup_time ? [{ label: 'Jam Ambil', value: order.pickup_time }] : []),
            ...(order.delivery_address ? [{ label: 'Alamat Kirim', value: order.delivery_address }] : []),
          ].map(row => (
            <div key={row.label}>
              <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>{row.label}</p>
              <p className="text-sm font-medium mt-0.5" style={{ color: 'hsl(25, 30%, 15%)' }}>{row.value}</p>
            </div>
          ))}
        </div>
        {order.notes && (
          <div className="pt-3 border-t" style={{ borderColor: 'hsl(36, 20%, 92%)' }}>
            <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>Catatan</p>
            <p className="text-sm mt-0.5" style={{ color: 'hsl(25, 30%, 20%)' }}>{order.notes}</p>
          </div>
        )}
      </div>

      {/* Payment proof */}
      {order.payment_proof_url && (
        <div className="bg-white rounded-xl border p-4 space-y-3" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
          <p className="text-xs font-semibold" style={{ color: 'hsl(25, 15%, 45%)' }}>BUKTI PEMBAYARAN</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={order.payment_proof_url}
            alt="Bukti pembayaran"
            className="w-full max-w-xs rounded-xl border object-cover"
            style={{ borderColor: 'hsl(36, 20%, 90%)' }}
          />
        </div>
      )}

      {/* Order items */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: 'hsl(36, 20%, 92%)' }}>
          <p className="text-xs font-semibold" style={{ color: 'hsl(25, 15%, 45%)' }}>DETAIL PESANAN</p>
        </div>
        {order.order_items.map((item, idx) => (
          <div key={item.id}
            className={`flex items-center justify-between px-4 py-3 ${idx > 0 ? 'border-t' : ''}`}
            style={{ borderColor: 'hsl(36, 20%, 94%)' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: 'hsl(25, 30%, 15%)' }}>{item.product_name}</p>
              <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>
                {item.quantity} × {formatCurrency(item.unit_price)}
              </p>
              {item.notes && (
                <p className="text-xs italic mt-0.5" style={{ color: 'hsl(25, 15%, 60%)' }}>{item.notes}</p>
              )}
            </div>
            <p className="text-sm font-bold" style={{ color: 'hsl(32, 95%, 40%)' }}>
              {formatCurrency(item.subtotal)}
            </p>
          </div>
        ))}
        <div className="flex justify-between items-center px-4 py-3 border-t"
          style={{ borderColor: 'hsl(36, 20%, 90%)', background: 'hsl(36, 20%, 98%)' }}>
          <span className="text-sm font-semibold">Total</span>
          <span className="text-base font-bold" style={{ color: 'hsl(32, 95%, 40%)' }}>
            {formatCurrency(order.total_amount)}
          </span>
        </div>
      </div>

      {/* Sale link if converted */}
      {order.sale_id && (
        <div className="p-3 rounded-xl flex items-center gap-2 text-sm"
          style={{ background: 'hsl(142, 50%, 95%)', color: 'hsl(142, 60%, 30%)' }}>
          ✓ Order sudah dikonfirmasi dan masuk sebagai sale.
        </div>
      )}

      {/* Action buttons */}
      {order.status !== 'cancelled' && order.status !== 'completed' && order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
        <OrderActionButtons
          order={order}
          confirmAction={boundConfirm}
          cancelAction={boundCancel}
          updateStatusAction={boundUpdate}
        />
      )}
    </div>
  )
}
