'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import type { Supplier } from '@/types'
import type { ServerAction } from '@/types/forms'
import { getError } from '@/types/forms'
import { formatCurrency } from '@/lib/utils'
import { BASE_UNITS } from '@/lib/constants'
import { Plus, Trash2 } from 'lucide-react'

interface IngredientOption {
  id: string
  name: string
  base_unit: string
  price_per_unit: number
  code: string | null
}

interface PurchaseItem {
  ingredient_id: string
  quantity_ordered: number
  unit: string
  unit_price: number
  discount_percent: number
  expiry_date: string
  batch_code: string
}

interface PurchaseFormProps {
  action: ServerAction
  suppliers: Supplier[]
  ingredients: IngredientOption[]
  cancelHref: string
}

export function PurchaseForm({
  action,
  suppliers,
  ingredients,
  cancelHref,
}: PurchaseFormProps) {
  const [state, formAction, isPending] = useActionState(action, null)
  const error = getError(state)

  const [items, setItems] = useState<PurchaseItem[]>([])
  const today = new Date().toISOString().split('T')[0]

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { ingredient_id: '', quantity_ordered: 1, unit: 'kg', unit_price: 0, discount_percent: 0, expiry_date: '', batch_code: '' },
    ])

  const removeItem = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i))

  const updateItem = (
    i: number,
    field: keyof PurchaseItem,
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== i) return item
        const updated = { ...item, [field]: value }
        if (field === 'ingredient_id') {
          const ing = ingredients.find((x) => x.id === value)
          if (ing) {
            updated.unit = ing.base_unit
            updated.unit_price = ing.price_per_unit
          }
        }
        return updated
      })
    )
  }

  const subtotal = items.reduce((sum, item) => {
    const disc = 1 - (item.discount_percent ?? 0) / 100
    return sum + item.quantity_ordered * item.unit_price * disc
  }, 0)

  const handleSubmit = (fd: FormData) => {
    fd.set('items_json', JSON.stringify(items))
    formAction(fd)
  }

  return (
    <form action={handleSubmit} className="space-y-6 max-w-4xl">
      {error && (
        <div className="p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {/* PO Header */}
      <div className="bg-white rounded-xl border p-6 space-y-4" style={{ borderColor: 'hsl(var(--border))' }}>
        <h2 className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>Informasi PO</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--text-secondary))' }}>Supplier</label>
            <select name="supplier_id" className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={{ borderColor: 'hsl(var(--border))' }}>
              <option value="">-- Pilih Supplier --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--text-secondary))' }}>Tanggal PO*</label>
            <input name="purchase_date" type="date" defaultValue={today} required
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={{ borderColor: 'hsl(var(--border))' }} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--text-secondary))' }}>Jatuh Tempo</label>
            <input name="payment_due_date" type="date"
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={{ borderColor: 'hsl(var(--border))' }} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--text-secondary))' }}>No. Faktur Supplier</label>
            <input name="invoice_number" placeholder="INV-xxxx"
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={{ borderColor: 'hsl(var(--border))' }} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--text-secondary))' }}>Status</label>
            <select name="status" defaultValue="ordered" className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={{ borderColor: 'hsl(var(--border))' }}>
              <option value="draft">Draft</option>
              <option value="ordered">Dipesan</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--text-secondary))' }}>Catatan</label>
            <input name="notes" className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={{ borderColor: 'hsl(var(--border))' }} />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>
            Item Pembelian ({items.length})
          </h2>
          <button type="button" onClick={addItem}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'hsl(32, 80%, 93%)', color: 'hsl(var(--primary-hover))' }}>
            <Plus size={13} /> Tambah Item
          </button>
        </div>

        {items.length === 0 ? (
          <div className="py-8 text-center rounded-lg border-2 border-dashed" style={{ borderColor: 'hsl(var(--border))' }}>
            <p className="text-sm" style={{ color: 'hsl(var(--text-muted))' }}>Klik &quot;Tambah Item&quot; untuk menambahkan bahan</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, i) => {
              const disc = 1 - (item.discount_percent ?? 0) / 100
              const lineTotal = item.quantity_ordered * item.unit_price * disc
              return (
                <div key={i} className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg" style={{ background: 'hsl(var(--surface-raised))' }}>
                  <div className="col-span-4">
                    <select value={item.ingredient_id} onChange={(e) => updateItem(i, 'ingredient_id', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border text-xs outline-none" style={{ borderColor: 'hsl(var(--border))' }}>
                      <option value="">-- Pilih --</option>
                      {ingredients.map((x) => (
                        <option key={x.id} value={x.id}>{x.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input type="number" value={item.quantity_ordered} min="0" step="0.001"
                      onChange={(e) => updateItem(i, 'quantity_ordered', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 rounded-lg border text-xs outline-none" style={{ borderColor: 'hsl(var(--border))' }} />
                  </div>
                  <div className="col-span-1">
                    <select value={item.unit} onChange={(e) => updateItem(i, 'unit', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border text-xs outline-none" style={{ borderColor: 'hsl(var(--border))' }}>
                      {BASE_UNITS.map((u) => (
                        <option key={u.value} value={u.value}>{u.value}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input type="number" value={item.unit_price} min="0"
                      onChange={(e) => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 rounded-lg border text-xs outline-none" style={{ borderColor: 'hsl(var(--border))' }} />
                  </div>
                  <div className="col-span-1">
                    <input type="number" value={item.discount_percent} min="0" max="100"
                      onChange={(e) => updateItem(i, 'discount_percent', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 rounded-lg border text-xs outline-none" style={{ borderColor: 'hsl(var(--border))' }} />
                  </div>
                  <div className="col-span-1 text-xs font-medium text-right" style={{ color: 'hsl(var(--primary))' }}>
                    {formatCurrency(lineTotal)}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button type="button" onClick={() => removeItem(i)}
                      className="p-1.5 rounded hover:bg-red-50" style={{ color: 'hsl(var(--danger))' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {items.length > 0 && (
          <div className="mt-4 pt-4 border-t space-y-1" style={{ borderColor: 'hsl(var(--border))' }}>
            <div className="flex justify-between text-sm font-bold">
              <span style={{ color: 'hsl(var(--foreground))' }}>Total</span>
              <span style={{ color: 'hsl(var(--primary))' }}>{formatCurrency(subtotal)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={isPending}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60"
          style={{ background: 'hsl(var(--primary))' }}>
          {isPending ? 'Menyimpan...' : 'Buat Purchase Order'}
        </button>
        <Link href={cancelHref}
          className="px-6 py-2.5 rounded-lg text-sm font-medium border"
          style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-secondary))' }}>
          Batal
        </Link>
      </div>
    </form>
  )
}
