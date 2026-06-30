'use client'

import { useActionState, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Product } from '@/types'
import type { ServerAction } from '@/types/forms'
import { getError } from '@/types/forms'
import { PRODUCT_CATEGORIES } from '@/lib/constants'
import { ImagePlus, X, Upload } from 'lucide-react'

interface ProductFormProps {
  action: ServerAction
  product?: Product
  cancelHref: string
}

export function ProductForm({ action, product, cancelHref }: ProductFormProps) {
  const [state, formAction, isPending] = useActionState(action, null)
  const error = getError(state)

  const [preview, setPreview] = useState<string | null>(product?.image_url ?? null)
  const [uploading, setUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string>(product?.image_url ?? '')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview lokal langsung
    setPreview(URL.createObjectURL(file))
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload-product-image', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (json.url) {
        setImageUrl(json.url)
      } else {
        alert('Gagal upload gambar: ' + (json.error ?? 'Unknown error'))
        setPreview(product?.image_url ?? null)
      }
    } catch {
      alert('Gagal upload gambar')
      setPreview(product?.image_url ?? null)
    } finally {
      setUploading(false)
    }
  }

  function clearImage() {
    setPreview(null)
    setImageUrl('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      {error && (
        <div className="p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {/* Hidden field untuk image_url hasil upload */}
      <input type="hidden" name="image_url" value={imageUrl} />

      {/* Image Upload */}
      <div className="bg-white rounded-xl border p-6 space-y-4" style={{ borderColor: 'hsl(var(--border))' }}>
        <h2 className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>Foto Produk</h2>

        <div className="flex items-start gap-4">
          {/* Preview area */}
          <div
            className="relative w-28 h-28 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden shrink-0 cursor-pointer"
            style={{ borderColor: preview ? 'transparent' : 'hsl(var(--border))', background: preview ? 'transparent' : 'hsl(var(--text-muted))' }}
            onClick={() => !uploading && fileRef.current?.click()}
          >
            {preview ? (
              <>
                <Image src={preview} alt="Preview" fill className="object-cover rounded-xl" unoptimized />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); clearImage() }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center z-10 hover:bg-red-600"
                >
                  <X size={10} />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <ImagePlus size={22} style={{ color: 'hsl(var(--text-muted))' }} />
                <span className="text-xs text-center" style={{ color: 'hsl(var(--text-muted))' }}>Klik upload</span>
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl">
                <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'hsl(var(--primary))' }} />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all hover:bg-gray-50 disabled:opacity-50"
              style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-secondary))' }}
            >
              <Upload size={14} />
              {uploading ? 'Mengupload...' : 'Pilih Foto'}
            </button>
            <p className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
              JPG, PNG, WEBP. Maks 2MB.<br />
              Foto akan tampil di POS dan katalog pelanggan.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-4" style={{ borderColor: 'hsl(var(--border))' }}>
        <h2 className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>Informasi Produk</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--text-secondary))' }}>
              Nama Produk (Indonesia)*
            </label>
            <input name="name" defaultValue={product?.name} required
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'hsl(var(--border))' }} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--text-secondary))' }}>
              Nama (English)
            </label>
            <input name="name_en" defaultValue={product?.name_en ?? ''}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'hsl(var(--border))' }} />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--text-secondary))' }}>Kategori</label>
          <select name="category" defaultValue={product?.category ?? ''}
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'hsl(var(--border))' }}>
            <option value="">-- Pilih Kategori --</option>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--text-secondary))' }}>Deskripsi</label>
          <textarea name="description" defaultValue={product?.description ?? ''} rows={3}
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
            style={{ borderColor: 'hsl(var(--border))' }} />
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-4" style={{ borderColor: 'hsl(var(--border))' }}>
        <h2 className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>Harga</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--text-secondary))' }}>
              Harga Jual (Rp)*
            </label>
            <input name="selling_price" type="number" min="0"
              defaultValue={product?.selling_price ?? ''} required
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'hsl(var(--border))' }} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--text-secondary))' }}>
              HPP (Rp) — auto dari resep
            </label>
            <input name="cost_price" type="number" min="0"
              defaultValue={product?.cost_price ?? 0}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'hsl(var(--border))' }} />
          </div>
        </div>
      </div>

      {/* Portal Online */}
      <div className="bg-white rounded-xl border p-6 space-y-4" style={{ borderColor: 'hsl(var(--border))' }}>
        <h2 className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>Portal Online</h2>

        <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'hsl(var(--success-bg))' }}>
          <div>
            <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>Tersedia di Toko Online</p>
            <p className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>Tampil di eattie.vercel.app/store</p>
          </div>
          <input type="checkbox" name="is_available_online"
            defaultChecked={(product as (Product & { is_available_online?: boolean }) | undefined)?.is_available_online ?? false}
            className="w-4 h-4" style={{ accentColor: 'hsl(var(--success))' }} />
        </div>

        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--text-secondary))' }}>
            Deskripsi untuk Customer (opsional)
          </label>
          <textarea name="online_description" rows={2}
            defaultValue={(product as (Product & { online_description?: string }) | undefined)?.online_description ?? ''}
            placeholder="Deskripsi singkat untuk toko online..."
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
            style={{ borderColor: 'hsl(var(--border))' }} />
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={isPending || uploading}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60"
          style={{ background: 'hsl(var(--primary))' }}>
          {isPending ? 'Menyimpan...' : product ? 'Simpan Perubahan' : 'Tambah Produk'}
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
