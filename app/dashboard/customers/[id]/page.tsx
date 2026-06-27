import React from 'react'
import { getCustomer, getCustomerOrderHistory } from '@/actions/customers'
import { formatCurrency, formatDate, formatDateTime, formatCompact } from '@/lib/utils'
import { notFound } from 'next/navigation'
import { Crown, Star, Award, Medal, Phone, Mail, MapPin, ArrowLeft, ShoppingBag, ChevronRight, Calendar } from 'lucide-react'
import { EditCustomerForm } from '@/components/customers/edit-customer-form'
import Link from 'next/link'

const TIER = {
  BRONZE: {
    label: 'Bronze',
    gradient: 'linear-gradient(135deg, #c8956a 0%, #e8b48a 100%)',
    bg: 'hsl(25, 40%, 95%)', border: 'hsl(25, 40%, 85%)', color: 'hsl(25, 55%, 35%)',
    icon: <Medal size={15} />, next: 'SILVER', threshold: 500000,
  },
  SILVER: {
    label: 'Silver',
    gradient: 'linear-gradient(135deg, #7a8fa6 0%, #a8bed4 100%)',
    bg: 'hsl(210, 20%, 95%)', border: 'hsl(210, 20%, 82%)', color: 'hsl(210, 25%, 35%)',
    icon: <Award size={15} />, next: 'GOLD', threshold: 1500000,
  },
  GOLD: {
    label: 'Gold',
    gradient: 'linear-gradient(135deg, #c9960a 0%, #f0bf40 100%)',
    bg: 'hsl(45, 90%, 94%)', border: 'hsl(45, 80%, 75%)', color: 'hsl(40, 85%, 28%)',
    icon: <Star size={15} />, next: 'PLATINUM', threshold: 5000000,
  },
  PLATINUM: {
    label: 'Platinum',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
    bg: 'hsl(270, 40%, 95%)', border: 'hsl(270, 40%, 80%)', color: 'hsl(270, 55%, 40%)',
    icon: <Crown size={15} />, next: null, threshold: 0,
  },
} as const

