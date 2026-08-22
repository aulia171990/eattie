'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import type { Product } from '@/types'
import type { ProductVariant } from '@/types/product-config'
import type { ServerAction } from '@/types/forms'
import { getError } from '@/types/forms'

interface ProductionFormProps {
  action: ServerAction
  products: Product[]
  variants: ProductVariant[]
  cancelHref: string
}

export function ProductionForm({ action, products, variants, cancelHref }: ProductionFormProps) {
  const [state, formAction, isPending] = useActionState(action, null)
  const error = getError(state)
  const today = new Date().toISOString().split('T')[0]

  const [selectedProductId, setSelectedProductId] = useState('')
  const productVariants = selectedProductId
    ? variants.filter((v) => v.product_id === selectedProductId)
    : []
  const hasVariants = productVariants.length > 0

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      {error && (
        <div className="p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border p-6 space-y-4" style={{ borderColor: 'hsl(var(--border))' }}>
        <h2 className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>
          Detail Batch Produksi
        </h2>

        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--text-secondary))' }}>
            Produk*
          </label>
          <select name="product_id" required
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'hsl(var(--border))' }}>
            <option value="">-- Pilih Produk --</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {hasVariants && (
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--text-secondary))' }}>
              Varian (opsional)
            </label>
            <select name="variant_id"
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'hsl(var(--border))' }}>
              <option value="">-- Semua Varian (Resep Produk) --</option>
              {productVariants.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-muted))' }}>
              Kosongkan untuk pakai resep generik produk.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--text-secondary))' }}>
              Jumlah Target (pcs)*
            </label>
            <input name="quantity_planned" type="number" min="1" required
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'hsl(var(--border))' }} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--text-secondary))' }}>
              Tanggal Produksi
            </label>
            <input name="scheduled_date" type="date" defaultValue={today}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'hsl(var(--border))' }} />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--text-secondary))' }}>
            Catatan
          </label>
          <textarea name="notes" rows={3}
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
            style={{ borderColor: 'hsl(var(--border))' }} />
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={isPending}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60"
          style={{ background: 'hsl(var(--primary))' }}>
          {isPending ? 'Membuat...' : 'Buat Batch'}
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
