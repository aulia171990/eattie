'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import type { Product } from '@/types'
import type { ServerAction } from '@/types/forms'
import { getError } from '@/types/forms'
import { PRODUCT_CATEGORIES } from '@/lib/constants'

interface ProductFormProps {
  action: ServerAction
  product?: Product
  cancelHref: string
}

export function ProductForm({ action, product, cancelHref }: ProductFormProps) {
  const [state, formAction, isPending] = useActionState(action, null)
  const error = getError(state)

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      {error && (
        <div className="p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border p-6 space-y-4" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
        <h2 className="font-semibold text-sm" style={{ color: 'hsl(25, 30%, 15%)' }}>Informasi Produk</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(25, 30%, 25%)' }}>
              Nama Produk (Indonesia)*
            </label>
            <input name="name" defaultValue={product?.name} required
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'hsl(36, 20%, 85%)' }} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(25, 30%, 25%)' }}>
              Nama (English)
            </label>
            <input name="name_en" defaultValue={product?.name_en ?? ''}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'hsl(36, 20%, 85%)' }} />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(25, 30%, 25%)' }}>Kategori</label>
          <select name="category" defaultValue={product?.category ?? ''}
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'hsl(36, 20%, 85%)' }}>
            <option value="">-- Pilih Kategori --</option>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(25, 30%, 25%)' }}>Deskripsi</label>
          <textarea name="description" defaultValue={product?.description ?? ''} rows={3}
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
            style={{ borderColor: 'hsl(36, 20%, 85%)' }} />
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-4" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
        <h2 className="font-semibold text-sm" style={{ color: 'hsl(25, 30%, 15%)' }}>Harga</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(25, 30%, 25%)' }}>
              Harga Jual (Rp)*
            </label>
            <input name="selling_price" type="number" min="0"
              defaultValue={product?.selling_price ?? ''} required
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'hsl(36, 20%, 85%)' }} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(25, 30%, 25%)' }}>
              HPP (Rp) — auto dari resep
            </label>
            <input name="cost_price" type="number" min="0"
              defaultValue={product?.cost_price ?? 0}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'hsl(36, 20%, 85%)' }} />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={isPending}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60"
          style={{ background: 'hsl(32, 95%, 44%)' }}>
          {isPending ? 'Menyimpan...' : product ? 'Simpan Perubahan' : 'Tambah Produk'}
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
