import React from 'react'
import { getCustomers, getCustomerStats } from '@/actions/customers'
import { formatCurrency, formatDate, formatCompact } from '@/lib/utils'
import Link from 'next/link'
import { Users, Crown, Star, Award, Medal, Search, ChevronRight, TrendingUp } from 'lucide-react'
import { AddCustomerButton } from '@/components/customers/add-customer-button'

const TIER = {
  BRONZE: {
    label: 'Bronze',
    gradient: 'linear-gradient(135deg, #c8956a 0%, #e8b48a 100%)',
    bg: 'hsl(25, 40%, 95%)',
    border: 'hsl(25, 40%, 85%)',
    color: 'hsl(25, 55%, 35%)',
    icon: <Medal size={14} />,
    min: 0,
    max: 500000,
  },
  SILVER: {
    label: 'Silver',
    gradient: 'linear-gradient(135deg, #7a8fa6 0%, #a8bed4 100%)',
    bg: 'hsl(210, 20%, 95%)',
    border: 'hsl(210, 20%, 82%)',
    color: 'hsl(210, 25%, 35%)',
    icon: <Award size={14} />,
    min: 500000,
    max: 1500000,
  },
  GOLD: {
    label: 'Gold',
    gradient: 'linear-gradient(135deg, #c9960a 0%, #f0bf40 100%)',
    bg: 'hsl(45, 90%, 94%)',
    border: 'hsl(45, 80%, 75%)',
    color: 'hsl(40, 85%, 28%)',
    icon: <Star size={14} />,
    min: 1500000,
    max: 5000000,
  },
  PLATINUM: {
    label: 'Platinum',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
    bg: 'hsl(270, 40%, 95%)',
    border: 'hsl(270, 40%, 80%)',
    color: 'hsl(270, 55%, 40%)',
    icon: <Crown size={14} />,
    min: 5000000,
    max: Infinity,
  },
} as const

