'use client'

import { useState, useRef } from 'react'
import { submitCustomCakeRequest } from '@/actions/custom-cakes'
import { X, Upload, CheckCircle, Loader2 } from 'lucide-react'

const SIZES = [
  { value: '16cm', label: 'Diameter 16 cm (~6-8 orang)' },
  { value: '20cm', label: 'Diameter 20 cm (~12-16 orang)' },
  { value: '24cm', label: 'Diameter 24 cm (~20+ orang)' },
]

const FLAVORS = [
  { value: 'Chocolate', label: 'Chocolate Fudge' },
  { value: 'Vanilla', label: 'Vanilla Strawberry' },
  { value: 'RedVelvet', label: 'Red Velvet' },
  { value: 'Tiramisu', label: 'Tiramisu' },
  { value: 'MatchaGreen', label: 'Matcha Green Tea' },
  { value: 'Other', label: 'Lainnya (tulis di catatan)' },
]

interface Props {
  onClose: () => void
}

export function CustomCakeForm({ onClose }: Props) {
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reqNumber, setReqNumber] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview
    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    // Upload to Supabase storage via existing API route
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/upload-product-image', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.url) setImageUrl(json.url)
      else setError('Gagal upload gambar, lanjutkan tanpa gambar atau coba lagi.')
    } catch {
      setError('Gagal upload gambar.')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    if (imageUrl) fd.set('reference_image_url', imageUrl)

    const result = await submitCustomCakeRequest(fd)
    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setReqNumber(result.reqNumber ?? '')
    setStep('success')
  }

  const inputCls = `w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-orange-400 focus:ring-2 focus:ring-orange-100`
  const inputStyle = { borderColor: 'hsl(36, 25%, 82%)', background: 'hsl(36, 40%, 98%)' }

  if (step === 'success') {
    return (
      <div className="text-center py-6 space-y-4">
        <div className="flex justify-center">
          <CheckCircle size={56} className="text-green-500" />
        </div>
        <h3 className="text-xl font-bold" style={{ fontFamily: '"Playfair Display", serif', color: 'hsl(25, 30%, 12%)' }}>
          Permintaan Terkirim!
        </h3>
        <p className="text-sm" style={{ color: 'hsl(25, 15%, 45%)' }}>
          Nomor request Anda:
        </p>
        <div className="inline-block px-5 py-2 rounded-xl font-mono font-bold text-lg"
          style={{ background: 'hsl(36, 80%, 93%)', color: 'hsl(32, 90%, 40%)' }}>
          {reqNumber}
        </div>
        <p className="text-xs max-w-xs mx-auto leading-relaxed" style={{ color: 'hsl(25, 15%, 50%)' }}>
          Tim kami akan menghubungi Anda dalam 1×24 jam untuk konfirmasi harga dan detail pesanan.
        </p>
        <button onClick={onClose}
          className="mt-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white"
          style={{ background: 'hsl(32, 90%, 44%)' }}>
          Tutup
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-xl font-bold" style={{ fontFamily: '"Playfair Display", serif', color: 'hsl(25, 30%, 12%)' }}>
            Pesan Custom Cake
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'hsl(25, 15%, 52%)' }}>
            Ceritakan kue impian Anda, kami akan menghubungi untuk konfirmasi harga.
          </p>
        </div>
        <button onClick={onClose}
          className="p-1.5 rounded-full hover:bg-orange-50 transition-colors"
          style={{ color: 'hsl(25, 20%, 50%)' }}>
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {error && (
          <div className="px-4 py-3 rounded-xl text-xs text-red-700 bg-red-50 border border-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'hsl(25, 20%, 40%)' }}>Nama Anda *</label>
            <input name="customer_name" type="text" required placeholder="Nama lengkap"
              className={inputCls} style={inputStyle} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'hsl(25, 20%, 40%)' }}>No. WhatsApp *</label>
            <input name="customer_phone" type="tel" required placeholder="08xxxxxxxxxx"
              className={inputCls} style={inputStyle} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'hsl(25, 20%, 40%)' }}>Ukuran *</label>
            <select name="size" required className={inputCls} style={inputStyle}>
              {SIZES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'hsl(25, 20%, 40%)' }}>Rasa *</label>
            <select name="flavor" required className={inputCls} style={inputStyle}>
              {FLAVORS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: 'hsl(25, 20%, 40%)' }}>Tema Warna <span className="font-normal normal-case" style={{ color: 'hsl(25,15%,60%)' }}>(opsional)</span></label>
          <input name="color_theme" type="text" placeholder="Contoh: Pastel pink, Gold, Navy blue"
            className={inputCls} style={inputStyle} />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: 'hsl(25, 20%, 40%)' }}>Catatan Khusus <span className="font-normal normal-case" style={{ color: 'hsl(25,15%,60%)' }}>(tulisan di kue, dll)</span></label>
          <textarea name="special_notes" rows={3}
            placeholder="Contoh: Tulisan 'Happy Birthday Budi', lilin angka 25, dekorasi mawar merah..."
            className={inputCls} style={{ ...inputStyle, resize: 'none' }} />
        </div>

        {/* Image Upload */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: 'hsl(25, 20%, 40%)' }}>Gambar Referensi <span className="font-normal normal-case" style={{ color: 'hsl(25,15%,60%)' }}>(opsional)</span></label>

          {imagePreview ? (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border"
              style={{ borderColor: 'hsl(36, 25%, 82%)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="Referensi" className="w-full h-full object-cover" />
              {uploading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <Loader2 size={24} className="animate-spin" style={{ color: 'hsl(32, 90%, 44%)' }} />
                </div>
              )}
              <button type="button"
                onClick={() => { setImagePreview(null); setImageUrl(null) }}
                className="absolute top-2 right-2 p-1 rounded-full bg-white shadow">
                <X size={14} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full py-8 rounded-xl border-2 border-dashed flex flex-col items-center gap-2 transition-colors hover:bg-orange-50"
              style={{ borderColor: 'hsl(36, 30%, 80%)', color: 'hsl(25, 15%, 55%)' }}>
              <Upload size={22} />
              <span className="text-xs">Klik untuk upload foto referensi</span>
              <span className="text-[10px]">JPG / PNG, maks. 2MB</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={handleImageChange} />
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-full text-sm font-semibold border transition-colors"
            style={{ borderColor: 'hsl(36, 25%, 82%)', color: 'hsl(25, 25%, 40%)' }}>
            Batal
          </button>
          <button type="submit" disabled={loading || uploading}
            className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: 'hsl(32, 90%, 44%)' }}>
            {loading ? <><Loader2 size={14} className="animate-spin" /> Mengirim...</> : 'Kirim Permintaan'}
          </button>
        </div>
      </form>
    </>
  )
}
