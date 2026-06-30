'use client'

import { useState, useRef, useTransition } from 'react'
import { submitCustomCakeRequest } from '@/actions/custom-cakes'
import { X, Upload, CheckCircle, Loader2 } from 'lucide-react'

const SIZES = [
  { value: '16cm', label: 'Diameter 16 cm (6-8 orang)' },
  { value: '20cm', label: 'Diameter 20 cm (12-16 orang)' },
  { value: '24cm', label: 'Diameter 24 cm (18-24 orang)' },
]

const FLAVORS = [
  { value: 'Chocolate Fudge', label: 'Chocolate Fudge' },
  { value: 'Vanilla Strawberry', label: 'Vanilla Strawberry' },
  { value: 'Red Velvet', label: 'Red Velvet' },
  { value: 'Burnt Cheese', label: 'Burnt Cheesecake' },
  { value: 'Tiramisu', label: 'Tiramisu' },
  { value: 'Lainnya', label: 'Lainnya (tulis di catatan)' },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function CustomCakeModal({ open, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview
    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    // Upload to Supabase via existing API route
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/upload-product-image', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.url) setUploadedUrl(json.url)
      else setError('Gagal upload gambar, coba lagi.')
    } catch {
      setError('Gagal upload gambar.')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    if (uploadedUrl) fd.set('reference_image_url', uploadedUrl)

    startTransition(async () => {
      const result = await submitCustomCakeRequest(fd)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(result.reqNumber!)
      }
    })
  }

  const handleClose = () => {
    setSuccess(null)
    setError(null)
    setImagePreview(null)
    setUploadedUrl(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(30,20,10,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b"
          style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--text-muted))' }}>
          <div>
            <h3 className="font-bold text-lg" style={{ fontFamily: '"Playfair Display", serif', color: 'hsl(var(--foreground))' }}>
              Pesan Custom Cake
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-muted))' }}>
              Kami akan menghubungi Anda dengan penawaran harga
            </p>
          </div>
          <button onClick={handleClose}
            className="p-2 rounded-full hover:bg-orange-50 transition-colors"
            style={{ color: 'hsl(var(--text-muted))' }}>
            <X size={18} />
          </button>
        </div>

        {/* Success State */}
        {success ? (
          <div className="px-6 py-10 text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle size={52} style={{ color: 'hsl(var(--success))' }} />
            </div>
            <div>
              <p className="font-bold text-lg" style={{ color: 'hsl(var(--foreground))' }}>
                Permintaan Terkirim!
              </p>
              <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-muted))' }}>
                Nomor permintaan Anda:
              </p>
              <p className="font-mono font-bold text-xl mt-1" style={{ color: 'hsl(var(--primary))' }}>
                {success}
              </p>
            </div>
            <p className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
              Tim kami akan segera menghubungi Anda untuk konfirmasi harga dan detail pesanan.
            </p>
            <button onClick={handleClose}
              className="mt-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white"
              style={{ background: 'hsl(var(--primary))' }}>
              Tutup
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">

            {error && (
              <div className="p-3 rounded-xl text-xs text-red-700 bg-red-50 border border-red-200">
                {error}
              </div>
            )}

            {/* Name & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-secondary))' }}>
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input name="customer_name" required placeholder="Nama Anda"
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all"
                  style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--surface-raised))' }} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-secondary))' }}>
                  No. WhatsApp <span className="text-red-500">*</span>
                </label>
                <input name="customer_phone" required placeholder="08xxxxxxxxxx" type="tel"
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all"
                  style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--surface-raised))' }} />
              </div>
            </div>

            {/* Size & Flavor */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-secondary))' }}>
                  Ukuran <span className="text-red-500">*</span>
                </label>
                <select name="size" required
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--surface-raised))' }}>
                  {SIZES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-secondary))' }}>
                  Rasa <span className="text-red-500">*</span>
                </label>
                <select name="flavor" required
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--surface-raised))' }}>
                  {FLAVORS.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Color Theme */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-secondary))' }}>
                Tema Warna <span className="text-xs font-normal" style={{ color: 'hsl(var(--text-muted))' }}>(opsional)</span>
              </label>
              <input name="color_theme" placeholder="Cth: Pastel Pink, Emas & Putih, Biru Navy..."
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--surface-raised))' }} />
            </div>

            {/* Special Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-secondary))' }}>
                Catatan Khusus <span className="text-xs font-normal" style={{ color: 'hsl(var(--text-muted))' }}>(tulisan di kue, lilin, dll)</span>
              </label>
              <textarea name="special_notes" rows={3}
                placeholder="Cth: Tulisan 'Happy Birthday Riska', tambahkan lilin angka 25, mau dikemas fancy..."
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
                style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--surface-raised))' }} />
            </div>

            {/* Reference Image */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-secondary))' }}>
                Gambar Referensi <span className="text-xs font-normal" style={{ color: 'hsl(var(--text-muted))' }}>(opsional)</span>
              </label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />

              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden border aspect-video"
                  style={{ borderColor: 'hsl(var(--border))' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.7)' }}>
                      <Loader2 size={24} className="animate-spin" style={{ color: 'hsl(var(--primary))' }} />
                    </div>
                  )}
                  <button type="button" onClick={() => { setImagePreview(null); setUploadedUrl(null) }}
                    className="absolute top-2 right-2 p-1 rounded-full bg-white shadow">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed rounded-xl py-6 flex flex-col items-center gap-2 transition-colors hover:bg-orange-50"
                  style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-muted))' }}>
                  <Upload size={20} />
                  <span className="text-xs">Klik untuk upload gambar referensi</span>
                  <span className="text-[10px]">Maks. 2MB</span>
                </button>
              )}
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
              <button type="button" onClick={handleClose}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold border transition-colors hover:bg-gray-50"
                style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-muted))' }}>
                Batal
              </button>
              <button type="submit" disabled={isPending || uploading}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: 'hsl(var(--primary))' }}>
                {isPending ? <><Loader2 size={14} className="animate-spin" /> Mengirim...</> : 'Kirim Permintaan'}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  )
}
