'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import type { Expense } from '@/types'
import type { ServerAction } from '@/types/forms'
import { getError } from '@/types/forms'
import { EXPENSE_CATEGORIES } from '@/lib/constants'

interface ExpenseFormProps {
  action: ServerAction
  expense?: Expense
  cancelHref: string
}

export function ExpenseForm({ action, expense, cancelHref }: ExpenseFormProps) {
  const [state, formAction, isPending] = useActionState(action, null)
  const error = getError(state)
  const today = new Date().toISOString().split('T')[0]

  return (
    <form action={formAction} className="max-w-lg space-y-6">
      {error && (
        <div className="p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border p-6 space-y-4" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(25, 30%, 25%)' }}>Kategori*</label>
          <select name="category" defaultValue={expense?.category ?? ''} required
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={{ borderColor: 'hsl(36, 20%, 85%)' }}>
            <option value="">-- Pilih Kategori --</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(25, 30%, 25%)' }}>Deskripsi*</label>
          <input name="description" defaultValue={expense?.description ?? ''} required
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={{ borderColor: 'hsl(36, 20%, 85%)' }} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(25, 30%, 25%)' }}>Jumlah (Rp)*</label>
            <input name="amount" type="number" min="0" defaultValue={expense?.amount ?? ''} required
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={{ borderColor: 'hsl(36, 20%, 85%)' }} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(25, 30%, 25%)' }}>Tanggal*</label>
            <input name="expense_date" type="date" defaultValue={expense?.expense_date ?? today} required
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={{ borderColor: 'hsl(36, 20%, 85%)' }} />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={isPending}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60"
          style={{ background: 'hsl(32, 95%, 44%)' }}>
          {isPending ? 'Menyimpan...' : expense ? 'Simpan Perubahan' : 'Tambah Pengeluaran'}
        </button>
        <Link href={cancelHref}
          className="px-6 py-2.5 rounded-lg text-sm font-medium border"
          style={{ borderColor: 'hsl(36, 20%, 85%)', color: 'hsl(25, 30%, 30%)' }}>
          Batal
        </Link>
      </div>
    </form>
  )
}
