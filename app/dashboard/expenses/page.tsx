import Link from 'next/link'
import { getExpenses } from '@/actions/expenses'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { formatCurrency, formatDate } from '@/lib/utils'
import { EXPENSE_CATEGORIES } from '@/lib/constants'
import { Plus } from 'lucide-react'

export default async function ExpensesPage() {
  const expenses = await getExpenses()

  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const byCat = EXPENSE_CATEGORIES.map((c) => ({
    ...c,
    total: expenses.filter((e) => e.category === c.value).reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.total > 0)

  return (
    <div className="p-6">
      <PageHeader
        title="Pengeluaran"
        description="Catat dan pantau semua pengeluaran operasional"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Pengeluaran' }]}
        action={
          <Link
            href="/dashboard/expenses/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'hsl(var(--primary))' }}
          >
            <Plus size={16} /> Tambah Pengeluaran
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4 col-span-2 lg:col-span-1" style={{ borderColor: 'hsl(var(--border))' }}>
          <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-muted))' }}>Total Pengeluaran</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'hsl(0, 70%, 48%)' }}>{formatCurrency(total)}</p>
        </div>
        {byCat.slice(0, 3).map((c) => (
          <div key={c.value} className="bg-white rounded-xl border p-4" style={{ borderColor: 'hsl(var(--border))' }}>
            <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-muted))' }}>{c.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: 'hsl(var(--foreground))' }}>{formatCurrency(c.total)}</p>
          </div>
        ))}
      </div>

      {expenses.length === 0 ? (
        <EmptyState icon="💸" title="Belum ada pengeluaran" actionLabel="Tambah Pengeluaran" actionHref="/dashboard/expenses/new" />
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: 'hsl(var(--surface-raised))' }}>
                {['Tanggal', 'Kategori', 'Deskripsi', 'Jumlah', 'Dicatat Oleh', 'Aksi'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-muted))' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => {
                const cat = EXPENSE_CATEGORIES.find((c) => c.value === exp.category)
                return (
                  <tr key={exp.id} className="border-t hover:bg-gray-50/50" style={{ borderColor: 'hsl(var(--border))' }}>
                    <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-muted))' }}>{formatDate(exp.expense_date)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'hsl(var(--border))', color: 'hsl(var(--text-secondary))' }}>
                        {cat?.label ?? exp.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'hsl(var(--foreground))' }}>{exp.description}</td>
                    <td className="px-4 py-3 text-sm font-semibold" style={{ color: 'hsl(0, 70%, 48%)' }}>{formatCurrency(exp.amount)}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-muted))' }}>{exp.profiles?.full_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/expenses/${exp.id}/edit`}
                        className="text-xs px-2 py-1 rounded-md hover:bg-gray-100" style={{ color: 'hsl(var(--primary))' }}>
                        Edit
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t text-xs flex justify-between" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-muted))' }}>
            <span>{expenses.length} pengeluaran</span>
            <span className="font-medium" style={{ color: 'hsl(0, 70%, 48%)' }}>Total: {formatCurrency(total)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
