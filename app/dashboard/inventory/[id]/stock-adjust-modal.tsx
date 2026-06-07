'use client'

import { useState, useTransition } from 'react'
import { adjustStock } from '@/actions/ingredients'
import { SubmitButton } from '@/components/shared/form-fields'
import { SlidersHorizontal, X } from 'lucide-react'

interface Props {
  ingredientId: string
  ingredientName: string
  unit: string
}

export function StockAdjustmentModal({ ingredientId, ingredientName, unit }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string>()
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(undefined)
    const formData = new FormData(e.currentTarget)
    formData.set('ingredient_id', ingredientId)

    startTransition(async () => {
      const result = await adjustStock(null, formData)
      if (result && 'error' in result) {
        setError(result.error)
      } else {
        setOpen(false)
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors"
        style={{ background: 'hsl(32, 95%, 44%)' }}
      >
        <SlidersHorizontal size={15} />
        Sesuaikan Stok
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-semibold" style={{ color: 'hsl(25, 30%, 12%)' }}>Penyesuaian Stok</h2>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(25, 15%, 55%)' }}>{ingredientName}</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg text-sm text-red-700 bg-red-50 border border-red-200">{error}</div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium block" style={{ color: 'hsl(25, 30%, 25%)' }}>
                  Tipe Penyesuaian <span className="text-red-500">*</span>
                </label>
                <select name="movement_type" required
                  className="w-full px-3 py-2 rounded-lg border text-sm bg-white outline-none focus:border-amber-500"
                  style={{ borderColor: 'hsl(36, 20%, 85%)' }}>
                  <option value="adjustment_in">Tambah Stok (Penyesuaian +)</option>
                  <option value="adjustment_out">Kurang Stok (Penyesuaian -)</option>
                  <option value="waste">Terbuang / Kadaluarsa</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium block" style={{ color: 'hsl(25, 30%, 25%)' }}>
                  Jumlah ({unit}) <span className="text-red-500">*</span>
                </label>
                <input type="number" name="quantity" min="0.001" step="0.001" required
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-amber-500"
                  style={{ borderColor: 'hsl(36, 20%, 85%)' }} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium block" style={{ color: 'hsl(25, 30%, 25%)' }}>
                  Alasan <span className="text-red-500">*</span>
                </label>
                <input type="text" name="reason" required placeholder="Contoh: Stok opname, barang rusak..."
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-amber-500"
                  style={{ borderColor: 'hsl(36, 20%, 85%)' }} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium block" style={{ color: 'hsl(25, 30%, 25%)' }}>Catatan</label>
                <textarea name="notes" rows={2} placeholder="Opsional..."
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none focus:border-amber-500"
                  style={{ borderColor: 'hsl(36, 20%, 85%)' }} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50"
                  style={{ borderColor: 'hsl(36, 20%, 85%)', color: 'hsl(25, 30%, 30%)' }}>
                  Batal
                </button>
                <SubmitButton loading={isPending} className="flex-1 justify-center">
                  Simpan
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
