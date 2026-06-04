'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import type { Product, RecipeWithRelations } from '@/types'
import type { ServerAction } from '@/types/forms'
import { getError } from '@/types/forms'
import { BASE_UNITS } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { Plus, Trash2 } from 'lucide-react'

interface IngredientOption {
  id: string
  name: string
  base_unit: string
  price_per_unit: number
}

interface RecipeIngredientRow {
  ingredient_id: string
  quantity: number
  unit: string
  notes: string
}

interface RecipeFormProps {
  action: ServerAction
  products: Product[]
  ingredients: IngredientOption[]
  recipe?: RecipeWithRelations
  cancelHref: string
}

export function RecipeForm({
  action,
  products,
  ingredients,
  recipe,
  cancelHref,
}: RecipeFormProps) {
  const [state, formAction, isPending] = useActionState(action, null)
  const error = getError(state)

  const [items, setItems] = useState<RecipeIngredientRow[]>(
    recipe?.recipe_ingredients?.map((ri) => ({
      ingredient_id: ri.ingredient_id,
      quantity: ri.quantity,
      unit: ri.unit,
      notes: ri.notes ?? '',
    })) ?? []
  )

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { ingredient_id: '', quantity: 0, unit: 'kg', notes: '' },
    ])

  const removeItem = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i))

  const updateItem = (
    i: number,
    field: keyof RecipeIngredientRow,
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== i) return item
        const updated = { ...item, [field]: value }
        if (field === 'ingredient_id') {
          const ing = ingredients.find((x) => x.id === value)
          if (ing) updated.unit = ing.base_unit
        }
        return updated
      })
    )
  }

  const totalCost = items.reduce((sum, item) => {
    const ing = ingredients.find((x) => x.id === item.ingredient_id)
    return sum + item.quantity * (ing?.price_per_unit ?? 0)
  }, 0)

  const handleSubmit = (fd: FormData) => {
    fd.set('ingredients_json', JSON.stringify(items))
    if (recipe?.id) fd.set('recipe_id', recipe.id)
    formAction(fd)
  }

  return (
    <form action={handleSubmit} className="space-y-6 max-w-3xl">
      {error && (
        <div className="p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      <div
        className="bg-white rounded-xl border p-6 space-y-4"
        style={{ borderColor: 'hsl(36, 20%, 88%)' }}
      >
        <h2 className="font-semibold text-sm" style={{ color: 'hsl(25, 30%, 15%)' }}>
          Informasi Resep
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              className="text-xs font-medium block mb-1"
              style={{ color: 'hsl(25, 30%, 25%)' }}
            >
              Produk*
            </label>
            <select
              name="product_id"
              defaultValue={recipe?.product_id ?? ''}
              required
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'hsl(36, 20%, 85%)' }}
            >
              <option value="">-- Pilih Produk --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label
              className="text-xs font-medium block mb-1"
              style={{ color: 'hsl(25, 30%, 25%)' }}
            >
              Hasil (yield) per batch
            </label>
            <input
              name="yield_quantity"
              type="number"
              defaultValue={recipe?.yield_quantity ?? 1}
              min="1"
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'hsl(36, 20%, 85%)' }}
            />
          </div>
          <div>
            <label
              className="text-xs font-medium block mb-1"
              style={{ color: 'hsl(25, 30%, 25%)' }}
            >
              Waktu Persiapan (menit)
            </label>
            <input
              name="prep_time_minutes"
              type="number"
              defaultValue={recipe?.prep_time_minutes ?? ''}
              min="0"
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'hsl(36, 20%, 85%)' }}
            />
          </div>
          <div>
            <label
              className="text-xs font-medium block mb-1"
              style={{ color: 'hsl(25, 30%, 25%)' }}
            >
              Waktu Panggang (menit)
            </label>
            <input
              name="bake_time_minutes"
              type="number"
              defaultValue={recipe?.bake_time_minutes ?? ''}
              min="0"
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'hsl(36, 20%, 85%)' }}
            />
          </div>
          <div>
            <label
              className="text-xs font-medium block mb-1"
              style={{ color: 'hsl(25, 30%, 25%)' }}
            >
              Suhu Panggang (°C)
            </label>
            <input
              name="bake_temperature"
              type="number"
              defaultValue={recipe?.bake_temperature ?? ''}
              min="0"
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'hsl(36, 20%, 85%)' }}
            />
          </div>
        </div>
        <div>
          <label
            className="text-xs font-medium block mb-1"
            style={{ color: 'hsl(25, 30%, 25%)' }}
          >
            Instruksi
          </label>
          <textarea
            name="instructions"
            defaultValue={recipe?.instructions ?? ''}
            rows={4}
            placeholder="Tulis langkah-langkah pembuatan..."
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
            style={{ borderColor: 'hsl(36, 20%, 85%)' }}
          />
        </div>
      </div>

      <div
        className="bg-white rounded-xl border p-6"
        style={{ borderColor: 'hsl(36, 20%, 88%)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm" style={{ color: 'hsl(25, 30%, 15%)' }}>
            Bahan-Bahan ({items.length})
          </h2>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'hsl(32, 80%, 93%)', color: 'hsl(32, 95%, 38%)' }}
          >
            <Plus size={13} /> Tambah Bahan
          </button>
        </div>

        {items.length === 0 ? (
          <div
            className="py-8 text-center rounded-lg border-2 border-dashed"
            style={{ borderColor: 'hsl(36, 20%, 85%)' }}
          >
            <p className="text-sm" style={{ color: 'hsl(25, 15%, 55%)' }}>
              Klik &quot;Tambah Bahan&quot; untuk mulai.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, i) => {
              const ing = ingredients.find((x) => x.id === item.ingredient_id)
              const cost = item.quantity * (ing?.price_per_unit ?? 0)
              return (
                <div
                  key={i}
                  className="flex gap-3 items-start p-3 rounded-lg"
                  style={{ background: 'hsl(36, 20%, 97%)' }}
                >
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={item.ingredient_id}
                      onChange={(e) => updateItem(i, 'ingredient_id', e.target.value)}
                      className="px-3 py-2 rounded-lg border text-sm outline-none"
                      style={{ borderColor: 'hsl(36, 20%, 85%)' }}
                    >
                      <option value="">-- Pilih Bahan --</option>
                      {ingredients.map((x) => (
                        <option key={x.id} value={x.id}>{x.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={item.quantity}
                      min="0"
                      step="0.001"
                      placeholder="Jumlah"
                      onChange={(e) =>
                        updateItem(i, 'quantity', parseFloat(e.target.value) || 0)
                      }
                      className="px-3 py-2 rounded-lg border text-sm outline-none"
                      style={{ borderColor: 'hsl(36, 20%, 85%)' }}
                    />
                    <div className="flex gap-2">
                      <select
                        value={item.unit}
                        onChange={(e) => updateItem(i, 'unit', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none"
                        style={{ borderColor: 'hsl(36, 20%, 85%)' }}
                      >
                        {BASE_UNITS.map((u) => (
                          <option key={u.value} value={u.value}>{u.value}</option>
                        ))}
                      </select>
                      {cost > 0 && (
                        <span
                          className="flex items-center text-xs px-2 whitespace-nowrap"
                          style={{ color: 'hsl(32, 95%, 40%)' }}
                        >
                          {formatCurrency(cost)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="p-2 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                    style={{ color: 'hsl(0, 70%, 50%)' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {items.length > 0 && (
          <div
            className="mt-4 pt-4 border-t flex justify-between"
            style={{ borderColor: 'hsl(36, 20%, 92%)' }}
          >
            <span className="text-sm font-medium" style={{ color: 'hsl(25, 30%, 20%)' }}>
              Total Biaya Bahan
            </span>
            <span className="text-sm font-bold" style={{ color: 'hsl(32, 95%, 40%)' }}>
              {formatCurrency(totalCost)}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60"
          style={{ background: 'hsl(32, 95%, 44%)' }}
        >
          {isPending ? 'Menyimpan...' : recipe ? 'Simpan Resep' : 'Buat Resep'}
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
