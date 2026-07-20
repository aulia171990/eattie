'use client'

import { useActionState, useRef, useState } from 'react'
import { updateStoreSettings, uploadStoreLogo, type StoreSettings } from '@/actions/store-settings'
import { Upload, Check, Loader } from 'lucide-react'

type ActionState = { error?: string; success?: boolean } | null

interface Props {
  settings: StoreSettings | null
}

const COLORS = [
  { label: 'Cokelat Hangat', hsl: '32 95% 44%', hex: '#c87e1a' },
  { label: 'Hijau Segar', hsl: '142 60% 38%', hex: '#2e7d4f' },
  { label: 'Merah Marun', hsl: '345 52% 26%', hex: '#652030' },
  { label: 'Biru Laut', hsl: '210 60% 38%', hex: '#27639c' },
  { label: 'Ungu Lembut', hsl: '270 40% 45%', hex: '#6b46a3' },
  { label: 'Oranye Cerah', hsl: '24 90% 50%', hex: '#f0570a' },
]

const SIDEBAR_COLORS = [
  { label: 'Merah Marun', hsl: '345 32% 18%' },
  { label: 'Hijau Tua', hsl: '150 30% 18%' },
  { label: 'Biru Tua', hsl: '220 30% 18%' },
  { label: 'Abu Gelap', hsl: '0 0% 15%' },
  { label: 'Cokelat Tua', hsl: '25 30% 12%' },
]

