import { getStockMovements } from '@/actions/ingredients'
import { PageHeader } from '@/components/shared/page-header'
import { formatNumber, formatDateTime } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

const typeLabels: Record<string, string> = {
  purchase_in: 'Pembelian Masuk',
  production_out: 'Produksi Keluar',
  adjustment_in: 'Penyesuaian Tambah',
  adjustment_out: 'Penyesuaian Kurang',
  waste: 'Terbuang/Kadaluarsa',
  transfer_in: 'Transfer Masuk',
  transfer_out: 'Transfer Keluar',
  return_out: 'Retur Supplier',
}

export default async function MovementsPage() {
  const movements = await getStockMovements(undefined, 100)

  return (
    <div className="p-6">
      <PageHeader
        title="Pergerakan Stok"
        description="Riwayat semua pergerakan stok bahan baku"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory', href: '/dashboard/inventory' },
          { label: 'Pergerakan Stok' },
        ]}
      />

      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
        {movements.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: 'hsl(25, 15%, 55%)' }}>
            Belum ada pergerakan stok
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'hsl(36, 20%, 97%)' }}>
                  {['Tanggal', 'Bahan', 'Tipe', 'Jumlah', 'Stok Sebelum', 'Stok Sesudah', 'Alasan', 'Oleh'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold"
                      style={{ color: 'hsl(25, 15%, 45%)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movements.map((mv) => {
                  const isIn = mv.quantity > 0
                  return (
                    <tr key={mv.id} className="border-t hover:bg-gray-50/50"
                      style={{ borderColor: 'hsl(36, 20%, 94%)' }}>
                      <td className="px-4 py-3 text-xs whitespace-nowrap"
                        style={{ color: 'hsl(25, 15%, 50%)' }}>
                        {formatDateTime(mv.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium"
                        style={{ color: 'hsl(25, 30%, 15%)' }}>
                        {mv.ingredients?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-xs"
                          style={{ color: isIn ? 'hsl(142, 60%, 35%)' : 'hsl(0, 70%, 45%)' }}>
                          {isIn ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {typeLabels[mv.movement_type] ?? mv.movement_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold"
                        style={{ color: isIn ? 'hsl(142, 60%, 35%)' : 'hsl(0, 70%, 45%)' }}>
                        {isIn ? '+' : ''}{formatNumber(mv.quantity, 2)} {mv.unit}
                      </td>
                      <td className="px-4 py-3 text-xs"
                        style={{ color: 'hsl(25, 15%, 50%)' }}>
                        {formatNumber(mv.stock_before, 2)}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium"
                        style={{ color: 'hsl(25, 30%, 15%)' }}>
                        {formatNumber(mv.stock_after, 2)}
                      </td>
                      <td className="px-4 py-3 text-xs max-w-32 truncate"
                        style={{ color: 'hsl(25, 15%, 50%)' }}>
                        {mv.reason ?? mv.notes ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs"
                        style={{ color: 'hsl(25, 15%, 50%)' }}>
                        {mv.profiles?.full_name ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
