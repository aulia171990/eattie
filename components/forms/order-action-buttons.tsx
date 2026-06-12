'use client'

import { useActionState } from 'react'
import type { OrderWithItems } from '@/actions/orders'
import type { ActionState } from '@/types'

interface OrderActionButtonsProps {
  order: OrderWithItems
  confirmAction: (prev: ActionState, fd: FormData) => Promise<ActionState>
  cancelAction:  (prev: ActionState, fd: FormData) => Promise<ActionState>
  updateStatusAction: (prev: ActionState, fd: FormData) => Promise<ActionState>
}

const NEXT_STATUS: Record<string, { value: string; label: string; color: string }> = {
  NEW:             { value: 'IN_PRODUCTION',   label: 'Mulai Produksi',      color: 'hsl(270,50%,45%)' },
  PAID:            { value: 'IN_PRODUCTION',   label: 'Mulai Produksi',      color: 'hsl(270,50%,45%)' },
  IN_PRODUCTION:   { value: 'READY_FOR_PICKUP',label: 'Tandai Siap Diambil', color: 'hsl(142,60%,40%)' },
  READY_FOR_PICKUP:{ value: 'COMPLETED',       label: 'Selesai / Terambil',  color: 'hsl(142,60%,35%)' },
}

export function OrderActionButtons({
  order,
  confirmAction,
  cancelAction,
  updateStatusAction,
}: OrderActionButtonsProps) {
  const [confirmState, confirmDispatch, confirmPending] = useActionState(confirmAction, null)
  const [cancelState,  cancelDispatch,  cancelPending]  = useActionState(cancelAction, null)
  const [updateState,  updateDispatch,  updatePending]  = useActionState(updateStatusAction, null)

  const next = NEXT_STATUS[order.status]
  const anyPending = confirmPending || cancelPending || updatePending
  const error = (confirmState as { error?: string } | null)?.error
    ?? (cancelState as { error?: string } | null)?.error
    ?? (updateState as { error?: string } | null)?.error

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>
      )}

      <div className="flex flex-col gap-2">
        {/* Confirm payment + convert to sale */}
        {!['PAID','paid'].includes(order.payment_status) && !['CANCELLED','cancelled'].includes(order.status) && (
          <form action={confirmDispatch}>
            <button
              type="submit"
              disabled={anyPending}
              className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60"
              style={{ background: 'hsl(142, 60%, 40%)' }}
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

        {/* Advance status */}
        {next && (
          <form action={updateDispatch}>
            <input type="hidden" name="status" value={next.value} />
            <button
              type="submit"
              disabled={anyPending}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: next.color }}
              onClick={e => {
                if (!confirm(`${next.label}?\nStatus order akan diubah.`)) {
                  e.preventDefault()
                }
              }}
            >
              {updatePending ? 'Menyimpan...' : next.label}
            </button>
          </form>
        )}

        {/* Cancel */}
        <form action={cancelDispatch}>
          <button
            type="submit"
            disabled={anyPending}
            className="w-full py-2.5 rounded-xl text-sm font-medium border disabled:opacity-60"
            style={{ borderColor: 'hsl(0, 70%, 80%)', color: 'hsl(0, 70%, 45%)' }}
            onClick={e => {
              if (!confirm('Batalkan pesanan ini?\nTindakan ini tidak dapat dibatalkan.')) e.preventDefault()
            }}
          >
            Batalkan Order
          </button>
        </form>
      </div>
    </div>
  )
}