export function StoreSettingsForm({ settings }: Props) {
  const [state, formAction, isPending] = useActionState(updateStoreSettings, null)
  const [uploading, setUploading] = useState<'logo' | 'icon' | null>(null)
  const [previewLogo, setPreviewLogo] = useState<string | null>(null)
  const [previewIcon, setPreviewIcon] = useState<string | null>(null)
  const logoRef = useRef<HTMLInputElement>(null)
  const iconRef = useRef<HTMLInputElement>(null)
  const [selectedPrimary, setSelectedPrimary] = useState(settings?.primary_color ?? '32 95% 44%')
  const [selectedSidebar, setSelectedSidebar] = useState(settings?.sidebar_color ?? '345 32% 18%')

  const handleUpload = async (file: File, type: 'logo' | 'icon') => {
    setUploading(type)
    const result = await uploadStoreLogo(file, type)
    setUploading(null)
    if (result.error) { alert(result.error); return }
    if (result.url) {
      if (type === 'logo') setPreviewLogo(result.url)
      else setPreviewIcon(result.url)
    }
  }

  return (
    <form action={formAction} className="space-y-6">

      {/* ── TOKO ── */}
      <div className="bg-white rounded-xl border p-5 space-y-4" style={{ borderColor: 'hsl(var(--border))' }}>
        <h2 className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>Informasi Toko</h2>

        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'hsl(var(--text-secondary))' }}>Nama Toko</label>
          <input name="company_name" defaultValue={settings?.company_name ?? 'Eattie Bakery'}
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
        </div>

        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'hsl(var(--text-secondary))' }}>Nama Singkat</label>
          <input name="short_name" defaultValue={settings?.short_name ?? 'Eattie'}
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
        </div>

        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'hsl(var(--text-secondary))' }}>Tagline</label>
          <input name="tagline" defaultValue={settings?.tagline ?? ''}
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
        </div>
      </div>

      {/* ── LOGO ── */}
      <div className="bg-white rounded-xl border p-5 space-y-4" style={{ borderColor: 'hsl(var(--border))' }}>
        <h2 className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>Logo</h2>

        <div className="flex items-start gap-6">
          <div className="space-y-2">
            <label className="text-xs font-medium block" style={{ color: 'hsl(var(--text-secondary))' }}>Logo Horizontal</label>
            <div className="w-40 h-14 rounded-lg border flex items-center justify-center overflow-hidden"
              style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--surface-raised))' }}>
              {(previewLogo || settings?.logo_url) ? (
                <img src={previewLogo || settings?.logo_url!} alt="Logo" className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>Belum ada</span>
              )}
            </div>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => {
              const file = e.target.files?.[0]; if (file) handleUpload(file, 'logo')
            }} />
            <button type="button" onClick={() => logoRef.current?.click()} disabled={uploading === 'logo'}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium disabled:opacity-60"
              style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-secondary))' }}>
              {uploading === 'logo' ? <Loader size={12} className="animate-spin" /> : <Upload size={12} />}
              Upload
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium block" style={{ color: 'hsl(var(--text-secondary))' }}>Ikon</label>
            <div className="w-12 h-12 rounded-lg border flex items-center justify-center overflow-hidden"
              style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--surface-raised))' }}>
              {(previewIcon || settings?.logo_icon_url) ? (
                <img src={previewIcon || settings?.logo_icon_url!} alt="Icon" className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>—</span>
              )}
            </div>
            <input ref={iconRef} type="file" accept="image/*" className="hidden" onChange={e => {
              const file = e.target.files?.[0]; if (file) handleUpload(file, 'icon')
            }} />
            <button type="button" onClick={() => iconRef.current?.click()} disabled={uploading === 'icon'}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium disabled:opacity-60"
              style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-secondary))' }}>
              {uploading === 'icon' ? <Loader size={12} className="animate-spin" /> : <Upload size={12} />}
              Upload
            </button>
          </div>
        </div>
      </div>

      {/* ── WARNA TEMA ── */}
      <div className="bg-white rounded-xl border p-5 space-y-4" style={{ borderColor: 'hsl(var(--border))' }}>
        <h2 className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>Warna Tema</h2>

        <div>
          <label className="text-xs font-medium mb-2 block" style={{ color: 'hsl(var(--text-secondary))' }}>Warna Utama (Primary)</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map(c => (
              <button key={c.hsl} type="button" onClick={() => setSelectedPrimary(c.hsl)}
                className="relative w-10 h-10 rounded-xl border-2 transition-all"
                style={{
                  background: `hsl(${c.hsl})`,
                  borderColor: selectedPrimary === c.hsl ? 'hsl(var(--foreground))' : 'transparent',
                  transform: selectedPrimary === c.hsl ? 'scale(1.1)' : 'scale(1)',
                }}>
                {selectedPrimary === c.hsl && (
                  <Check size={16} className="absolute inset-0 m-auto text-white drop-shadow-sm" />
                )}
              </button>
            ))}
          </div>
          <input type="hidden" name="primary_color" value={selectedPrimary} />
          <p className="text-xs mt-1.5" style={{ color: 'hsl(var(--text-muted))' }}>
            HSL: {selectedPrimary}
          </p>
        </div>

        <div>
          <label className="text-xs font-medium mb-2 block" style={{ color: 'hsl(var(--text-secondary))' }}>Warna Sidebar</label>
          <div className="flex flex-wrap gap-2">
            {SIDEBAR_COLORS.map(c => (
              <button key={c.hsl} type="button" onClick={() => setSelectedSidebar(c.hsl)}
                className="relative w-10 h-10 rounded-xl border-2 transition-all"
                style={{
                  background: `hsl(${c.hsl})`,
                  borderColor: selectedSidebar === c.hsl ? 'hsl(var(--foreground))' : 'transparent',
                  transform: selectedSidebar === c.hsl ? 'scale(1.1)' : 'scale(1)',
                }}>
                {selectedSidebar === c.hsl && (
                  <Check size={16} className="absolute inset-0 m-auto text-white drop-shadow-sm" />
                )}
              </button>
            ))}
          </div>
          <input type="hidden" name="sidebar_color" value={selectedSidebar} />
        </div>
      </div>

      {/* ── SOSIAL MEDIA ── */}
      <div className="bg-white rounded-xl border p-5 space-y-4" style={{ borderColor: 'hsl(var(--border))' }}>
        <h2 className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>Kontak & Media Sosial</h2>

        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'hsl(var(--text-secondary))' }}>WhatsApp</label>
          <input name="whatsapp" defaultValue={settings?.whatsapp ?? ''} placeholder="6281234567890"
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
        </div>

        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'hsl(var(--text-secondary))' }}>Instagram</label>
          <input name="instagram" defaultValue={settings?.instagram ?? ''} placeholder="eattie_bakery"
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
        </div>

        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'hsl(var(--text-secondary))' }}>Facebook</label>
          <input name="facebook" defaultValue={settings?.facebook ?? ''}
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
        </div>
      </div>

      {/* ── SUBMIT ── */}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all hover:opacity-90"
          style={{ background: 'hsl(var(--primary))' }}>
          {isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
        {state?.error && (
          <span className="text-xs text-red-600">{state.error}</span>
        )}
        {state?.success && (
          <span className="flex items-center gap-1 text-xs" style={{ color: 'hsl(var(--success))' }}>
            <Check size={14} /> Tersimpan
          </span>
        )}
      </div>
    </form>
  )
}
