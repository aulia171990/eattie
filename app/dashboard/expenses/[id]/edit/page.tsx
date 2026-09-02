import { getExpense, updateExpense } from '@/actions/expenses'
import { ExpenseForm } from '@/components/forms/expense-form'
import { PageHeader } from '@/components/shared/page-header'
import { notFound } from 'next/navigation'
import { ApproveButton } from './approve-button'
import type { Tables } from '@/types/database'

type ExpenseWithStatus = Tables<'expenses'> & { status: string | null }

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let expense: ExpenseWithStatus
  try {
    expense = await getExpense(id) as ExpenseWithStatus
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
      {expense.status === 'pending' && (
        <div className="mb-4">
          <ApproveButton expenseId={id} />
        </div>
      )}
      <ExpenseForm action={boundAction} expense={expense} cancelHref="/dashboard/expenses" />
    </div>
  )
}
