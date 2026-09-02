'use client'

import { useTransition } from 'react'
import { approveExpense, rejectExpense } from '@/actions/expenses'

export function ExpenseApprovalButtons({ expenseId, status }: { expenseId: string; status: string }) {
  const [pending, startTransition] = useTransition()

  if (status !== 'pending') return null

  function handleApprove() {
    startTransition(async () => {
      const fd = new FormData()
      await approveExpense(expenseId, null as never, fd)
      window.location.reload()
    })
  }

  function handleReject() {
    const reason = prompt('Alasan penolakan:')
    if (reason === null) return
    startTransition(async () => {
      const fd = new FormData()
      await rejectExpense(expenseId, reason || '', null as never, fd)
      window.location.reload()
    })
  }

  return (
    <div className="flex gap-1">
      <button onClick={handleApprove} disabled={pending}
        className="text-xs px-2 py-1 rounded-md hover:bg-green-50 disabled:opacity-50"
        style={{ color: 'hsl(var(--success))' }}>
        {pending ? '...' : 'Setujui'}
      </button>
      <button onClick={handleReject} disabled={pending}
        className="text-xs px-2 py-1 rounded-md hover:bg-red-50 disabled:opacity-50"
        style={{ color: 'hsl(var(--danger))' }}>
        {pending ? '...' : 'Tolak'}
      </button>
    </div>
  )
}
