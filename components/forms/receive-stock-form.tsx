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
        style={{ borderColor: 'hsl(36, 20%, 88%)' }}
      >
        <h2 className="font-semibold text-sm mb-4" style={{ color: 'hsl(25, 30%, 15%)' }}>
          Input Jumlah Diterima
        </h2>
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-lg"
              style={{ background: 'hsl(36, 20%, 97%)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium" style={{ color: 'hsl(25, 30%, 15%)' }}>
                  {item.ingredients?.name ?? '—'}
                </span>
                <span className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>
                  Dipesan: {item.quantity_ordered} {item.unit}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="text-xs font-medium block mb-1"
                    style={{ color: 'hsl(25, 30%, 25%)' }}
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
                    style={{ borderColor: 'hsl(36, 20%, 85%)' }}
                  />
                </div>
                <div>
                  <label
                    className="text-xs font-medium block mb-1"
                    style={{ color: 'hsl(25, 30%, 25%)' }}
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
                    style={{ borderColor: 'hsl(36, 20%, 85%)' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className="p-4 rounded-xl text-sm"
        style={{ background: 'hsl(36, 80%, 93%)', color: 'hsl(32, 95%, 35%)' }}
      >
        ⚠️ Setelah menyimpan, stok akan diperbarui otomatis dan PO ditandai Diterima.
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60"
          style={{ background: 'hsl(142, 60%, 40%)' }}
        >
          {isPending ? 'Memproses...' : '✓ Konfirmasi Penerimaan Stok'}
        </button>
        <Link
          href={cancelHref}
          className="px-6 py-2.5 rounded-lg text-sm font-medium border"
          style={{ borderColor: 'hsl(36, 20%, 85%)', color: 'hsl(25, 30%, 30%)' }}
        >
          Batal
        </Link>
      </div>
    </form>
  )
}
