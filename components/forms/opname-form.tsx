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
          style={{ background: 'hsl(var(--primary-subtle))', color: 'hsl(var(--primary))' }}
        >
          ⚠️ {diffItems.length} item memiliki selisih stok
        </div>
      )}

      <div
        className="bg-white rounded-xl border overflow-hidden"
        style={{ borderColor: 'hsl(var(--border))' }}
      >
        <div
          className="grid grid-cols-12 gap-3 px-4 py-3 border-b text-xs font-semibold"
          style={{
            background: 'hsl(var(--surface-raised))',
            borderColor: 'hsl(var(--border))',
            color: 'hsl(var(--text-muted))',
          }}
        >
          <div className="col-span-4">Bahan</div>
          <div className="col-span-2">Sistem</div>
          <div className="col-span-2">Aktual*</div>
          <div className="col-span-2">Selisih</div>
          <div className="col-span-2">Alasan</div>
        </div>

        <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
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
                <div className="col-span-4 text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                  {item.ingredients?.name ?? '—'}
                </div>
                <div className="col-span-2 text-sm" style={{ color: 'hsl(var(--text-muted))' }}>
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
                          : 'hsl(var(--border))',
                    }}
                  />
                </div>
                <div
                  className="col-span-2 text-xs font-semibold"
                  style={{
                    color:
                      diff === 0
                        ? 'hsl(var(--success))'
                        : diff > 0
                        ? 'hsl(var(--info))'
                        : 'hsl(var(--danger))',
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
                      style={{ borderColor: 'hsl(var(--border))' }}
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
          style={{ background: 'hsl(var(--success))' }}
        >
          {isPending ? 'Menyimpan...' : '✓ Selesaikan Opname & Update Stok'}
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
