'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import type { StockPurchaseItemWithIngredient } from '@/types'
import type { ServerAction } from '@/types/forms'
import { getError } from '@/types/forms'

interface ReceiveStockFormProps {
  action: ServerAction
  items: StockPurchaseItemWithIngredient[]
  cancelHref: string
}

export function ReceiveStockForm({ action, items, cancelHref }: ReceiveStockFormProps) {
  const [state, formAction, isPending] = useActionState(action, null)
  const error = getError(state)

  const [received, setReceived] = useState<Record<string, number>>(
    Object.fromEntries(items.map((i) => [i.id, i.quantity_ordered]))
  )
  const [expiry, setExpiry] = useState<Record<string, string>>({})

  const handleSubmit = (fd: FormData) => {
    const receivedItems = items.map((item) => ({
      item_id: item.id,
      ingredient_id: item.ingredient_id,
      quantity_received: received[item.id] ?? 0,
      unit: item.unit,
      unit_price: item.unit_price,
      expiry_date: expiry[item.id] ?? undefined,
    }))
    fd.set('received_json', JSON.stringify(receivedItems))
    formAction(fd)
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      <div
        className="bg-white rounded-xl border p-5"
        style={{ borderColor: 'hsl(var(--border))' }}
      >
        <h2 className="font-semibold text-sm mb-4" style={{ color: 'hsl(var(--foreground))' }}>
          Input Jumlah Diterima
        </h2>
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-lg"
              style={{ background: 'hsl(var(--surface-raised))' }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                  {item.ingredients?.name ?? '—'}
                </span>
                <span className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
                  Dipesan: {item.quantity_ordered} {item.unit}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="text-xs font-medium block mb-1"
                    style={{ color: 'hsl(var(--text-secondary))' }}
                  >
                    Jumlah Diterima*
                  </label>
                  <input
                    type="number"
                    value={received[item.id] ?? 0}
                    min="0"
                    step="0.001"
                    onChange={(e) =>
                      setReceived((prev) => ({
                        ...prev,
                        [item.id]: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ borderColor: 'hsl(var(--border))' }}
                  />
                </div>
                <div>
                  <label
                    className="text-xs font-medium block mb-1"
                    style={{ color: 'hsl(var(--text-secondary))' }}
                  >
                    Tgl Kadaluarsa
                  </label>
                  <input
                    type="date"
                    value={expiry[item.id] ?? ''}
                    onChange={(e) =>
                      setExpiry((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ borderColor: 'hsl(var(--border))' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className="p-4 rounded-xl text-sm"
        style={{ background: 'hsl(var(--primary-subtle))', color: 'hsl(var(--primary))' }}
      >
        ⚠️ Setelah menyimpan, stok akan diperbarui otomatis dan PO ditandai Diterima.
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60"
          style={{ background: 'hsl(var(--success))' }}
        >
          {isPending ? 'Memproses...' : '✓ Konfirmasi Penerimaan Stok'}
        </button>
        <Link
          href={cancelHref}
          className="px-6 py-2.5 rounded-lg text-sm font-medium border"
          style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-secondary))' }}
        >
          Batal
        </Link>
      </div>
    </form>
  )
}
