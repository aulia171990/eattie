import { getOrders } from '@/actions/orders'
import { PageHeader } from '@/components/shared/page-header'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { ShoppingBag, Clock, CheckCircle, Package } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  NEW:             { label: 'Menunggu',    bg: 'hsl(36,80%,90%)',  color: 'hsl(32,95%,35%)' },
  PAID:            { label: 'Sudah Bayar', bg: 'hsl(210,70%,93%)', color: 'hsl(210,70%,35%)' },
  IN_PRODUCTION:   { label: 'Produksi',   bg: 'hsl(270,50%,93%)', color: 'hsl(270,50%,35%)' },
  READY_FOR_PICKUP:{ label: 'Siap Ambil', bg: 'hsl(142,50%,90%)', color: 'hsl(142,60%,28%)' },
  DELIVERED:       { label: 'Dikirim',    bg: 'hsl(210,60%,90%)', color: 'hsl(210,60%,30%)' },
  COMPLETED:       { label: 'Selesai',    bg: 'hsl(142,50%,90%)', color: 'hsl(142,60%,28%)' },
  CANCELLED:       { label: 'Dibatalkan', bg: 'hsl(0,80%,95%)',   color: 'hsl(0,70%,40%)' },
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>
}) {
  const sp = await searchParams
  const orders = await getOrders({ status: sp.status, search: sp.search })

  const pending   = orders.filter(o => o.status === 'NEW').length
  const confirmed = orders.filter(o => ['PAID','paid'].includes(o.payment_status)).length
  const ready     = orders.filter(o => o.status === 'READY_FOR_PICKUP').length

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <PageHeader
        title="Pesanan Online"
        description="Order masuk dari portal customer"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Pesanan Online' },
        ]}
        action={
          <Link href="/store" target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-gray-50"
            style={{ borderColor: 'hsl(36, 20%, 85%)', color: 'hsl(25, 30%, 35%)' }}>
            <ShoppingBag size={14} />
            Buka Portal
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Menunggu',     value: pending,   icon: <Clock size={16} />,        bg: 'hsl(36,80%,90%)',  ic: 'hsl(32,95%,40%)' },
          { label: 'Sudah Bayar',  value: confirmed, icon: <CheckCircle size={16} />,  bg: 'hsl(210,70%,93%)', ic: 'hsl(210,70%,40%)' },
          { label: 'Siap Ambil',   value: ready,     icon: <Package size={16} />,      bg: 'hsl(142,50%,90%)', ic: 'hsl(142,60%,35%)' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border p-3" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>{s.label}</p>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: s.bg, color: s.ic }}>{s.icon}</div>
            </div>
            <p className="text-xl font-bold" style={{ color: 'hsl(25, 30%, 12%)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: undefined,          label: 'Semua' },
          { key: 'NEW',              label: 'Menunggu' },
          { key: 'PAID',             label: 'Sudah Bayar' },
          { key: 'IN_PRODUCTION',    label: 'Produksi' },
          { key: 'READY_FOR_PICKUP', label: 'Siap Ambil' },
          { key: 'COMPLETED',        label: 'Selesai' },
        ].map(({ key, label }) => (
          <Link
            key={label}
            href={key ? `/dashboard/orders?status=${key}` : '/dashboard/orders'}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={sp.status === key || (!sp.status && !key)
              ? { background: 'hsl(32, 95%, 44%)', color: 'white' }
              : { background: 'white', color: 'hsl(25, 15%, 45%)', border: '1px solid hsl(36,20%,88%)' }
            }
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Orders list */}
      {orders.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <p className="text-3xl">📋</p>
          <p className="text-sm font-medium" style={{ color: 'hsl(25, 30%, 25%)' }}>Belum ada pesanan</p>
          <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>
            Pesanan dari portal customer akan muncul di sini.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(order => {
            const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.NEW
            return (
              <Link
                key={order.id}
                href={`/dashboard/orders/${order.id}`}
                className="block bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow"
                style={{ borderColor: 'hsl(36, 20%, 88%)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold font-mono" style={{ color: 'hsl(32, 95%, 40%)' }}>
                        {order.order_number}
                      </p>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                      {['PAID','paid'].includes(order.payment_status) && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: 'hsl(142, 50%, 90%)', color: 'hsl(142, 60%, 28%)' }}>
                          ✓ Lunas
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium mt-0.5" style={{ color: 'hsl(25, 30%, 20%)' }}>
                      {order.customer_name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'hsl(25, 15%, 55%)' }}>
                      {order.customer_phone} · {order.order_items.length} produk ·{' '}
                      {order.order_type === 'PICKUP' || order.order_type === 'pickup' ? '🏪 Ambil' : '🛵 Kirim'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold" style={{ color: 'hsl(32, 95%, 40%)' }}>
                      {formatCurrency(order.total_amount)}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'hsl(25, 15%, 55%)' }}>
                      {formatDateTime(order.created_at)}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
