'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import type { Ingredient, IngredientCategory, Supplier } from '@/types'
import type { ServerAction } from '@/types/forms'
import { getError } from '@/types/forms'
import { BASE_UNITS } from '@/lib/constants'

interface IngredientFormProps {
  action: ServerAction
  ingredient?: Ingredient & {
    ingredient_categories?: IngredientCategory | null
    suppliers?: Supplier | null
  }
  categories: IngredientCategory[]
  suppliers: Supplier[]
  cancelHref: string
}

export function IngredientForm({
  action,
  ingredient,
  categories,
  suppliers,
  cancelHref,
}: IngredientFormProps) {
  const [state, formAction, isPending] = useActionState(action, null)
  const error = getError(state)

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {error && (
        <div className="p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border p-6 space-y-4" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
        <h2 className="font-semibold text-sm" style={{ color: 'hsl(25, 30%, 15%)' }}>Informasi Dasar</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nama Bahan (Indonesia)*" name="name" defaultValue={ingredient?.name} required />
          <Field label="Nama (English)" name="name_en" defaultValue={ingredient?.name_en ?? ''} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(25, 30%, 25%)' }}>Kategori</label>
            <select name="category_id" defaultValue={ingredient?.category_id ?? ''}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={{ borderColor: 'hsl(36, 20%, 85%)' }}>
              <option value="">-- Pilih Kategori --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <Field label="Kode Bahan" name="code" defaultValue={ingredient?.code ?? ''} placeholder="Auto jika kosong" />
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-4" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
        <h2 className="font-semibold text-sm" style={{ color: 'hsl(25, 30%, 15%)' }}>Satuan & Stok</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(25, 30%, 25%)' }}>Satuan Dasar*</label>
            <select name="base_unit" defaultValue={ingredient?.base_unit ?? 'kg'} required
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={{ borderColor: 'hsl(36, 20%, 85%)' }}>
              {BASE_UNITS.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>
          <Field label="Satuan Beli" name="purchase_unit" defaultValue={ingredient?.purchase_unit ?? ''} placeholder="karung, dus..." />
          <Field label="Konversi (1 sat.beli = ?)" name="conversion_rate" type="number"
            defaultValue={String(ingredient?.conversion_rate ?? 1)} min="0" step="0.001" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label="Stok Saat Ini" name="current_stock" type="number"
            defaultValue={String(ingredient?.current_stock ?? 0)} min="0" step="0.001" />
          <Field label="Stok Minimum" name="min_stock" type="number"
            defaultValue={String(ingredient?.min_stock ?? 0)} min="0" step="0.001" />
          <Field label="Stok Maksimum" name="max_stock" type="number"
            defaultValue={ingredient?.max_stock != null ? String(ingredient.max_stock) : ''} min="0" step="0.001" />
          <Field label="Reorder Point" name="reorder_point" type="number"
            defaultValue={ingredient?.reorder_point != null ? String(ingredient.reorder_point) : ''} min="0" step="0.001" />
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-4" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
        <h2 className="font-semibold text-sm" style={{ color: 'hsl(25, 30%, 15%)' }}>Harga & Supplier</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Harga per Satuan (Rp)" name="price_per_unit" type="number"
            defaultValue={String(ingredient?.price_per_unit ?? 0)} min="0" />
          <Field label="Masa Simpan (hari)" name="shelf_life_days" type="number"
            defaultValue={ingredient?.shelf_life_days != null ? String(ingredient.shelf_life_days) : ''} min="0" />
        </div>
        <Field label="Lokasi Penyimpanan" name="storage_location"
          defaultValue={ingredient?.storage_location ?? ''} placeholder="Gudang A, Rak 1..." />
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(25, 30%, 25%)' }}>Supplier Utama</label>
          <select name="preferred_supplier_id" defaultValue={ingredient?.preferred_supplier_id ?? ''}
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={{ borderColor: 'hsl(36, 20%, 85%)' }}>
            <option value="">-- Pilih Supplier --</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={isPending}
          className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60"
          style={{ background: 'hsl(32, 95%, 44%)' }}>
          {isPending ? 'Menyimpan...' : ingredient ? 'Simpan Perubahan' : 'Tambah Bahan'}
        </button>
        <Link href={cancelHref}
          className="px-6 py-2.5 rounded-lg text-sm font-medium border"
          style={{ borderColor: 'hsl(36, 20%, 85%)', color: 'hsl(25, 30%, 30%)' }}>
          Batal
        </Link>
      </div>
    </form>
  )
}

function Field({
  label, name, defaultValue, type = 'text', required, placeholder, min, step,
}: {
  label: string
  name: string
  defaultValue?: string
  type?: string
  required?: boolean
  placeholder?: string
  min?: string
  step?: string
}) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(25, 30%, 25%)' }}>
        {label}
      </label>
      <input
        name={name}
        defaultValue={defaultValue}
        type={type}
        required={required}
        placeholder={placeholder}
        min={min}
        step={step}
        className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
        style={{ borderColor: 'hsl(36, 20%, 85%)', color: 'hsl(25, 30%, 15%)' }}
      />
    </div>
  )
}
