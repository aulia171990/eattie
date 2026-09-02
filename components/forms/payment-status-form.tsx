'use client'

import { useActionState } from 'react'

type ActionState = { error?: string; success?: boolean } | null

interface PaymentStatusFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>
  currentStatus: string
}

const OPTIONS = [
  {
    value: 'unpaid',
    label: 'Belum Bayar',
    activeStyle: { background: 'hsl(var(--danger-bg))', color: 'hsl(var(--danger))', borderColor: 'hsl(var(--danger))' },
  },
  {
    value: 'partial',
    label: 'Sebagian',
    activeStyle: { background: 'hsl(var(--primary-subtle))', color: 'hsl(var(--primary-hover))', borderColor: 'hsl(var(--primary-hover))' },
  },
  {
    value: 'paid',
    label: 'Lunas',
    activeStyle: { background: 'hsl(var(--success-bg))', color: 'hsl(var(--success))', borderColor: 'hsl(var(--success))' },
  },
]

const inactiveStyle = {
  background: 'white',
  color: 'hsl(var(--text-muted))',
  borderColor: 'hsl(var(--border))',
}

export function PaymentStatusForm({ action, currentStatus }: PaymentStatusFormProps) {
  const [state, formAction, isPending] = useActionState(action, null)

  return (
    <div
      className="bg-white rounded-xl border p-5 mb-4"
      style={{ borderColor: 'hsl(var(--border))' }}
    >
      <p className="text-xs font-semibold mb-3" style={{ color: 'hsl(var(--text-muted))' }}>
        STATUS PEMBAYARAN
      </p>

      {state?.error && (
        <div className="mb-3 p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="mb-3 p-3 rounded-lg text-sm bg-green-50 text-green-700 border border-green-200">
          Status pembayaran berhasil diperbarui.
        </div>
      )}

      <form action={formAction} className="flex flex-wrap gap-2 items-center">
        {OPTIONS.map((opt) => {
          const isActive = currentStatus === opt.value
          return (
            <button
              key={opt.value}
              type="submit"
              name="payment_status"
              value={opt.value}
              disabled={isPending || isActive}
              className="px-4 py-2 rounded-full text-xs font-semibold border-2 transition-all disabled:cursor-default"
              style={isActive ? opt.activeStyle : inactiveStyle}
            >
              {isActive ? `✓ ${opt.label}` : opt.label}
            </button>
          )
        })}
        {isPending && (
          <span className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
            Menyimpan...
          </span>
        )}
      </form>
    </div>
  )
}
