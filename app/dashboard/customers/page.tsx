import React from 'react'
import { getCustomers, getCustomerStats } from '@/actions/customers'
import { PageHeader } from '@/components/shared/page-header'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Users, Crown, Star, Award, Medal, Plus } from 'lucide-react'
import { AddCustomerButton } from '@/components/customers/add-customer-button'

const TIER_STYLE: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  BRONZE:   { bg: 'hsl(25, 40%, 92%)',  color: 'hsl(25, 50%, 40%)', icon: <Medal size={13} /> },
  SILVER:   { bg: 'hsl(210, 15%, 92%)', color: 'hsl(210, 15%, 40%)', icon: <Award size={13} /> },
  GOLD:     { bg: 'hsl(45, 90%, 90%)',  color: 'hsl(40, 80%, 35%)', icon: <Star size={13} /> },
  PLATINUM: { bg: 'hsl(270, 40%, 93%)', color: 'hsl(270, 50%, 45%)', icon: <Crown size={13} /> },
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; tier?: string; page?: string }>
}) {
  const sp = await searchParams
  const page = parseInt(sp.page ?? '1', 10)

  const [result, stats] = await Promise.all([
    getCustomers({ search: sp.search, tier: sp.tier as 'all' | undefined, page }),
    getCustomerStats(),
  ])

  const { data: customers, total, pageSize } = result
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <PageHeader
        title="Pelanggan"
        description="Daftar pelanggan & riwayat belanja"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Pelanggan' },
        ]}
        action={<AddCustomerButton />}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border p-3" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>Total Pelanggan</p>
            <Users size={15} style={{ color: 'hsl(32, 95%, 40%)' }} />
          </div>
          <p className="text-lg font-bold" style={{ color: 'hsl(25, 30%, 12%)' }}>{stats.total}</p>
        </div>
        {(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'] as const).map(tier => {
          const style = TIER_STYLE[tier]
          return (
            <Link key={tier} href={`/dashboard/customers?tier=${tier}`}
              className="bg-white rounded-xl border p-3 hover:shadow-sm transition-shadow"
              style={{ borderColor: sp.tier === tier ? style.color : 'hsl(36, 20%, 88%)' }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>{tier}</p>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: style.bg, color: style.color }}>
                  {style.icon}
                </div>
              </div>
              <p className="text-lg font-bold" style={{ color: 'hsl(25, 30%, 12%)' }}>
                {stats.byTier[tier] ?? 0}
              </p>
            </Link>
          )
        })}
      </div>

      {/* Search + filter */}
      <div className="flex gap-2 flex-wrap items-center">
        <form className="flex-1 min-w-48">
          <input
            type="text"
            name="search"
            defaultValue={sp.search}
            placeholder="Cari nama atau nomor HP..."
            className="w-full px-4 py-2 rounded-xl border text-sm outline-none"
            style={{ borderColor: 'hsl(36, 20%, 88%)' }}
          />
        </form>
        {sp.tier && (
          <Link href="/dashboard/customers"
            className="text-xs px-3 py-2 rounded-lg border"
            style={{ borderColor: 'hsl(36, 20%, 88%)', color: 'hsl(25, 30%, 40%)' }}>
            ✕ Filter: {sp.tier}
          </Link>
        )}
      </div>

      {/* Customer list */}
      {customers.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <p className="text-3xl">👥</p>
          <p className="text-sm font-medium" style={{ color: 'hsl(25, 30%, 25%)' }}>
            Belum ada pelanggan
          </p>
          <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>
            Pelanggan otomatis tercatat setelah order pertama, atau tambah manual.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
          {customers.map((c, idx) => {
            const style = TIER_STYLE[c.tier]
            return (
              <Link
                key={c.id}
                href={`/dashboard/customers/${c.id}`}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${idx > 0 ? 'border-t' : ''}`}
                style={{ borderColor: 'hsl(36, 20%, 94%)' }}
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: 'hsl(32, 80%, 90%)', color: 'hsl(32, 95%, 35%)' }}>
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold truncate" style={{ color: 'hsl(25, 30%, 15%)' }}>
                      {c.name}
                    </p>
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0"
                      style={{ background: style.bg, color: style.color }}>
                      {style.icon} {c.tier}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>
                    {c.phone} · {c.total_orders} order
                    {c.last_order_date && ` · Terakhir ${formatDate(c.last_order_date)}`}
                  </p>
                </div>
                <p className="text-sm font-bold shrink-0" style={{ color: 'hsl(32, 95%, 40%)' }}>
                  {formatCurrency(c.total_spending)}
                </p>
              </Link>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <Link
              key={p}
              href={`/dashboard/customers?page=${p}${sp.tier ? `&tier=${sp.tier}` : ''}`}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium"
              style={p === page
                ? { background: 'hsl(32, 95%, 44%)', color: 'white' }
                : { background: 'white', border: '1px solid hsl(36,20%,88%)', color: 'hsl(25,30%,30%)' }
              }
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
