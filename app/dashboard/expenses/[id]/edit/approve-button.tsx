'use client'

import { approveExpense } from '@/actions/expenses'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CheckCircle } from 'lucide-react'

export function ApproveButton({ expenseId }: { expenseId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleApprove = async () => {
    setLoading(true)
    const formData = new FormData()
    const result = await approveExpense(expenseId, null as never, formData)
    setLoading(false)
    if (result && !('error' in result)) {
      router.refresh()
    }
  }

  return (
    <button
      onClick={handleApprove}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
    >
      <CheckCircle size={16} />
      {loading ? 'Memproses...' : 'Setujui Pengeluaran'}
    </button>
  )
}
