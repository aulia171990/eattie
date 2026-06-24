import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDashboardStats } from '@/actions/reports'
import { getProductionBatches } from '@/actions/production'
import { getSales } from '@/actions/sales'
import { formatCurrency, formatCompact, formatDate } from '@/lib/utils'
import { DashboardRevenueChart } from '@/components/charts/dashboard-revenue-chart'
import Link from 'next/link'
import { TrendingUp, ShoppingCart, AlertTriangle, Factory, ArrowUpRight, ArrowRight } from 'lucide-react'
import type { Profile } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,full_name,role,phone,avatar_url,is_active,created_at,updated_at')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const typedProfile = profile as Profile
  const isOwner = typedProfile.role === 'owner'
  const isCashier = typedProfile.role === 'cashier'

  // Fetch data based on role
  const [stats, activeBatches] = await Promise.all([
    isOwner ? getDashboardStats() : null,
    getProductionBatches({ status: 'in_progress' }),
  ])

  const recentSales = (isOwner || isCashier)
    ? await getSales({ dateFrom: new Date().toISOString().split('T')[0] })
    : []

  type StatColor = 'amber' | 'green' | 'red' | 'blue'
  const colorMap: Record<StatColor, { bg: string; icon: string }> = {
    amber: { bg: 'hsl(36, 80%, 93%)',  icon: 'hsl(32, 95%, 44%)' },
    green: { bg: 'hsl(142, 50%, 92%)', icon: 'hsl(142, 60%, 35%)' },
    red:   { bg: 'hsl(0, 80%, 95%)',   icon: 'hsl(0, 70%, 48%)' },
    blue:  { bg: 'hsl(210, 70%, 93%)', icon: 'hsl(210, 70%, 40%)' },
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'hsl(25, 30%, 12%)' }}>
            Selamat Datang, {typedProfile.full_name} 👋
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(25, 15%, 50%)' }}>
            {formatDate(new Date(), 'EEEE, dd MMMM yyyy')}
          </p>
        </div>
        {(isOwner || isCashier) && (
          <Link href="/pos"
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'hsl(32, 95%, 44%)' }}>
            <ShoppingCart size={16} /> Buka POS
          </Link>
        )}
      </div>

      {/* Owner stats cards */}
      {isOwner && stats && (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {(
              [
                { label: 'Pendapatan Hari Ini', value: formatCompact(stats.todayRevenue), sub: `${stats.todayTransactions} transaksi`, icon: <TrendingUp size={18} />, color: 'amber' as StatColor, href: '/dashboard/sales' },
                { label: 'Pendapatan Bulan Ini', value: formatCompact(stats.monthRevenue), sub: 'Bulan berjalan', icon: <ShoppingCart size={18} />, color: 'green' as StatColor, href: '/dashboard/reports/sales' },
                { label: 'Stok Rendah', value: stats.lowStockCount.toString(), sub: stats.lowStockCount > 0 ? 'Perlu reorder' : 'Semua aman', icon: <AlertTriangle size={18} />, color: (stats.lowStockCount > 0 ? 'red' : 'green') as StatColor, href: '/dashboard/inventory?filter=low_stock' },
                { label: 'Produksi Aktif', value: stats.activeBatchCount.toString(), sub: 'Batch berjalan', icon: <Factory size={18} />, color: 'blue' as StatColor, href: '/dashboard/production' },
              ]
            ).map((s) => {
              const c = colorMap[s.color]
              return (
                <Link key={s.label} href={s.href}
                  className="bg-white rounded-xl border p-5 group hover:shadow-sm transition-all"
                  style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'hsl(25, 15%, 50%)' }}>{s.label}</p>
                      <p className="text-lg lg:text-2xl font-bold mt-1.5 truncate" style={{ color: 'hsl(25, 30%, 12%)' }}>{s.value}</p>
                      <p className="text-xs mt-1" style={{ color: 'hsl(25, 15%, 55%)' }}>{s.sub}</p>
                    </div>
                    <div className="flex flex-col items-end justify-between gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: c.bg, color: c.icon }}>{s.icon}</div>
                      <ArrowUpRight size={15} className="opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: c.icon }} />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {stats.last7Data.some((d) => d.revenue > 0) && (
            <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-sm" style={{ color: 'hsl(25, 30%, 15%)' }}>
                  Pendapatan 7 Hari Terakhir
                </h2>
                <Link href="/dashboard/reports/sales"
                  className="flex items-center gap-1 text-xs hover:underline" style={{ color: 'hsl(32, 95%, 44%)' }}>
                  Detail <ArrowRight size={12} />
                </Link>
              </div>
              <DashboardRevenueChart data={stats.last7Data} />
            </div>
          )}
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production batches */}
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm" style={{ color: 'hsl(25, 30%, 15%)' }}>Produksi Aktif</h2>
            <Link href="/dashboard/production"
              className="flex items-center gap-1 text-xs hover:underline" style={{ color: 'hsl(32, 95%, 44%)' }}>
              Semua <ArrowRight size={12} />
            </Link>
          </div>
          {activeBatches.length > 0 ? (
            <div className="space-y-2">
              {activeBatches.slice(0, 5).map((batch) => (
                <Link key={batch.id} href={`/dashboard/production/${batch.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'hsl(25, 30%, 15%)' }}>
                      {batch.products?.name ?? 'Produk'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'hsl(25, 15%, 50%)' }}>
                      {batch.batch_number}
                      {batch.scheduled_date && ` • ${formatDate(batch.scheduled_date)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: 'hsl(36, 80%, 90%)', color: 'hsl(32, 95%, 38%)' }}>
                      Berlangsung
                    </span>
                    <p className="text-xs mt-1" style={{ color: 'hsl(25, 15%, 55%)' }}>
                      {batch.quantity_produced}/{batch.quantity_planned} pcs
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm" style={{ color: 'hsl(25, 15%, 60%)' }}>
              Tidak ada produksi aktif
            </p>
          )}
        </div>

        {/* Recent sales */}
        {(isOwner || isCashier) && (
          <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm" style={{ color: 'hsl(25, 30%, 15%)' }}>Transaksi Terbaru</h2>
              <Link href="/dashboard/sales"
                className="flex items-center gap-1 text-xs hover:underline" style={{ color: 'hsl(32, 95%, 44%)' }}>
                Semua <ArrowRight size={12} />
              </Link>
            </div>
            {recentSales.length > 0 ? (
              <div className="space-y-2">
                {recentSales.slice(0, 5).map((sale) => (
                  <Link key={sale.id} href={`/dashboard/sales/${sale.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'hsl(25, 30%, 15%)' }}>
                        {sale.invoice_number}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'hsl(25, 15%, 50%)' }}>
                        {sale.customer_name ?? 'Umum'} • {(sale.payment_method ?? '').toUpperCase()}
                      </p>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: 'hsl(32, 95%, 44%)' }}>
                      {formatCurrency(sale.total)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm" style={{ color: 'hsl(25, 15%, 60%)' }}>
                Belum ada transaksi hari ini
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
