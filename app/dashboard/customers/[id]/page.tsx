import { getCustomer, getCustomerOrderHistory } from '@/actions/customers'
import { PageHeader } from '@/components/shared/page-header'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { notFound } from 'next/navigation'
import { Crown, Star, Award, Medal, Phone, Mail, MapPin } from 'lucide-react'
import { EditCustomerForm } from '@/components/customers/edit-customer-form'

const TIER_STYLE: Record<string, { bg: string; color: string; icon: React.ReactNode; next: string | null; threshold: number }> = {
  Bronze:   { bg: 'hsl(25, 40%, 92%)',  color: 'hsl(25, 50%, 40%)', icon: <Medal size={14} />, next: 'Silver', threshold: 500000 },
  Silver:   { bg: 'hsl(210, 15%, 92%)', color: 'hsl(210, 15%, 40%)', icon: <Award size={14} />, next: 'Gold', threshold: 1500000 },
  Gold:     { bg: 'hsl(45, 90%, 90%)',  color: 'hsl(40, 80%, 35%)', icon: <Star size={14} />, next: 'Platinum', threshold: 5000000 },
  Platinum: { bg: 'hsl(270, 40%, 93%)', color: 'hsl(270, 50%, 45%)', icon: <Crown size={14} />, next: null, threshold: 0 },
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  NEW: 'Menunggu', PAID: 'Sudah Bayar', IN_PRODUCTION: 'Produksi',
  READY_FOR_PICKUP: 'Siap Ambil', DELIVERED: 'Dikirim', COMPLETED: 'Selesai', CANCELLED: 'Dibatalkan',
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const customer = await getCustomer(id)
  if (!customer) notFound()

  const orders = await getCustomerOrderHistory(customer.phone)
  const style = TIER_STYLE[customer.tier]
  const remainingToNext = style.next ? Math.max(0, style.threshold - customer.total_spending) : 0

  return (
    <div className="p-4 lg:p-6 max-w-2xl space-y-4">
      <PageHeader
        title={customer.name}
        description={customer.phone}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Pelanggan', href: '/dashboard/customers' },
          { label: customer.name },
        ]}
        action={
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: style.bg, color: style.color }}>
            {style.icon} {customer.tier}
          </span>
        }
      />

      {/* Tier progress */}
      {style.next && (
        <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium" style={{ color: 'hsl(25, 30%, 30%)' }}>
              Menuju tier {style.next}
            </p>
            <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>
              Kurang {formatCurrency(remainingToNext)}
            </p>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'hsl(36, 20%, 92%)' }}>
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, (customer.total_spending / style.threshold) * 100)}%`,
                background: 'hsl(32, 95%, 44%)',
              }} />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border p-3" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
          <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>Total Belanja</p>
          <p className="text-lg font-bold" style={{ color: 'hsl(32, 95%, 40%)' }}>
            {formatCurrency(customer.total_spending)}
          </p>
        </div>
        <div className="bg-white rounded-xl border p-3" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
          <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>Total Order</p>
          <p className="text-lg font-bold" style={{ color: 'hsl(25, 30%, 12%)' }}>
            {customer.total_orders}
          </p>
        </div>
      </div>

      {/* Contact info */}
      <div className="bg-white rounded-xl border p-4 space-y-3" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
        <p className="text-xs font-semibold" style={{ color: 'hsl(25, 15%, 45%)' }}>INFO KONTAK</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm" style={{ color: 'hsl(25, 30%, 20%)' }}>
            <Phone size={14} style={{ color: 'hsl(25, 15%, 55%)' }} />
            {customer.phone}
          </div>
          {customer.email && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'hsl(25, 30%, 20%)' }}>
              <Mail size={14} style={{ color: 'hsl(25, 15%, 55%)' }} />
              {customer.email}
            </div>
          )}
          {customer.address && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'hsl(25, 30%, 20%)' }}>
              <MapPin size={14} style={{ color: 'hsl(25, 15%, 55%)' }} />
              {customer.address}
            </div>
          )}
        </div>
        {customer.last_order_date && (
          <p className="text-xs pt-2 border-t" style={{ borderColor: 'hsl(36, 20%, 92%)', color: 'hsl(25, 15%, 55%)' }}>
            Order terakhir: {formatDate(customer.last_order_date)}
          </p>
        )}
      </div>

      {/* Order history */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: 'hsl(36, 20%, 92%)' }}>
          <p className="text-xs font-semibold" style={{ color: 'hsl(25, 15%, 45%)' }}>RIWAYAT ORDER</p>
        </div>
        {orders.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>
            Belum ada riwayat order online
          </p>
        ) : (
          orders.map((o, idx) => (
            <a key={o.id} href={`/dashboard/orders/${o.id}`}
              className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors ${idx > 0 ? 'border-t' : ''}`}
              style={{ borderColor: 'hsl(36, 20%, 94%)' }}>
              <div>
                <p className="text-sm font-medium font-mono" style={{ color: 'hsl(32, 95%, 40%)' }}>
                  {o.order_number}
                </p>
                <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>
                  {ORDER_STATUS_LABEL[o.status] ?? o.status} · {formatDateTime(o.created_at)}
                </p>
              </div>
              <p className="text-sm font-bold" style={{ color: 'hsl(25, 30%, 15%)' }}>
                {formatCurrency(o.total_amount)}
              </p>
            </a>
          ))
        )}
      </div>

      {/* Edit form */}
      <EditCustomerForm customer={customer} />
    </div>
  )
}
