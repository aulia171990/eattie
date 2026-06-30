'use client'

import { useState, useTransition } from 'react'
import { updateCustomCakeRequest } from '@/actions/custom-cakes'
import type { CustomCakeRequest, CustomCakeStatus } from '@/types/custom-cake'
import { CUSTOM_CAKE_STATUS_LABEL, CUSTOM_CAKE_STATUS_COLOR } from '@/types/custom-cake'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ChevronDown, Cake, Phone, Calendar, ImageIcon, CheckCircle, Loader2, StickyNote } from 'lucide-react'

const ALL_STATUSES: CustomCakeStatus[] = [
  'pending', 'quoted', 'confirmed', 'in_production', 'ready', 'delivered', 'cancelled',
]

function StatusBadge({ status }: { status: CustomCakeStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${CUSTOM_CAKE_STATUS_COLOR[status]}`}>
      {CUSTOM_CAKE_STATUS_LABEL[status]}
    </span>
  )
}

function RequestCard({ req, onUpdated }: { req: CustomCakeRequest; onUpdated: () => void }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<CustomCakeStatus>(req.status)
  const [price, setPrice] = useState<string>(req.quoted_price?.toString() ?? '')
  const [saving, startSave] = useTransition()
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    startSave(async () => {
      await updateCustomCakeRequest(req.id, {
        status,
        quoted_price: price ? parseFloat(price) : null,
      })
      setSaved(true)
      setTimeout(() => { setSaved(false); onUpdated() }, 1200)
    })
  }

  const isDirty = status !== req.status || price !== (req.quoted_price?.toString() ?? '')

  return (
    <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>

      {/* Card Header */}
      <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-orange-50/30 transition-colors text-left"
        onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
            style={{ background: 'hsl(var(--surface-raised))' }}>🎂</div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>
                {req.customer_name}
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded"
                style={{ background: 'hsl(var(--surface-raised))', color: 'hsl(var(--text-muted))' }}>
                {req.req_number}
              </span>
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-muted))' }}>
              {req.size} · {req.flavor} · {formatDate(req.created_at)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          <StatusBadge status={req.status} />
          {req.quoted_price && (
            <span className="text-sm font-bold hidden sm:block" style={{ color: 'hsl(var(--primary))' }}>
              {formatCurrency(req.quoted_price)}
            </span>
          )}
          <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`}
            style={{ color: 'hsl(var(--text-muted))' }} />
        </div>
      </button>

      {/* Expanded Detail */}
      {open && (
        <div className="border-t px-5 py-5 space-y-5" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--surface-raised))' }}>
          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Phone size={14} className="mt-0.5 shrink-0" style={{ color: 'hsl(var(--primary))' }} />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'hsl(var(--text-muted))' }}>WhatsApp</p>
                  <a href={`https://wa.me/62${req.customer_phone.replace(/^0/, '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="font-medium hover:underline" style={{ color: 'hsl(var(--primary))' }}>
                    {req.customer_phone}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Cake size={14} className="mt-0.5 shrink-0" style={{ color: 'hsl(var(--primary))' }} />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'hsl(var(--text-muted))' }}>Detail Kue</p>
                  <p style={{ color: 'hsl(var(--foreground))' }}>
                    {req.size} · {req.flavor}
                    {req.color_theme && <span> · <span className="italic">{req.color_theme}</span></span>}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar size={14} className="mt-0.5 shrink-0" style={{ color: 'hsl(var(--primary))' }} />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'hsl(var(--text-muted))' }}>Tanggal Request</p>
                  <p style={{ color: 'hsl(var(--foreground))' }}>{formatDate(req.created_at)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {req.special_notes && (
                <div className="flex items-start gap-2">
                  <StickyNote size={14} className="mt-0.5 shrink-0" style={{ color: 'hsl(var(--primary))' }} />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'hsl(var(--text-muted))' }}>Catatan Khusus</p>
                    <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--text-secondary))' }}>{req.special_notes}</p>
                  </div>
                </div>
              )}
              {req.reference_image_url && (
                <div className="flex items-start gap-2">
                  <ImageIcon size={14} className="mt-0.5 shrink-0" style={{ color: 'hsl(var(--primary))' }} />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'hsl(var(--text-muted))' }}>Gambar Referensi</p>
                    <a href={req.reference_image_url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={req.reference_image_url} alt="Referensi"
                        className="w-32 h-24 object-cover rounded-xl border hover:opacity-90 transition-opacity"
                        style={{ borderColor: 'hsl(var(--border))' }} />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Admin Controls */}
          <div className="flex flex-wrap items-end gap-3 pt-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
            {/* Status */}
            <div className="space-y-1.5 flex-1 min-w-[160px]">
              <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--text-muted))' }}>
                Update Status
              </label>
              <select value={status} onChange={e => setStatus(e.target.value as CustomCakeStatus)}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                style={{ borderColor: 'hsl(var(--border))', background: 'white' }}>
                {ALL_STATUSES.map(s => (
                  <option key={s} value={s}>{CUSTOM_CAKE_STATUS_LABEL[s]}</option>
                ))}
              </select>
            </div>

            {/* Quoted Price */}
            <div className="space-y-1.5 flex-1 min-w-[140px]">
              <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--text-muted))' }}>
                Harga Penawaran (Rp)
              </label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                placeholder="Cth: 250000"
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                style={{ borderColor: 'hsl(var(--border))', background: 'white' }} />
            </div>

            {/* Save Button */}
            <button onClick={handleSave} disabled={saving || !isDirty}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 flex items-center gap-2"
              style={{ background: saved ? 'hsl(var(--success))' : 'hsl(var(--primary))' }}>
              {saving
                ? <><Loader2 size={14} className="animate-spin" /> Menyimpan...</>
                : saved
                  ? <><CheckCircle size={14} /> Tersimpan</>
                  : 'Simpan'}
            </button>

            {/* WA Quick Reply */}
            {req.customer_phone && (
              <a href={`https://wa.me/62${req.customer_phone.replace(/^0/, '')}?text=${encodeURIComponent(
                `Halo ${req.customer_name}, kami dari Eattie ingin konfirmasi permintaan custom cake Anda (${req.req_number}).`
                + (price ? `\n\nHarga penawaran kami: Rp ${parseInt(price).toLocaleString('id-ID')}` : '')
                + `\n\nDetail:\n• Ukuran: ${req.size}\n• Rasa: ${req.flavor}`
                + (req.color_theme ? `\n• Tema: ${req.color_theme}` : '')
                + `\n\nMohon konfirmasi jika setuju. Terima kasih! 🎂`
              )}`}
                target="_blank" rel="noopener noreferrer"
                className="px-5 py-2 rounded-xl text-sm font-semibold border transition-all hover:bg-green-50 flex items-center gap-2"
                style={{ borderColor: 'hsl(var(--success))', color: 'hsl(var(--success))' }}>
                💬 WA Customer
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Dashboard Component ────────────────────────────────────────────────
export function CustomCakeDashboard({ initialRequests }: { initialRequests: CustomCakeRequest[] }) {
  const [requests, setRequests] = useState(initialRequests)
  const [filterStatus, setFilterStatus] = useState<CustomCakeStatus | 'all'>('all')

  const filtered = filterStatus === 'all'
    ? requests
    : requests.filter(r => r.status === filterStatus)

  const counts = requests.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})

  const refresh = () => window.location.reload()

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>Custom Cake</h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--text-muted))' }}>
            {requests.length} permintaan masuk
          </p>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['pending', 'quoted', 'confirmed', 'in_production'] as CustomCakeStatus[]).map(s => (
          <button key={s} onClick={() => setFilterStatus(prev => prev === s ? 'all' : s)}
            className="rounded-2xl p-4 text-left border transition-all"
            style={{
              background: 'white',
              borderColor: filterStatus === s ? 'hsl(var(--primary))' : 'hsl(var(--border))',
              boxShadow: filterStatus === s ? '0 0 0 2px hsl(var(--primary))' : 'none',
            }}>
            <p className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
              {counts[s] ?? 0}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider mt-1"
              style={{ color: 'hsl(var(--text-muted))' }}>
              {CUSTOM_CAKE_STATUS_LABEL[s]}
            </p>
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setFilterStatus('all')}
          className="shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
          style={filterStatus === 'all'
            ? { background: 'hsl(var(--primary))', color: 'white' }
            : { background: 'white', color: 'hsl(var(--text-muted))', border: '1px solid hsl(var(--border))' }}>
          Semua ({requests.length})
        </button>
        {ALL_STATUSES.map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className="shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={filterStatus === s
              ? { background: 'hsl(var(--primary))', color: 'white' }
              : { background: 'white', color: 'hsl(var(--text-muted))', border: '1px solid hsl(var(--border))' }}>
            {CUSTOM_CAKE_STATUS_LABEL[s]} {counts[s] ? `(${counts[s]})` : ''}
          </button>
        ))}
      </div>

      {/* Request List */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <div className="text-5xl">🎂</div>
          <p className="font-semibold" style={{ color: 'hsl(var(--text-muted))' }}>
            {filterStatus === 'all' ? 'Belum ada permintaan custom cake' : 'Tidak ada permintaan dengan status ini'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <RequestCard key={req.id} req={req} onUpdated={refresh} />
          ))}
        </div>
      )}
    </div>
  )
}
