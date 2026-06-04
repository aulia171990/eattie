import { getExpense, updateExpense } from '@/actions/expenses'
import { ExpenseForm } from '@/components/forms/expense-form'
import { PageHeader } from '@/components/shared/page-header'
import { notFound } from 'next/navigation'

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let expense
  try {
    expense = await getExpense(id)
  } catch {
    notFound()
  }

  const boundAction = updateExpense.bind(null, id)

  return (
    <div className="p-6">
      <PageHeader
        title="Edit Pengeluaran"
        breadcrumbs={[
          { label: 'Pengeluaran', href: '/dashboard/expenses' },
          { label: 'Edit' },
        ]}
      />
      <ExpenseForm action={boundAction} expense={expense} cancelHref="/dashboard/expenses" />
    </div>
  )
}
