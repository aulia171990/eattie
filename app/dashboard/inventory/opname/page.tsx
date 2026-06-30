import Link from 'next/link'
import { getOpnames } from '@/actions/stock-opname'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatDate } from '@/lib/utils'
import { Plus } from 'lucide-react'

export default async function OpnamePage() {
  const opnames = await getOpnames()

  return (
    <div className="p-6">
      <PageHeader
        title="Stock Opname"
        description="Audit dan rekonsiliasi stok fisik vs sistem"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory', href: '/dashboard/inventory' },
          { label: 'Stock Opname' },
        ]}
        action={
          <Link
            href="/dashboard/inventory/opname/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'hsl(var(--primary))' }}
          >
            <Plus size={16} /> Buat Opname
          </Link>
        }
      />

      {opnames.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="Belum ada stock opname"
          description="Buat sesi opname untuk mengaudit stok fisik"
          actionLabel="Buat Opname Pertama"
          actionHref="/dashboard/inventory/opname/new"
        />
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: 'hsl(var(--surface-raised))' }}>
                {['No. Opname', 'Tanggal', 'Status', 'Dibuat Oleh', 'Selesai', 'Aksi'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-muted))' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {opnames.map((op) => (
                <tr key={op.id} className="border-t hover:bg-gray-50/50" style={{ borderColor: 'hsl(var(--border))' }}>
                  <td className="px-4 py-3 text-xs font-mono font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>
                    {op.opname_number}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'hsl(var(--foreground))' }}>
                    {formatDate(op.opname_date)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={op.status} type="purchase" />
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'hsl(var(--text-muted))' }}>
                    {op.profiles?.full_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
                    {op.completed_at ? formatDate(op.completed_at) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/inventory/opname/${op.id}`}
                      className="text-xs px-2 py-1 rounded-md hover:bg-gray-100"
                      style={{ color: 'hsl(var(--info))' }}
                    >
                      {op.status === 'draft' || op.status === 'in_progress' ? 'Lanjutkan' : 'Detail'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
