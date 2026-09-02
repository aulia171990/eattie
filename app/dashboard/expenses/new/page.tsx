import { createExpense } from '@/actions/expenses'
import { ExpenseForm } from '@/components/forms/expense-form'
import { PageHeader } from '@/components/shared/page-header'

export default function NewExpensePage() {
  return (
    <div className="p-6">
      <PageHeader title="Tambah Pengeluaran" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Pengeluaran', href: '/dashboard/expenses' }, { label: 'Tambah' }]} />
      <ExpenseForm action={createExpense} cancelHref="/dashboard/expenses" />
    </div>
  )
}
