'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, X } from 'lucide-react'

interface VariantOption {
  id: string
  name: string
}

interface DuplicateRecipeButtonProps {
  sourceRecipeId: string
  sourceProductName: string
  availableVariants: VariantOption[]
}

export function DuplicateRecipeButton({
  sourceRecipeId,
  sourceProductName,
  availableVariants,
}: DuplicateRecipeButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedVariantId, setSelectedVariantId] = useState('')

  // No unused variant slots → fall back to the manual duplicate form
  if (availableVariants.length === 0) {
    return (
      <a
        href={`/dashboard/recipes/new?duplicate=${sourceRecipeId}`}
        className="text-xs px-2 py-1 rounded-md hover:bg-gray-100 inline-flex items-center gap-1"
        style={{ color: 'hsl(var(--text-secondary))' }}
      >
        <Copy size={12} /> Duplikat
      </a>
    )
  }

  const handleContinue = () => {
    if (!selectedVariantId) return
    router.push(
      `/dashboard/recipes/new?duplicate=${sourceRecipeId}&variant=${selectedVariantId}`
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSelectedVariantId('')
          setOpen(true)
        }}
        className="text-xs px-2 py-1 rounded-md hover:bg-gray-100 inline-flex items-center gap-1"
        style={{ color: 'hsl(var(--text-secondary))' }}
      >
        <Copy size={12} /> Duplikat
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-xl border w-full max-w-md p-6"
            style={{ borderColor: 'hsl(var(--border))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>
                Duplikat Resep
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-md hover:bg-gray-100"
                style={{ color: 'hsl(var(--text-muted))' }}
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs mb-4" style={{ color: 'hsl(var(--text-muted))' }}>
              Menyalin resep <strong>{sourceProductName}</strong>. Pilih varian
              target yang belum punya resep, lalu bahan akan terisi otomatis dan
              bisa disesuaikan.
            </p>

            <label
              className="text-xs font-medium block mb-1"
              style={{ color: 'hsl(var(--text-secondary))' }}
            >
              Varian Target*
            </label>
            <select
              value={selectedVariantId}
              onChange={(e) => setSelectedVariantId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none mb-5"
              style={{ borderColor: 'hsl(var(--border))' }}
            >
              <option value="">-- Pilih Varian --</option>
              {availableVariants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium border"
                style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-secondary))' }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleContinue}
                disabled={!selectedVariantId}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ background: 'hsl(var(--primary))' }}
              >
                Lanjut
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
