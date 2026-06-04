'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import type { StockOpnameItemWithIngredient } from '@/types'
import type { ServerAction } from '@/types/forms'
import { getError } from '@/types/forms'

interface OpnameFormProps {
  action: ServerAction
  items: StockOpnameItemWithIngredient[]
  cancelHref: string
}

export function OpnameForm({ action, items, cancelHref }: OpnameFormProps) {
  const [state, formAction, isPending] = useActionState(action, null)
  const error = getError(state)

  const [actuals, setActuals] = useState<Record<string, number>>(
    Object.fromEntries(
      items.map((i) => [i.id, i.actual_stock ?? i.system_stock])
    )
  )
  const [reasons, setReasons] = useState<Record<string, string>>({})

  const handleSubmit = (fd: FormData) => {
    const data = items.map((item) => ({
      item_id: item.id,
      ingredient_id: item.ingredient_id,
      actual_stock: actuals[item.id] ?? item.system_stock,
      reason: reasons[item.id],
    }))
    fd.set('actuals_json', JSON.stringify(data))
    formAction(fd)
  }

  const diffItems = items.filter(
    (i) => (actuals[i.id] ?? i.system_stock) !== i.system_stock
  )

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {diffItems.length > 0 && (
        <div
          className="p-3 rounded-lg text-sm"
          style={{ background: 'hsl(36, 80%, 93%)', color: 'hsl(32, 95%, 35%)' }}
        >
          ⚠️ {diffItems.length} item memiliki selisih stok
        </div>
      )}

      <div
        className="bg-white rounded-xl border overflow-hidden"
        style={{ borderColor: 'hsl(36, 20%, 88%)' }}
      >
        <div
          className="grid grid-cols-12 gap-3 px-4 py-3 border-b text-xs font-semibold"
          style={{
            background: 'hsl(36, 20%, 97%)',
            borderColor: 'hsl(36, 20%, 92%)',
            color: 'hsl(25, 15%, 45%)',
          }}
        >
          <div className="col-span-4">Bahan</div>
          <div className="col-span-2">Sistem</div>
          <div className="col-span-2">Aktual*</div>
          <div className="col-span-2">Selisih</div>
          <div className="col-span-2">Alasan</div>
        </div>

        <div className="divide-y" style={{ borderColor: 'hsl(36, 20%, 94%)' }}>
          {items.map((item) => {
            const actual = actuals[item.id] ?? item.system_stock
            const diff = actual - item.system_stock
            return (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-3 items-center px-4 py-2.5"
                style={{
                  background:
                    diff !== 0
                      ? diff > 0
                        ? 'hsl(210, 70%, 97%)'
                        : 'hsl(0, 70%, 97%)'
                      : 'transparent',
                }}
              >
                <div className="col-span-4 text-sm font-medium" style={{ color: 'hsl(25, 30%, 15%)' }}>
                  {item.ingredients?.name ?? '—'}
                </div>
                <div className="col-span-2 text-sm" style={{ color: 'hsl(25, 15%, 50%)' }}>
                  {item.system_stock} {item.unit}
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={actual}
                    min="0"
                    step="0.001"
                    onChange={(e) =>
                      setActuals((prev) => ({
                        ...prev,
                        [item.id]: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-2 py-1.5 rounded-lg border text-xs outline-none"
                    style={{
                      borderColor:
                        diff !== 0
                          ? diff > 0
                            ? 'hsl(210, 70%, 70%)'
                            : 'hsl(0, 70%, 70%)'
                          : 'hsl(36, 20%, 85%)',
                    }}
                  />
                </div>
                <div
                  className="col-span-2 text-xs font-semibold"
                  style={{
                    color:
                      diff === 0
                        ? 'hsl(142, 60%, 35%)'
                        : diff > 0
                        ? 'hsl(210, 70%, 40%)'
                        : 'hsl(0, 70%, 45%)',
                  }}
                >
                  {diff === 0 ? '✓ OK' : diff > 0 ? `+${diff}` : diff}
                </div>
                <div className="col-span-2">
                  {diff !== 0 && (
                    <input
                      type="text"
                      placeholder="Alasan..."
                      value={reasons[item.id] ?? ''}
                      onChange={(e) =>
                        setReasons((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      className="w-full px-2 py-1.5 rounded-lg border text-xs outline-none"
                      style={{ borderColor: 'hsl(36, 20%, 85%)' }}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60"
          style={{ background: 'hsl(142, 60%, 40%)' }}
        >
          {isPending ? 'Menyimpan...' : '✓ Selesaikan Opname & Update Stok'}
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
