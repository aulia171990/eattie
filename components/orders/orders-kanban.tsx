'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { OrderWithItems } from '@/actions/orders'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Clock, ChefHat, PackageCheck, CheckCircle2, XCircle, CreditCard, Search } from 'lucide-react'

const COLUMNS = [
  {
    key: 'NEW',
    label: 'Menunggu',
    icon: <Clock size={14} />,
    bg: 'hsl(var(--primary-subtle))',
    color: 'hsl(var(--primary))',
    headerBg: 'hsl(var(--primary))',
  },
  {
    key: 'IN_PRODUCTION',
    label: 'Produksi',
    icon: <ChefHat size={14} />,
    bg: 'hsl(var(--tier-platinum-bg))',
    color: 'hsl(var(--tier-platinum))',
    headerBg: 'hsl(var(--tier-platinum))',
  },
  {
    key: 'READY_FOR_PICKUP',
    label: 'Siap Ambil',
    icon: <PackageCheck size={14} />,
    bg: 'hsl(var(--info-bg))',
    color: 'hsl(var(--info))',
    headerBg: 'hsl(var(--info))',
  },
  {
    key: 'COMPLETED',
    label: 'Selesai',
    icon: <CheckCircle2 size={14} />,
    bg: 'hsl(var(--success-bg))',
    color: 'hsl(var(--success))',
    headerBg: 'hsl(var(--success))',
  },
  {
    key: 'CANCELLED',
    label: 'Dibatalkan',
    icon: <XCircle size={14} />,
    bg: 'hsl(var(--danger-bg))',
    color: 'hsl(var(--danger))',
    headerBg: 'hsl(var(--danger))',
  },
]

function OrderCard({ order }: { order: OrderWithItems }) {
  const isPaid = ['PAID', 'paid'].includes(order.payment_status)
  const isPickup = ['PICKUP', 'pickup'].includes(order.order_type)

  return (
    <Link
      href={`/dashboard/orders/${order.id}`}
      className="block bg-white rounded-xl border p-3 hover:shadow-md transition-all hover:-translate-y-0.5"
      style={{ borderColor: 'hsl(var(--border))' }}
    >
      {/* Order number + payment badge */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <span className="text-xs font-bold font-mono" style={{ color: 'hsl(var(--primary))' }}>
          {order.order_number}
        </span>
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${isPaid ? 'text-green-700' : 'text-amber-700'}`}
          style={{ background: isPaid ? 'hsl(var(--success-bg))' : 'hsl(var(--primary-subtle))' }}>
          {isPaid ? '✓ Lunas' : 'Belum Bayar'}
        </span>
      </div>

      {/* Customer name */}
      <p className="text-sm font-semibold mb-1 truncate" style={{ color: 'hsl(var(--foreground))' }}>
        {order.customer_name}
      </p>

      {/* Products */}
      <p className="text-xs mb-2 truncate" style={{ color: 'hsl(var(--text-muted))' }}>
        {order.order_items.map(i => `${i.product_name} ×${i.quantity}`).join(', ')}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
        <span className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
          {isPickup ? '🏪' : '🛵'} {formatDateTime(order.created_at)}
        </span>
        <span className="text-xs font-bold" style={{ color: 'hsl(var(--primary))' }}>
          {formatCurrency(order.total_amount)}
        </span>
      </div>
    </Link>
  )
}

export function OrdersKanban({ orders }: { orders: OrderWithItems[] }) {
  const [search, setSearch] = useState('')

  const filtered = search
    ? orders.filter(o =>
        o.order_number.toLowerCase().includes(search.toLowerCase()) ||
        o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        o.customer_phone.includes(search)
      )
    : orders

  // Stats
  const totalActive = orders.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status)).length
  const totalToday = orders.filter(o => {
    const d = new Date(o.created_at)
    const now = new Date()
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth()
  }).length
  const totalRevenue = orders
    .filter(o => o.status === 'COMPLETED')
    .reduce((sum, o) => sum + (o.total_amount ?? 0), 0)

  return (
    <div className="space-y-4">

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Order Aktif',   value: totalActive,               icon: <Clock size={15} />,         bg: 'hsl(var(--primary-subtle))',  ic: 'hsl(var(--primary))' },
          { label: 'Order Hari Ini', value: totalToday,               icon: <CreditCard size={15} />,    bg: 'hsl(var(--info-bg))', ic: 'hsl(var(--info))' },
          { label: 'Total Selesai', value: formatCurrency(totalRevenue), icon: <CheckCircle2 size={15} />, bg: 'hsl(var(--success-bg))', ic: 'hsl(var(--success))' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border p-3" style={{ borderColor: 'hsl(var(--border))' }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>{s.label}</p>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: s.bg, color: s.ic }}>{s.icon}</div>
            </div>
            <p className="text-base font-bold truncate" style={{ color: 'hsl(var(--foreground))' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-muted))' }} />
        <input
          type="text"
          placeholder="Cari order, nama, atau HP..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl border text-sm outline-none"
          style={{ borderColor: 'hsl(var(--border))', background: 'white' }}
        />
      </div>

      {/* Kanban board */}
      <div className="overflow-x-auto pb-4">
        <div style={{ display: 'flex', gap: '1rem', minWidth: `${COLUMNS.length * 280}px` }}>
          {COLUMNS.map(col => {
            const colOrders = filtered.filter(o => o.status === col.key)
            return (
              <div key={col.key} style={{ width: '268px', flexShrink: 0 }}>
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-2 rounded-xl mb-3"
                  style={{ background: col.headerBg }}>
                  <div className="flex items-center gap-1.5 text-white">
                    {col.icon}
                    <span className="text-xs font-semibold">{col.label}</span>
                  </div>
                  <span className="text-xs font-bold text-white bg-white/20 px-2 py-0.5 rounded-full">
                    {colOrders.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2 min-h-24">
                  {colOrders.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed p-4 text-center"
                      style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-muted))' }}>
                      <p className="text-xs">Tidak ada order</p>
                    </div>
                  ) : (
                    colOrders.map(order => (
                      <OrderCard key={order.id} order={order} />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
