'use client'

import { useState, use } from 'react'
import { trackOrder } from '@/actions/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Search, Package, CheckCircle, Clock, Truck, Store, Star } from 'lucide-react'

const STATUS_STEPS = [
  { key: 'NEW',              label: 'Pesanan Diterima',   icon: Clock },
  { key: 'PAID',             label: 'Pembayaran Verified',icon: CheckCircle },
  { key: 'IN_PRODUCTION',    label: 'Sedang Dibuat',      icon: Package },
  { key: 'READY_FOR_PICKUP', label: 'Siap Diambil',       icon: Store },
  { key: 'DELIVERED',        label: 'Dikirim',            icon: Truck },
  { key: 'COMPLETED',        label: 'Selesai',            icon: CheckCircle },
]

interface StoreTrackerProps {
  searchParams: Promise<{ order?: string; phone?: string }>
}

export function StoreTracker({ searchParams }: StoreTrackerProps) {
  const params = use(searchParams)
  const [orderNum, setOrderNum] = useState(params.order ?? '')
  const [phone, setPhone] = useState(params.phone ?? '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Awaited<ReturnType<typeof trackOrder>> | null>(null)
  const [searched, setSearched] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewHover, setReviewHover] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewProductId, setReviewProductId] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewDone, setReviewDone] = useState(false)

  const handleSearch = async () => {
    if (!orderNum.trim() || !phone.trim()) return
    setLoading(true)
    setSearched(true)
    const data = await trackOrder(orderNum.trim(), phone.trim())
    setResult(data)
    setLoading(false)
  }

  // Auto-search if params provided
  if (params.order && params.phone && !searched) {
    handleSearch()
  }

  const currentStepIdx = result
    ? STATUS_STEPS.findIndex(s => s.key === result.status)
    : -1

  return (
    <div className="pt-6 max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'hsl(25, 30%, 15%)' }}>Lacak Pesanan</h1>
        <p className="text-sm mt-1" style={{ color: 'hsl(25, 15%, 55%)' }}>
          Masukkan nomor order dan nomor HP Anda.
        </p>
      </div>

      <div className="bg-white rounded-2xl border p-4 space-y-3" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(25, 30%, 25%)' }}>Nomor Order</label>
          <input
            type="text"
            placeholder="ORD-20260609-001"
            value={orderNum}
            onChange={e => setOrderNum(e.target.value.toUpperCase())}
            className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none font-mono"
            style={{ borderColor: 'hsl(36, 20%, 85%)' }}
          />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(25, 30%, 25%)' }}>Nomor HP</label>
          <input
            type="tel"
            placeholder="08xxxxxxxxxx"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
            style={{ borderColor: 'hsl(36, 20%, 85%)' }}
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !orderNum.trim() || !phone.trim()}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'hsl(32, 95%, 44%)' }}
        >
          <Search size={15} />
          {loading ? 'Mencari...' : 'Cari Pesanan'}
        </button>
      </div>

      {searched && !loading && !result && (
        <div className="py-8 text-center space-y-2">
          <p className="text-2xl">🔍</p>
          <p className="text-sm font-medium" style={{ color: 'hsl(25, 30%, 20%)' }}>Pesanan tidak ditemukan</p>
          <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>
            Pastikan nomor order dan nomor HP sesuai.
          </p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Order info */}
          <div className="bg-white rounded-2xl border p-4 space-y-3" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>Nomor Order</p>
                <p className="font-bold text-sm font-mono" style={{ color: 'hsl(32, 95%, 40%)' }}>
                  {result.order_number}
                </p>
              </div>
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: result.payment_status === 'PAID' || result.payment_status === 'paid' ? 'hsl(142, 50%, 90%)' : 'hsl(36, 80%, 90%)',
                  color: result.payment_status === 'PAID' || result.payment_status === 'paid' ? 'hsl(142, 60%, 28%)' : 'hsl(32, 95%, 35%)',
                }}
              >
                {result.payment_status === 'PAID' || result.payment_status === 'paid' ? '✓ Lunas' : 'Belum Lunas'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>Nama</p>
                <p className="font-medium">{result.customer_name}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>Total</p>
                <p className="font-bold" style={{ color: 'hsl(32, 95%, 40%)' }}>
                  {formatCurrency(result.total_amount)}
                </p>
              </div>
              {result.pickup_date && (
                <div>
                  <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>
                    {result.order_type === 'pickup' ? 'Tanggal Ambil' : 'Tanggal Kirim'}
                  </p>
                  <p className="font-medium">{formatDate(result.pickup_date)}</p>
                </div>
              )}
              <div>
                <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>Tanggal Order</p>
                <p className="font-medium">{formatDate(result.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Status timeline */}
          <div className="bg-white rounded-2xl border p-4" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
            <p className="text-xs font-semibold mb-4" style={{ color: 'hsl(25, 15%, 45%)' }}>STATUS PESANAN</p>
            <div className="space-y-3">
              {STATUS_STEPS.filter(s => s.key !== 'delivered' || result.order_type === 'delivery').map((step, idx) => {
                const Icon = step.icon
                const isDone = idx <= currentStepIdx
                const isCurrent = idx === currentStepIdx
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: isDone ? 'hsl(142, 50%, 90%)' : 'hsl(36, 20%, 94%)',
                        color: isDone ? 'hsl(142, 60%, 35%)' : 'hsl(25, 15%, 60%)',
                      }}
                    >
                      <Icon size={15} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{
                        color: isCurrent ? 'hsl(25, 30%, 15%)' : isDone ? 'hsl(25, 15%, 40%)' : 'hsl(25, 15%, 65%)',
                        fontWeight: isCurrent ? '700' : '500',
                      }}>
                        {step.label}
                      </p>
                    </div>
                    {isCurrent && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'hsl(32, 80%, 90%)', color: 'hsl(32, 95%, 35%)' }}>
                        Saat ini
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'hsl(36, 20%, 92%)' }}>
              <p className="text-xs font-semibold" style={{ color: 'hsl(25, 15%, 45%)' }}>DETAIL PESANAN</p>
            </div>
            {result.order_items.map((item, idx) => (
              <div key={idx} className={`flex justify-between items-center px-4 py-3 ${idx > 0 ? 'border-t' : ''}`}
                style={{ borderColor: 'hsl(36, 20%, 94%)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'hsl(25, 30%, 15%)' }}>{item.product_name}</p>
                  <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>{item.quantity} × {formatCurrency(item.unit_price)}</p>
                </div>
                <p className="text-sm font-semibold" style={{ color: 'hsl(32, 95%, 40%)' }}>
                  {formatCurrency(item.subtotal)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reviewProductId || reviewRating === 0 || !result) return
    setReviewSubmitting(true)
    try {
      await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: reviewProductId,
          order_id: result.id,
          customer_name: result.customer_name,
          customer_phone: phone,
          rating: reviewRating,
          comment: reviewComment,
        }),
      })
      setReviewDone(true)
    } catch {
      // silent fail
    }
    setReviewSubmitting(false)
  }

  const reviewSection = result && result.status === 'COMPLETED' && result.order_items?.length > 0 && !reviewDone && (
    <div className="bg-white rounded-2xl border p-4 space-y-3"
      style={{ borderColor: 'hsl(36, 20%, 90%)' }}>
      <h3 className="text-sm font-bold" style={{ color: 'hsl(25, 30%, 15%)' }}>
        ⭐ Beri Ulasan Produk
      </h3>
      <form onSubmit={handleReviewSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(25, 30%, 35%)' }}>
            Pilih produk
          </label>
          <select value={reviewProductId} onChange={e => setReviewProductId(e.target.value)}
            required className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
            style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
            <option value="">Pilih produk...</option>
            {result.order_items.map((item: { product_id: string; product_name: string }) => (
              <option key={item.product_id} value={item.product_id}>{item.product_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(25, 30%, 35%)' }}>Rating</label>
          <div className="flex gap-1">
            {[1,2,3,4,5].map(star => (
              <button key={star} type="button"
                onMouseEnter={() => setReviewHover(star)}
                onMouseLeave={() => setReviewHover(0)}
                onClick={() => setReviewRating(star)}
                className="text-2xl transition-transform hover:scale-110">
                <Star size={24} fill={(reviewHover || reviewRating) >= star ? 'hsl(36, 90%, 50%)' : 'none'}
                  style={{ color: (reviewHover || reviewRating) >= star ? 'hsl(36, 90%, 50%)' : 'hsl(36, 20%, 80%)' }} />
              </button>
            ))}
          </div>
        </div>
        <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)}
          placeholder="Ceritakan pengalaman Anda (opsional)..." rows={3}
          className="w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none"
          style={{ borderColor: 'hsl(36, 20%, 88%)' }} />
        <button type="submit" disabled={reviewSubmitting || reviewRating === 0 || !reviewProductId}
          className="w-full py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-50"
          style={{ background: 'hsl(32, 90%, 44%)' }}>
          {reviewSubmitting ? 'Mengirim...' : 'Kirim Ulasan'}
        </button>
      </form>
    </div>
  )

  const reviewDoneSection = reviewDone && (
    <div className="bg-white rounded-2xl border p-4 text-center space-y-1"
      style={{ borderColor: 'hsl(36, 20%, 90%)' }}>
      <p className="text-2xl">🙏</p>
      <p className="text-sm font-bold" style={{ color: 'hsl(25, 30%, 15%)' }}>Terima kasih atas ulasannya!</p>
      <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>Ulasan Anda sangat berarti bagi kami.</p>
    </div>
  )

  return (
    <div>
      {reviewSection}
      {reviewDoneSection}
    </div>
  )
}
