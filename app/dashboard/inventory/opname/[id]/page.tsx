import { getOpname, submitOpname } from '@/actions/stock-opname'
import { PageHeader } from '@/components/shared/page-header'
import { OpnameForm } from '@/components/forms/opname-form'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatDate } from '@/lib/utils'
import { notFound } from 'next/navigation'
import type { StockOpnameItemWithIngredient } from '@/types'

export default async function OpnameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let opname
  try {
    opname = await getOpname(id)
  } catch {
    notFound()
  }

  const items = opname.stock_opname_items as StockOpnameItemWithIngredient[]
  const boundAction = submitOpname.bind(null, id)
  const canEdit = opname.status === 'in_progress' || opname.status === 'draft'

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader
        title={opname.opname_number}
        description={`Tanggal: ${formatDate(opname.opname_date)}`}
        breadcrumbs={[
          { label: 'Inventory', href: '/dashboard/inventory' },
          { label: 'Opname', href: '/dashboard/inventory/opname' },
          { label: opname.opname_number },
        ]}
        action={<StatusBadge status={opname.status} type="purchase" />}
      />

      {canEdit ? (
        <OpnameForm
          action={boundAction}
          items={items}
          cancelHref="/dashboard/inventory/opname"
        />
      ) : (
        <div
          className="bg-white rounded-xl border overflow-hidden"
          style={{ borderColor: 'hsl(var(--border))' }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ background: 'hsl(var(--surface-raised))' }}>
                {['Bahan', 'Stok Sistem', 'Stok Aktual', 'Selisih', 'Alasan'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold"
                    style={{ color: 'hsl(var(--text-muted))' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-t"
                  style={{ borderColor: 'hsl(var(--border))' }}
                >
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                    {item.ingredients?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'hsl(var(--text-muted))' }}>
                    {item.system_stock} {item.unit}
                  </td>
                  <td className="px-4 py-3 text-sm">{item.actual_stock ?? '—'}</td>
                  <td
                    className="px-4 py-3 text-sm font-medium"
                    style={{
                      color:
                        item.difference == null || item.difference === 0
                          ? 'hsl(var(--success))'
                          : item.difference > 0
                          ? 'hsl(var(--info))'
                          : 'hsl(var(--danger))',
                    }}
                  >
                    {item.difference != null
                      ? item.difference > 0
                        ? `+${item.difference}`
                        : item.difference
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
                    {item.reason ?? '—'}
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