type TierKey = keyof typeof TIER

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; tier?: string; page?: string }>
}) {
  const sp = await searchParams
  const page = parseInt(sp.page ?? '1', 10)

  const [result, stats] = await Promise.all([
    getCustomers({ search: sp.search, tier: sp.tier as TierKey | undefined, page }),
    getCustomerStats(),
  ])

  const { data: customers, total, pageSize } = result
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const activeTier = sp.tier as TierKey | undefined

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'hsl(25, 30%, 12%)' }}>Pelanggan</h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(25, 15%, 50%)' }}>
            {stats.total} pelanggan terdaftar
          </p>
        </div>
        <AddCustomerButton />
      </div>

      {/* Total revenue hero card */}
      <div className="rounded-2xl p-5 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, hsl(25,30%,15%) 0%, hsl(25,30%,22%) 100%)' }}>
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'hsl(32,95%,44%)', transform: 'translate(30%, -30%)' }} />
        <p className="text-xs font-medium opacity-60 uppercase tracking-widest mb-1">Total Nilai Pelanggan</p>
        <p className="text-3xl font-bold">{formatCompact(stats.totalRevenue)}</p>
        <div className="flex items-center gap-1.5 mt-2 opacity-70">
          <TrendingUp size={13} />
          <span className="text-xs">Dari {stats.total} pelanggan aktif</span>
        </div>
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(Object.keys(TIER) as TierKey[]).map(key => {
          const t = TIER[key]
          const count = stats.byTier[key] ?? 0
          const isActive = activeTier === key
          return (
            <Link key={key}
              href={isActive ? '/dashboard/customers' : `/dashboard/customers?tier=${key}`}
              className="relative rounded-2xl p-4 overflow-hidden transition-all hover:scale-[1.02]"
              style={{
                background: isActive ? t.gradient : t.bg,
                border: `1.5px solid ${isActive ? 'transparent' : t.border}`,
                boxShadow: isActive ? '0 4px 20px rgba(0,0,0,0.15)' : 'none',
              }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.25)' : 'white',
                    color: isActive ? 'white' : t.color,
                  }}>
                  {t.icon}
                </div>
                {isActive && (
                  <span className="text-[10px] font-bold text-white bg-white/20 px-2 py-0.5 rounded-full">
                    Aktif
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold mb-0.5"
                style={{ color: isActive ? 'white' : 'hsl(25, 30%, 12%)' }}>
                {count}
              </p>
              <p className="text-xs font-medium"
                style={{ color: isActive ? 'rgba(255,255,255,0.75)' : t.color }}>
                {t.label}
              </p>
            </Link>
          )
        })}
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'hsl(25, 15%, 55%)' }} />
          <form>
            {activeTier && <input type="hidden" name="tier" value={activeTier} />}
            <input
              type="text"
              name="search"
              defaultValue={sp.search}
              placeholder="Cari nama atau nomor HP..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-shadow focus:shadow-sm"
              style={{ borderColor: 'hsl(36, 20%, 86%)', background: 'white' }}
            />
          </form>
        </div>
        {activeTier && (
          <Link href="/dashboard/customers"
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors hover:bg-gray-50"
            style={{ borderColor: 'hsl(36, 20%, 86%)', color: 'hsl(25, 30%, 40%)' }}>
            ✕ {TIER[activeTier].label}
          </Link>
        )}
      </div>

      {/* Customer list */}
      {customers.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: 'hsl(36, 20%, 93%)' }}>
            <Users size={28} style={{ color: 'hsl(25, 15%, 55%)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'hsl(25, 30%, 25%)' }}>
              {sp.search ? `Tidak ada hasil untuk "${sp.search}"` : 'Belum ada pelanggan'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'hsl(25, 15%, 55%)' }}>
              Pelanggan otomatis tercatat setelah order pertama.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map(c => {
            const tier = TIER[c.tier as TierKey] ?? TIER.BRONZE
            const progressPct = tier.max === Infinity
              ? 100
              : Math.min(100, ((c.total_spending - tier.min) / (tier.max - tier.min)) * 100)

            return (
              <Link key={c.id} href={`/dashboard/customers/${c.id}`}
                className="flex items-center gap-3 bg-white rounded-2xl border p-3.5 hover:shadow-md transition-all hover:-translate-y-px group"
                style={{ borderColor: 'hsl(36, 20%, 90%)' }}>

                {/* Avatar with tier ring */}
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-base font-bold"
                    style={{ background: tier.bg, color: tier.color }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: tier.gradient }}>
                    <span style={{ color: 'white', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {c.tier === 'PLATINUM' ? '♛' : c.tier === 'GOLD' ? '★' : c.tier === 'SILVER' ? '◈' : '◆'}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold truncate" style={{ color: 'hsl(25, 30%, 12%)' }}>
                      {c.name}
                    </p>
                  </div>
                  <p className="text-xs mb-1.5" style={{ color: 'hsl(25, 15%, 55%)' }}>
                    {c.phone}
                    {c.total_orders > 0 && ` · ${c.total_orders}× order`}
                    {c.last_order_date && ` · ${formatDate(c.last_order_date)}`}
                  </p>
                  {/* Tier progress bar */}
                  {tier.max !== Infinity && (
                    <div className="h-1 rounded-full overflow-hidden w-24"
                      style={{ background: 'hsl(36, 20%, 92%)' }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${progressPct}%`, background: tier.gradient }} />
                    </div>
                  )}
                </div>

                {/* Spending + chevron */}
                <div className="text-right shrink-0 flex items-center gap-2">
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'hsl(32, 95%, 40%)' }}>
                      {formatCompact(c.total_spending)}
                    </p>
                    <p className="text-[10px]" style={{ color: tier.color }}>
                      {tier.label}
                    </p>
                  </div>
                  <ChevronRight size={15} className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'hsl(25, 15%, 55%)' }} />
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-2">
          {page > 1 && (
            <Link href={`/dashboard/customers?page=${page - 1}${activeTier ? `&tier=${activeTier}` : ''}`}
              className="px-3 py-1.5 rounded-lg text-xs border transition-colors hover:bg-gray-50"
              style={{ borderColor: 'hsl(36,20%,88%)', color: 'hsl(25,30%,30%)' }}>
              ‹ Sebelumnya
            </Link>
          )}
          <span className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'hsl(32, 95%, 44%)', color: 'white' }}>
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/dashboard/customers?page=${page + 1}${activeTier ? `&tier=${activeTier}` : ''}`}
              className="px-3 py-1.5 rounded-lg text-xs border transition-colors hover:bg-gray-50"
              style={{ borderColor: 'hsl(36,20%,88%)', color: 'hsl(25,30%,30%)' }}>
              Berikutnya ›
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