type TierKey = keyof typeof TIER

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  NEW:             { label: 'Menunggu',   bg: 'hsl(36,80%,92%)',  color: 'hsl(32,95%,35%)' },
  PAID:            { label: 'Dibayar',    bg: 'hsl(210,70%,93%)', color: 'hsl(210,70%,35%)' },
  IN_PRODUCTION:   { label: 'Produksi',   bg: 'hsl(270,50%,93%)', color: 'hsl(270,50%,35%)' },
  READY_FOR_PICKUP:{ label: 'Siap Ambil', bg: 'hsl(142,50%,90%)', color: 'hsl(142,60%,28%)' },
  DELIVERED:       { label: 'Dikirim',    bg: 'hsl(210,60%,90%)', color: 'hsl(210,60%,30%)' },
  COMPLETED:       { label: 'Selesai',    bg: 'hsl(142,50%,90%)', color: 'hsl(142,60%,28%)' },
  CANCELLED:       { label: 'Dibatalkan', bg: 'hsl(0,80%,95%)',   color: 'hsl(0,70%,40%)' },
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
  const tier = TIER[customer.tier as TierKey] ?? TIER.BRONZE
  const nextTier = tier.next ? TIER[tier.next as TierKey] : null
  const progressPct = nextTier
    ? Math.min(100, (customer.total_spending / tier.threshold) * 100)
    : 100
  const remaining = tier.threshold > 0 ? Math.max(0, tier.threshold - customer.total_spending) : 0
  const avgOrder = customer.total_orders > 0
    ? customer.total_spending / customer.total_orders
    : 0

  return (
    <div className="p-4 lg:p-6 max-w-2xl space-y-4">

      {/* Back */}
      <Link href="/dashboard/customers"
        className="inline-flex items-center gap-1.5 text-xs font-medium hover:opacity-70 transition-opacity"
        style={{ color: 'hsl(25, 30%, 40%)' }}>
        <ArrowLeft size={13} /> Semua Pelanggan
      </Link>

      {/* Hero profile card */}
      <div className="rounded-2xl overflow-hidden">
        {/* Gradient banner */}
        <div className="h-20 w-full" style={{ background: tier.gradient }} />
        {/* Profile */}
        <div className="bg-white border border-t-0 rounded-b-2xl px-5 pb-5"
          style={{ borderColor: 'hsl(36, 20%, 90%)' }}>
          <div className="flex items-end gap-4 -mt-7 mb-4">
            <div className="w-14 h-14 rounded-2xl border-4 border-white flex items-center justify-center text-xl font-bold shadow-sm"
              style={{ background: tier.bg, color: tier.color }}>
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div className="pb-1 flex-1 min-w-0">
              <h1 className="text-lg font-bold truncate" style={{ color: 'hsl(25, 30%, 12%)' }}>
                {customer.name}
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: tier.bg, color: tier.color }}>
                  {tier.icon} {tier.label}
                </span>
              </div>
            </div>
          </div>

          {/* Contact row */}
          <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'hsl(25, 15%, 50%)' }}>
            <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 hover:opacity-70">
              <Phone size={12} /> {customer.phone}
            </a>
            {customer.email && (
              <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 hover:opacity-70">
                <Mail size={12} /> {customer.email}
              </a>
            )}
            {customer.address && (
              <span className="flex items-center gap-1.5">
                <MapPin size={12} /> {customer.address}
              </span>
            )}
            {customer.last_order_date && (
              <span className="flex items-center gap-1.5">
                <Calendar size={12} /> Terakhir order {formatDate(customer.last_order_date)}
              </span>
            )}
          </div>

          {customer.notes && (
            <div className="mt-3 p-3 rounded-xl text-xs italic"
              style={{ background: 'hsl(36, 20%, 97%)', color: 'hsl(25, 20%, 45%)' }}>
              💬 {customer.notes}
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Belanja', value: formatCompact(customer.total_spending), sub: formatCurrency(customer.total_spending) },
          { label: 'Total Order', value: customer.total_orders.toString(), sub: 'transaksi' },
          { label: 'Rata-rata', value: formatCompact(avgOrder), sub: 'per order' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border p-3 text-center"
            style={{ borderColor: 'hsl(36, 20%, 90%)' }}>
            <p className="text-lg font-bold" style={{ color: 'hsl(25, 30%, 12%)' }}>{s.value}</p>
            <p className="text-[10px] font-medium" style={{ color: 'hsl(25, 15%, 55%)' }}>{s.label}</p>
            <p className="text-[9px] mt-0.5" style={{ color: 'hsl(25, 15%, 68%)' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tier progress */}
      {nextTier && (
        <div className="bg-white rounded-2xl border p-4" style={{ borderColor: 'hsl(36, 20%, 90%)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: tier.bg, color: tier.color }}>
                {tier.icon}
              </div>
              <span className="text-xs font-semibold" style={{ color: 'hsl(25, 30%, 20%)' }}>
                {tier.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>
              <span>Kurang</span>
              <span className="font-semibold" style={{ color: nextTier.color }}>
                {formatCompact(remaining)}
              </span>
              <span>→ {nextTier.label}</span>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: nextTier.bg, color: nextTier.color }}>
                {nextTier.icon}
              </div>
            </div>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'hsl(36, 20%, 93%)' }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${progressPct}%`, background: tier.gradient }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px]" style={{ color: 'hsl(25, 15%, 60%)' }}>
              {formatCompact(customer.total_spending)}
            </span>
            <span className="text-[10px]" style={{ color: 'hsl(25, 15%, 60%)' }}>
              {formatCompact(tier.threshold)}
            </span>
          </div>
        </div>
      )}

      {/* Order history */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'hsl(36, 20%, 90%)' }}>
        <div className="px-4 py-3 flex items-center justify-between border-b"
          style={{ borderColor: 'hsl(36, 20%, 93%)' }}>
          <div className="flex items-center gap-2">
            <ShoppingBag size={14} style={{ color: 'hsl(32, 95%, 44%)' }} />
            <p className="text-sm font-semibold" style={{ color: 'hsl(25, 30%, 15%)' }}>
              Riwayat Order
            </p>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'hsl(36, 20%, 93%)', color: 'hsl(25, 15%, 50%)' }}>
            {orders.length} order
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="py-10 text-center space-y-1">
            <ShoppingBag size={24} className="mx-auto opacity-20" style={{ color: 'hsl(25, 30%, 30%)' }} />
            <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>Belum ada riwayat order</p>
          </div>
        ) : (
          orders.map((o, idx) => {
            const sc = STATUS_CONFIG[o.status] ?? STATUS_CONFIG.NEW
            return (
              <a key={o.id} href={`/dashboard/orders/${o.id}`}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group ${idx > 0 ? 'border-t' : ''}`}
                style={{ borderColor: 'hsl(36, 20%, 95%)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: sc.bg, color: sc.color }}>
                  <ShoppingBag size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold font-mono" style={{ color: 'hsl(32, 95%, 40%)' }}>
                    {o.order_number}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: sc.bg, color: sc.color }}>
                      {sc.label}
                    </span>
                    <span className="text-[10px]" style={{ color: 'hsl(25, 15%, 60%)' }}>
                      {formatDateTime(o.created_at)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <p className="text-sm font-bold" style={{ color: 'hsl(25, 30%, 15%)' }}>
                    {formatCompact(o.total_amount)}
                  </p>
                  <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'hsl(25, 15%, 55%)' }} />
                </div>
              </a>
            )
          })
        )}
      </div>

      {/* Edit form */}
      <EditCustomerForm customer={customer} />
    </div>
  )
}
