import Link from 'next/link'
import { getPurchases } from '@/actions/stock-purchases'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus } from 'lucide-react'

export default async function PurchasesPage() {
  const purchases = await getPurchases()

  const total = purchases.reduce((s, p) => s + p.total_amount, 0)
  const pending = purchases.filter((p) => p.status === 'ordered').length

  return (
    <div className="p-6">
      <PageHeader
        title="Pembelian Stok"
        description="Catat dan kelola pembelian bahan baku"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory', href: '/dashboard/inventory' },
          { label: 'Pembelian' },
        ]}
        action={
          <Link
            href="/dashboard/inventory/purchases/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'hsl(32, 95%, 44%)' }}
          >
            <Plus size={16} /> Buat PO
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total PO', value: purchases.length },
          { label: 'Belum Diterima', value: pending },
          { label: 'Total Nilai', value: formatCurrency(total) },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border p-4" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
            <p className="text-xs" style={{ color: 'hsl(25, 15%, 50%)' }}>{s.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: 'hsl(25, 30%, 12%)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {purchases.length === 0 ? (
        <EmptyState
          icon="📋"
          title="Belum ada pembelian"
          actionLabel="Buat PO Pertama"
          actionHref="/dashboard/inventory/purchases/new"
        />
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'hsl(36, 20%, 97%)' }}>
                  {['No. PO', 'Supplier', 'Tanggal', 'Total', 'Pembayaran', 'Status', 'Aksi'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'hsl(25, 15%, 45%)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {purchases.map((po) => (
                  <tr key={po.id} className="border-t hover:bg-gray-50/50" style={{ borderColor: 'hsl(36, 20%, 94%)' }}>
                    <td className="px-4 py-3 text-xs font-mono font-medium" style={{ color: 'hsl(25, 30%, 20%)' }}>
                      {po.purchase_number}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'hsl(25, 30%, 15%)' }}>
                      {po.suppliers?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'hsl(25, 15%, 50%)' }}>
                      {formatDate(po.purchase_date)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: 'hsl(25, 30%, 15%)' }}>
                      {formatCurrency(po.total_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={po.payment_status} type="payment" />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={po.status} type="purchase" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          href={`/dashboard/inventory/purchases/${po.id}`}
                          className="text-xs px-2 py-1 rounded-md hover:bg-gray-100"
                          style={{ color: 'hsl(210, 70%, 45%)' }}
                        >
                          Detail
                        </Link>
                        {po.status === 'ordered' && (
                          <Link
                            href={`/dashboard/inventory/purchases/${po.id}/receive`}
                            className="text-xs px-2 py-1 rounded-md hover:bg-green-50"
                            style={{ color: 'hsl(142, 60%, 35%)' }}
                          >
                            Terima
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
