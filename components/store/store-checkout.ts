'use client'

import { useState, useRef } from 'react'
import { useStoreCart } from '@/contexts/store-cart-context'
import { submitOrder, uploadPaymentProof } from '@/actions/store'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, Upload, Check, ChevronRight, Loader, ExternalLink } from 'lucide-react'

const QRIS_URL = process.env.NEXT_PUBLIC_QRIS_IMAGE_URL ?? ''
const STORE_PHONE = process.env.NEXT_PUBLIC_STORE_WHATSAPP ?? ''

type Step = 'cart' | 'form' | 'payment' | 'success'

export function StoreCheckout() {
  const { items, total, clearCart, itemCount } = useStoreCart()
  const [step, setStep] = useState<Step>('cart')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [uploadingProof, setUploadingProof] = useState(false)
  const submittingRef = useRef(false)

  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    order_type: 'pickup' as 'pickup' | 'delivery' | 'PICKUP' | 'DELIVERY',
    pickup_date: '',
    pickup_time: '',
    delivery_address: '',
    notes: '',
  })

  if (itemCount === 0 && step !== 'success') {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-4xl">🛒</p>
        <p className="font-semibold" style={{ color: 'hsl(25, 30%, 20%)' }}>Keranjang kosong</p>
        <Link href="/store" className="inline-block px-5 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: 'hsl(32, 95%, 44%)' }}>
          Kembali Belanja
        </Link>
      </div>
    )
  }

  const handleUploadProof = async (file: File) => {
    setUploadingProof(true)
    const { url, error } = await uploadPaymentProof(file)
    setUploadingProof(false)
    if (error) { setError(error); return }
    if (url) setProofUrl(url)
  }

  const handleSubmit = async () => {
    if (submittingRef.current) return
    submittingRef.current = true
    setLoading(true)
    setError('')

    try {
      const result = await submitOrder({
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        order_type: form.order_type,
        pickup_date: form.pickup_date || undefined,
        pickup_time: form.pickup_time || undefined,
        delivery_address: form.delivery_address || undefined,
        notes: form.notes || undefined,
        items: items.map(i => ({
          product_id: i.product.id,
          product_name: i.product.name,
          quantity: i.quantity,
          unit_price: i.product.selling_price,
          subtotal: i.product.selling_price * i.quantity,
        })),
        subtotal: total,
        total_amount: total,
        payment_proof_url: proofUrl || undefined,
      })

      if (result.error) { setError(result.error); return }
      setOrderNumber(result.orderNumber ?? '')
      clearCart()
      setStep('success')
    } finally {
      setLoading(false)
      submittingRef.current = false
    }
  }

  const waMessage = encodeURIComponent(
    `Halo! Saya sudah melakukan pemesanan di Eattie Bakery.\n\nNomor Order: ${orderNumber}\nNama: ${form.customer_name}\nTotal: ${formatCurrency(total)}\n\nMohon konfirmasinya. Terima kasih! 🍞`
  )
  const waLink = STORE_PHONE ? `https://wa.me/${STORE_PHONE}?text=${waMessage}` : null

  // ── SUCCESS ──────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="py-10 max-w-sm mx-auto text-center space-y-5">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-3xl"
          style={{ background: 'hsl(142, 50%, 90%)' }}>✅</div>
        <div className="space-y-1">
          <h1 className="text-xl font-bold" style={{ color: 'hsl(25, 30%, 15%)' }}>Pesanan Diterima!</h1>
          <p className="text-sm" style={{ color: 'hsl(25, 15%, 50%)' }}>
            Kami akan segera memproses pesanan Anda.
          </p>
        </div>

        <div className="bg-white rounded-2xl border p-4 text-left space-y-2" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>Nomor Order</span>
            <span className="font-bold text-sm" style={{ color: 'hsl(32, 95%, 40%)' }}>{orderNumber}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>Total</span>
            <span className="font-semibold text-sm">{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="space-y-2">
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'hsl(142, 60%, 40%)' }}>
              <span>💬</span> Konfirmasi via WhatsApp
              <ExternalLink size={14} />
            </a>
          )}
          <Link href={`/store/track?order=${orderNumber}&phone=${form.customer_phone}`}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold border"
            style={{ borderColor: 'hsl(36, 20%, 85%)', color: 'hsl(25, 30%, 25%)' }}>
            Lacak Pesanan
          </Link>
          <Link href="/store"
            className="block w-full py-3 rounded-xl text-sm font-medium text-center"
            style={{ color: 'hsl(25, 15%, 55%)' }}>
            Kembali ke Toko
          </Link>
        </div>
      </div>
    )
  }

  // ── CART REVIEW ──────────────────────────────────────────────────────────
  if (step === 'cart') {
    return (
      <div className="pt-6 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/store" className="p-1.5 rounded-lg hover:bg-white transition-colors">
            <ArrowLeft size={18} style={{ color: 'hsl(25, 30%, 30%)' }} />
          </Link>
          <h1 className="text-lg font-bold" style={{ color: 'hsl(25, 30%, 15%)' }}>Keranjang</h1>
        </div>

        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
          {items.map((item, idx) => (
            <div key={item.product.id} className={`flex items-center gap-3 px-4 py-3 ${idx > 0 ? 'border-t' : ''}`}
              style={{ borderColor: 'hsl(36, 20%, 94%)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ background: 'hsl(36, 40%, 95%)' }}>🧁</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'hsl(25, 30%, 15%)' }}>{item.product.name}</p>
                <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>{formatCurrency(item.product.selling_price)} × {item.quantity}</p>
              </div>
              <p className="text-sm font-bold shrink-0" style={{ color: 'hsl(32, 95%, 40%)' }}>
                {formatCurrency(item.product.selling_price * item.quantity)}
              </p>
            </div>
          ))}
          <div className="flex justify-between items-center px-4 py-3 border-t" style={{ borderColor: 'hsl(36, 20%, 90%)', background: 'hsl(36, 20%, 98%)' }}>
            <span className="text-sm font-semibold">Total</span>
            <span className="text-base font-bold" style={{ color: 'hsl(32, 95%, 40%)' }}>{formatCurrency(total)}</span>
          </div>
        </div>

        <button onClick={() => setStep('form')}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-semibold text-white"
          style={{ background: 'hsl(32, 95%, 44%)' }}>
          Lanjut ke Data Pemesan <ChevronRight size={16} />
        </button>
      </div>
    )
  }

  // ── FORM ─────────────────────────────────────────────────────────────────
  if (step === 'form') {
    const isValid = form.customer_name.trim() && form.customer_phone.trim() &&
      (form.order_type === 'delivery' ? form.delivery_address.trim() : true)

    return (
      <div className="pt-6 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('cart')} className="p-1.5 rounded-lg hover:bg-white transition-colors">
            <ArrowLeft size={18} style={{ color: 'hsl(25, 30%, 30%)' }} />
          </button>
          <h1 className="text-lg font-bold" style={{ color: 'hsl(25, 30%, 15%)' }}>Data Pemesan</h1>
        </div>

        <div className="bg-white rounded-2xl border p-4 space-y-3" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
          {[
            { label: 'Nama Lengkap*', key: 'customer_name', type: 'text', placeholder: 'Masukkan nama Anda' },
            { label: 'Nomor HP / WhatsApp*', key: 'customer_phone', type: 'tel', placeholder: '08xxxxxxxxxx' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(25, 30%, 25%)' }}>{label}</label>
              <input type={type} placeholder={placeholder} value={form[key as keyof typeof form]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                style={{ borderColor: 'hsl(36, 20%, 85%)' }} />
            </div>
          ))}

          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(25, 30%, 25%)' }}>Metode Pengambilan</label>
            <div className="grid grid-cols-2 gap-2">
              {(['pickup', 'delivery'] as const).map(type => (
                <button key={type} type="button"
                  onClick={() => setForm(f => ({ ...f, order_type: type }))}
                  className="py-2.5 rounded-xl text-xs font-semibold border-2 transition-all"
                  style={form.order_type === type
                    ? { borderColor: 'hsl(32, 95%, 44%)', background: 'hsl(32, 80%, 95%)', color: 'hsl(32, 95%, 35%)' }
                    : { borderColor: 'hsl(36, 20%, 88%)', background: 'white', color: 'hsl(25, 15%, 50%)' }}>
                  {type === 'pickup' ? '🏪 Ambil di Toko' : '🛵 Dikirim'}
                </button>
              ))}
            </div>
          </div>

          {form.order_type === 'pickup' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(25, 30%, 25%)' }}>Tanggal Ambil</label>
                <input type="date" value={form.pickup_date}
                  onChange={e => setForm(f => ({ ...f, pickup_date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: 'hsl(36, 20%, 85%)' }} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(25, 30%, 25%)' }}>Jam Ambil</label>
                <input type="time" value={form.pickup_time}
                  onChange={e => setForm(f => ({ ...f, pickup_time: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: 'hsl(36, 20%, 85%)' }} />
              </div>
            </div>
          )}

          {form.order_type === 'delivery' && (
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(25, 30%, 25%)' }}>Alamat Pengiriman*</label>
              <textarea rows={2} value={form.delivery_address}
                onChange={e => setForm(f => ({ ...f, delivery_address: e.target.value }))}
                placeholder="Jl. Contoh No. 123, RT/RW, Kelurahan, Kota"
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
                style={{ borderColor: 'hsl(36, 20%, 85%)' }} />
            </div>
          )}

          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(25, 30%, 25%)' }}>Catatan (opsional)</label>
            <textarea rows={2} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Permintaan khusus, dll."
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
              style={{ borderColor: 'hsl(36, 20%, 85%)' }} />
          </div>
        </div>

        <button onClick={() => setStep('payment')} disabled={!isValid}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'hsl(32, 95%, 44%)' }}>
          Lanjut ke Pembayaran <ChevronRight size={16} />
        </button>
      </div>
    )
  }

  // ── PAYMENT ──────────────────────────────────────────────────────────────
  return (
    <div className="pt-6 max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setStep('form')} className="p-1.5 rounded-lg hover:bg-white transition-colors">
          <ArrowLeft size={18} style={{ color: 'hsl(25, 30%, 30%)' }} />
        </button>
        <h1 className="text-lg font-bold" style={{ color: 'hsl(25, 30%, 15%)' }}>Pembayaran</h1>
      </div>

      {/* Order summary */}
      <div className="bg-white rounded-2xl border p-4" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>Total Pembayaran</p>
            <p className="text-2xl font-bold" style={{ color: 'hsl(32, 95%, 40%)' }}>{formatCurrency(total)}</p>
            <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>{itemCount} produk</p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>Nama</p>
            <p className="text-sm font-medium">{form.customer_name}</p>
          </div>
        </div>
      </div>

      {/* QRIS */}
      <div className="bg-white rounded-2xl border p-4 flex flex-col items-center gap-3" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
        <p className="text-xs font-semibold" style={{ color: 'hsl(25, 15%, 45%)' }}>SCAN QRIS UNTUK MEMBAYAR</p>
        {QRIS_URL ? (
          <div className="rounded-2xl p-3 border-2" style={{ borderColor: 'hsl(210, 70%, 75%)', background: 'hsl(210, 60%, 97%)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={QRIS_URL} alt="QRIS" className="w-48 h-48 object-contain" />
          </div>
        ) : (
          <div className="w-48 h-48 rounded-2xl border-2 border-dashed flex items-center justify-center text-center p-4"
            style={{ borderColor: 'hsl(210, 40%, 75%)' }}>
            <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>QR belum dikonfigurasi</p>
          </div>
        )}
        <p className="text-xs text-center" style={{ color: 'hsl(25, 15%, 55%)' }}>
          GoPay · OVO · Dana · ShopeePay · semua m-banking
        </p>
      </div>

      {/* Upload proof */}
      <div className="bg-white rounded-2xl border p-4 space-y-3" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
        <p className="text-sm font-semibold" style={{ color: 'hsl(25, 30%, 15%)' }}>
          Upload Bukti Pembayaran
        </p>
        <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>
          Opsional — Anda juga bisa konfirmasi via WhatsApp setelah checkout.
        </p>

        {proofUrl ? (
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'hsl(142, 50%, 95%)' }}>
            <Check size={16} style={{ color: 'hsl(142, 60%, 35%)' }} />
            <span className="text-xs font-medium" style={{ color: 'hsl(142, 60%, 30%)' }}>Bukti berhasil diupload</span>
          </div>
        ) : (
          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed cursor-pointer transition-colors hover:bg-gray-50"
            style={{ borderColor: 'hsl(36, 20%, 82%)' }}>
            <input type="file" accept="image/*" className="hidden"
              onChange={e => e.target.files?.[0] && handleUploadProof(e.target.files[0])} />
            {uploadingProof
              ? <Loader size={15} className="animate-spin" style={{ color: 'hsl(25, 15%, 55%)' }} />
              : <Upload size={15} style={{ color: 'hsl(25, 15%, 55%)' }} />}
            <span className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>
              {uploadingProof ? 'Mengupload...' : 'Pilih foto bukti bayar'}
            </span>
          </label>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-xl text-xs bg-red-50 text-red-700 border border-red-200">{error}</div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-sm font-bold text-white disabled:opacity-60"
        style={{ background: 'hsl(142, 60%, 40%)' }}
      >
        {loading
          ? <><Loader size={16} className="animate-spin" /> Memproses...</>
          : <><Check size={16} /> Konfirmasi Pesanan</>}
      </button>

      <p className="text-xs text-center" style={{ color: 'hsl(25, 15%, 55%)' }}>
        Dengan menekan konfirmasi, Anda menyetujui bahwa pembayaran telah dilakukan.
      </p>
    </div>
  )
}
