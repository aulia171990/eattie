'use client'

import { useActionState } from 'react'
import type { OrderWithItems } from '@/actions/orders'
import type { ActionState } from '@/types'

interface OrderActionButtonsProps {
  order: OrderWithItems
  actions: {
    found: boolean
    can_confirm_payment: boolean
    can_cancel: boolean
    valid_next_statuses: string[]
  } | null
  confirmAction: (prev: ActionState, fd: FormData) => Promise<ActionState>
  cancelAction:  (prev: ActionState, fd: FormData) => Promise<ActionState>
  updateStatusAction: (prev: ActionState, fd: FormData) => Promise<ActionState>
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  IN_PRODUCTION:    { label: 'Mulai Produksi',      color: 'hsl(var(--tier-platinum))' },
  READY_FOR_PICKUP: { label: 'Tandai Siap Diambil', color: 'hsl(var(--success))' },
  COMPLETED:        { label: 'Selesai / Terambil',  color: 'hsl(var(--success))' },
}

export function OrderActionButtons({
  order,
  actions,
  confirmAction,
  cancelAction,
  updateStatusAction,
}: OrderActionButtonsProps) {
  const [confirmState, confirmDispatch, confirmPending] = useActionState(confirmAction, null)
  const [cancelState,  cancelDispatch,  cancelPending]  = useActionState(cancelAction, null)
  const [updateState,  updateDispatch,  updatePending]  = useActionState(updateStatusAction, null)

  const anyPending = confirmPending || cancelPending || updatePending
  const error = (confirmState as { error?: string } | null)?.error
    ?? (cancelState as { error?: string } | null)?.error
    ?? (updateState as { error?: string } | null)?.error

  // Derive UI flags from server-provided actions
  const canConfirmPayment = actions?.can_confirm_payment === true
  const canCancel = actions?.can_cancel === true
  const nextStatuses = actions?.valid_next_statuses ?? []

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>
      )}

      <div className="flex flex-col gap-2">
        {/* Confirm payment + convert to sale */}
        {canConfirmPayment && (
          <form action={confirmDispatch}>
            <button
              type="submit"
              disabled={anyPending}
              className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60"
              style={{ background: 'hsl(var(--success))' }}
              onClick={e => {
                if (!confirm('Konfirmasi pembayaran order ini?\nOrder akan masuk ke Penjualan dan tidak bisa dibatalkan.')) {
                  e.preventDefault()
                }
              }}
            >
              {confirmPending ? 'Memproses...' : '✓ Konfirmasi Pembayaran & Buat Sale'}
            </button>
          </form>
        )}

        {/* Advance status — rendered from server-provided valid_next_statuses */}
        {nextStatuses.map(status => {
          const cfg = STATUS_LABELS[status]
          if (!cfg) return null
          return (
            <form key={status} action={updateDispatch}>
              <input type="hidden" name="status" value={status} />
              <button
                type="submit"
                disabled={anyPending}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: cfg.color }}
                onClick={e => {
                  if (!confirm(`${cfg.label}?\nStatus order akan diubah.`)) {
                    e.preventDefault()
                  }
                }}
              >
                {updatePending ? 'Menyimpan...' : cfg.label}
              </button>
            </form>
          )
        })}

        {/* Cancel */}
        {canCancel && (
          <form action={cancelDispatch}>
            <button
              type="submit"
              disabled={anyPending}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: 'hsl(var(--danger))' }}
              onClick={e => {
                if (!confirm('Batalkan order ini?\nAksi ini tidak bisa dibatalkan.')) {
                  e.preventDefault()
                }
              }}
            >
              {cancelPending ? 'Memproses...' : '✕ Batalkan Order'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

interface MarkPaidButtonProps {
  markPaidAction: (prev: ActionState, fd: FormData) => Promise<ActionState>
}

export function MarkPaidButton({ markPaidAction }: MarkPaidButtonProps) {
  const [state, dispatch, pending] = useActionState(markPaidAction, null)
  const error = (state as { error?: string } | null)?.error

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>
      )}
      <form action={dispatch}>
        <button
          type="submit"
          disabled={pending}
          className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60"
          style={{ background: 'hsl(var(--success))' }}
          onClick={e => {
            if (!confirm('Tandai order ini sudah dibayar?')) {
              e.preventDefault()
            }
          }}
        >
          {pending ? 'Memproses...' : '✓ Tandai Sudah Bayar'}
        </button>
      </form>
    </div>
  )
}
