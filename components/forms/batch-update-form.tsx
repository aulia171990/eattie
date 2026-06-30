'use client'

import { useActionState } from 'react'
import type { ServerAction } from '@/types/forms'
import { getError, isSuccess } from '@/types/forms'

interface BatchUpdateFormProps {
  action: ServerAction
  currentStatus: string
  currentProduced: number
}

export function BatchUpdateForm({
  action,
  currentStatus,
  currentProduced,
}: BatchUpdateFormProps) {
  const [state, formAction, isPending] = useActionState(action, null)
  const error = getError(state)
  const success = isSuccess(state)

  const nextStatus =
    currentStatus === 'planned'
      ? 'in_progress'
      : currentStatus === 'in_progress'
      ? 'completed'
      : null

  const nextLabel =
    currentStatus === 'planned' ? '▶ Mulai Produksi' : '✓ Selesaikan Produksi'

  const handleCancel = (fd: FormData) => {
    fd.set('status', 'cancelled')
    formAction(fd)
  }

  return (
    <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'hsl(var(--border))' }}>
      <h2 className="font-semibold text-sm mb-4" style={{ color: 'hsl(var(--foreground))' }}>
        Update Status Produksi
      </h2>

      {error && (
        <div className="mb-3 p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 p-3 rounded-lg text-sm bg-green-50 text-green-700 border border-green-200">
          Status berhasil diperbarui!
        </div>
      )}

      <form action={formAction} className="space-y-4">
        {currentStatus === 'in_progress' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--text-secondary))' }}>
                Jumlah Berhasil (pcs)
              </label>
              <input
                name="quantity_produced"
                type="number"
                min="0"
                defaultValue={currentProduced}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ borderColor: 'hsl(var(--border))' }}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--text-secondary))' }}>
                Defect / Reject (pcs)
              </label>
              <input
                name="quantity_defect"
                type="number"
                min="0"
                defaultValue={0}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ borderColor: 'hsl(var(--border))' }}
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--text-secondary))' }}>
            Catatan
          </label>
          <textarea
            name="notes"
            rows={2}
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
            style={{ borderColor: 'hsl(var(--border))' }}
          />
        </div>

        <div className="flex gap-3">
          {nextStatus && (
            <>
              <input type="hidden" name="status" value={nextStatus} />
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                style={{
                  background:
                    nextStatus === 'completed'
                      ? 'hsl(var(--success))'
                      : 'hsl(var(--primary))',
                }}
              >
                {isPending ? 'Memperbarui...' : nextLabel}
              </button>
            </>
          )}
          <button
            type="button"
            disabled={isPending}
            onClick={(e) => {
              const form = (e.currentTarget as HTMLButtonElement)
                .closest('form') as HTMLFormElement
              const fd = new FormData(form)
              handleCancel(fd)
            }}
            className="px-4 py-2.5 rounded-lg text-sm font-medium border disabled:opacity-60"
            style={{ borderColor: 'hsl(0, 70%, 80%)', color: 'hsl(var(--danger))' }}
          >
            Batalkan
          </button>
        </div>
      </form>
    </div>
  )
}
