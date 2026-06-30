import Link from 'next/link'
import { getSales } from '@/actions/sales'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { formatCurrency, formatCompact, formatDateTime } from '@/lib/utils'
import { ShoppingCart, TrendingUp, Receipt, Ban } from 'lucide-react'
import { format, startOfMonth } from 'date-fns'

interface SearchParams {
  search?: string
  dateFrom?: string
  dateTo?: string
  status?: string
}

const paymentLabels: Record<string, string> = {
  cash: '💵 Tunai',
  card: '💳 Kartu',
  transfer: '🏦 Transfer',
  qris: '📱 QRIS',
}

const statusStyle: Record<string, { label: string; bg: string; text: string }> = {
  completed: { label: 'Selesai',    bg: 'hsl(var(--success-bg))', text: 'hsl(var(--success))' },
  pending:   { label: 'Pending',    bg: 'hsl(var(--primary-subtle))',  text: 'hsl(var(--primary-hover))' },
  cancelled: { label: 'Dibatalkan', bg: 'hsl(var(--danger-bg))',   text: 'hsl(var(--danger))' },
  refunded:  { label: 'Refund',     bg: 'hsl(210, 60%, 93%)', text: 'hsl(210, 60%, 35%)' },
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const today = format(new Date(), 'yyyy-MM-dd')

  // Get current user role
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()
  const isOwner = profile?.role === 'owner'

  const sales = await getSales({
    search: sp.search,
    dateFrom: sp.dateFrom ?? today,
    dateTo: sp.dateTo ?? today,
    status: sp.status,
  })

  const completed = sales.filter((s) => s.status === 'completed')
  const totalRevenue = completed.reduce((s, t) => s + t.total, 0)
  const avgOrder = completed.length > 0 ? totalRevenue / completed.length : 0

  return (
    <div className="p-6">
      <PageHeader
        title="Riwayat Penjualan"
        description="Rekap semua transaksi penjualan"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Penjualan' }]}
        action={
          <Link
            href="/pos"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'hsl(var(--primary))' }}
          >
            <ShoppingCart size={16} /> Buka POS
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Transaksi',  value: completed.length,          icon: <Receipt size={18} />,     bg: 'hsl(210,70%,93%)', ic: 'hsl(210,70%,40%)', ownerOnly: false },
          { label: 'Total Pendapatan', value: formatCurrency(totalRevenue), icon: <TrendingUp size={18} />,  bg: 'hsl(var(--primary-subtle))',  ic: 'hsl(var(--primary))',  ownerOnly: true },
          { label: 'Rata-rata Order',  value: formatCurrency(avgOrder),    icon: <ShoppingCart size={18} />, bg: 'hsl(142,50%,92%)', ic: 'hsl(142,60%,35%)', ownerOnly: true },
          { label: 'Dibatalkan',       value: sales.filter((s) => s.status === 'cancelled').length, icon: <Ban size={18} />, bg: 'hsl(0,80%,95%)', ic: 'hsl(0,70%,48%)', ownerOnly: false },
        ].filter(s => !s.ownerOnly || isOwner).map((s) => (
          <div key={s.label} className="bg-white rounded-xl border p-4" style={{ borderColor: 'hsl(var(--border))' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-muted))' }}>{s.label}</p>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: s.bg, color: s.ic }}>{s.icon}</div>
            </div>
            <p className="text-base lg:text-xl font-bold truncate" style={{ color: 'hsl(var(--foreground))' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <form className="bg-white rounded-xl border p-4 mb-4 flex flex-wrap gap-3"
        style={{ borderColor: 'hsl(var(--border))' }}>
        <input name="search" defaultValue={sp.search} placeholder="Cari invoice / nama pelanggan..."
          className="flex-1 min-w-48 px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: 'hsl(var(--border))' }} />
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium whitespace-nowrap" style={{ color: 'hsl(var(--text-muted))' }}>Dari</label>
          <input name="dateFrom" type="date" defaultValue={sp.dateFrom ?? today}
            className="px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'hsl(var(--border))' }} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium whitespace-nowrap" style={{ color: 'hsl(var(--text-muted))' }}>Sampai</label>
          <input name="dateTo" type="date" defaultValue={sp.dateTo ?? today}
            className="px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'hsl(var(--border))' }} />
        </div>
        <select name="status" defaultValue={sp.status ?? 'all'}
          className="px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: 'hsl(var(--border))' }}>
          <option value="all">Semua Status</option>
          <option value="completed">Selesai</option>
          <option value="cancelled">Dibatalkan</option>
        </select>
        <button type="submit"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: 'hsl(var(--primary))' }}>
          Cari
        </button>
        <Link href="/dashboard/sales"
          className="px-4 py-2 rounded-lg text-sm border"
          style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-muted))' }}>
          Reset
        </Link>
      </form>

      {sales.length === 0 ? (
        <EmptyState
          icon="🧾"
          title="Belum ada transaksi"
          description="Transaksi akan muncul di sini setelah ada penjualan"
        />
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'hsl(var(--surface-raised))' }}>
                  {(['Invoice', 'Waktu', 'Pelanggan', 'Kasir', ...(isOwner ? ['Total'] : []), 'Pembayaran', 'Status', 'Aksi'] as string[]).map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold"
                      style={{ color: 'hsl(var(--text-muted))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => {
                  const ss = statusStyle[sale.status] ?? {
                    label: sale.status,
                    bg: 'hsl(210,10%,93%)',
                    text: 'hsl(210,10%,40%)',
                  }
                  return (
                    <tr key={sale.id} className="border-t hover:bg-gray-50/50 transition-colors"
                      style={{ borderColor: 'hsl(var(--border))' }}>
                      <td className="px-4 py-3 text-xs font-mono font-medium"
                        style={{ color: 'hsl(var(--text-secondary))' }}>{sale.invoice_number}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap"
                        style={{ color: 'hsl(var(--text-muted))' }}>{formatDateTime(sale.created_at)}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>
                        {sale.customer_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
                        {sale.profiles?.full_name ?? '—'}
                      </td>
                      {isOwner && (
                        <td className="px-4 py-3 text-sm font-semibold"
                          style={{ color: 'hsl(var(--primary))' }}>{formatCurrency(sale.total)}</td>
                      )}
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
                        {paymentLabels[sale.payment_method ?? ''] ?? sale.payment_method ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: ss.bg, color: ss.text }}>
                          {ss.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/sales/${sale.id}`}
                          className="text-xs px-2 py-1 rounded-md hover:bg-gray-100"
                          style={{ color: 'hsl(var(--info))' }}>
                          Detail
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t text-xs flex justify-between"
            style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-muted))' }}>
            <span>{sales.length} transaksi ditampilkan</span>
            {isOwner && (
              <span className="font-medium" style={{ color: 'hsl(var(--primary))' }}>
                Total: {formatCurrency(totalRevenue)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
