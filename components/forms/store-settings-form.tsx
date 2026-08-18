'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { updateStoreSettings, uploadStoreLogo, type StoreSettings } from '@/actions/store-settings'
import { previewCssVariables } from '@/contexts/branding-context'
import { Upload, Check, Loader, Palette } from 'lucide-react'

interface Props {
  settings: StoreSettings | null
}

/** Parse "H S% L%" → nilai numerik, null kalau format salah. */
function parseHsl(value: string): { h: number; s: number; l: number } | null {
  const m = value.trim().match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/)
  if (!m) return null
  return { h: Number(m[1]), s: Number(m[2]), l: Number(m[3]) }
}

/** "H S% L%" → "#rrggbb" (fallback ke abu-abu kalau gagal parse). */
function hslToHex(hsl: string): string {
  const p = parseHsl(hsl)
  if (!p) return '#888888'
  const { h, s, l } = { h: p.h / 360, s: p.s / 100, l: p.l / 100 }
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h * 12) % 12
    const c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

/** "#rrggbb" → "H S% L%" (string HSL tanpa hsl()). */
function hexToHsl(hex: string): string {
  const m = hex.replace('#', '')
  const r = parseInt(m.slice(0, 2), 16) / 255
  const g = parseInt(m.slice(2, 4), 16) / 255
  const b = parseInt(m.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  const l = (max + min) / 2
  const d = max - min
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d) % 6; break
      case g: h = (b - r) / d + 2; break
      default: h = (r - g) / d + 4
    }
    h *= 60
    if (h < 0) h += 360
  }
  return `${h.toFixed(0)} ${(s * 100).toFixed(0)}% ${(l * 100).toFixed(0)}%`
}

/** Palet warna — campuran earthy/klasik bakery + pastel modern cafe. */
const PRIMARY_COLORS = [
  { label: 'Cokelat Hangat', hsl: '32 95% 44%', hex: '#c87e1a' },
  { label: 'Terracotta', hsl: '18 68% 48%', hex: '#c1622e' },
  { label: 'Oranye Susu', hsl: '28 85% 58%', hex: '#e8934a' },
  { label: 'Krem Karamel', hsl: '35 60% 52%', hex: '#c99a4a' },
  { label: 'Merah Marun', hsl: '345 52% 36%', hex: '#8a2e42' },
  { label: 'Merah Muda', hsl: '350 65% 52%', hex: '#d34a6e' },
  { label: 'Coral', hsl: '12 78% 56%', hex: '#e96a4a' },
  { label: 'Hijau Segar', hsl: '142 60% 38%', hex: '#2e7d4f' },
  { label: 'Hijau Sage', hsl: '120 25% 45%', hex: '#5a8560' },
  { label: 'Teal', hsl: '175 55% 38%', hex: '#2a8c82' },
  { label: 'Biru Laut', hsl: '210 60% 38%', hex: '#27639c' },
  { label: 'Biru Cerah', hsl: '205 85% 52%', hex: '#2ba3e8' },
  { label: 'Ungu Lembut', hsl: '270 40% 45%', hex: '#6b46a3' },
  { label: 'Ungu Tua', hsl: '280 55% 38%', hex: '#6a2f9e' },
  { label: 'Pink Muda', hsl: '340 65% 62%', hex: '#dd6f9a' },
  { label: 'Pink Flamingo', hsl: '330 75% 58%', hex: '#e85a9c' },
  { label: 'Mint Pastel', hsl: '165 40% 55%', hex: '#5cb894' },
  { label: 'Lavender', hsl: '260 45% 68%', hex: '#9683d6' },
  { label: 'Oranye Cerah', hsl: '24 90% 50%', hex: '#f0570a' },
  { label: 'Kuning Madu', hsl: '42 85% 50%', hex: '#e0a516' },
  { label: 'Kuning Lemon', hsl: '50 95% 55%', hex: '#f2d24a' },
  { label: 'Cokelat Cokelat', hsl: '25 45% 35%', hex: '#7a4a26' },
  { label: 'Hitam Jet', hsl: '0 0% 18%', hex: '#2e2e2e' },
  { label: 'Silver', hsl: '0 0% 55%', hex: '#8c8c8c' },
]

const NEUTRAL_DARK_COLORS = [
  { label: 'Merah Marun', hsl: '345 32% 18%' },
  { label: 'Marun Gelap', hsl: '345 40% 14%' },
  { label: 'Hijau Tua', hsl: '150 30% 18%' },
  { label: 'Hijau Hutan', hsl: '155 35% 14%' },
  { label: 'Biru Tua', hsl: '220 30% 18%' },
  { label: 'Navy', hsl: '225 45% 22%' },
  { label: 'Abu Gelap', hsl: '0 0% 15%' },
  { label: 'Abu Arang', hsl: '0 0% 22%' },
  { label: 'Cokelat Tua', hsl: '25 30% 12%' },
  { label: 'Kopi', hsl: '28 35% 16%' },
  { label: 'Ungu Tua', hsl: '270 25% 16%' },
  { label: 'Teal Gelap', hsl: '185 35% 16%' },
]

const BACKGROUND_COLORS = [
  { label: 'Krem Hangat', hsl: '35 35% 97%' },
  { label: 'Putih Bersih', hsl: '0 0% 100%' },
  { label: 'Beige Lembut', hsl: '30 30% 95%' },
  { label: 'Krem Muda', hsl: '40 40% 96%' },
  { label: 'Pink Sangat Muda', hsl: '340 30% 97%' },
  { label: 'Mint Sangat Muda', hsl: '150 25% 96%' },
  { label: 'Abu Terang', hsl: '210 15% 96%' },
  { label: 'Lavender Muda', hsl: '260 30% 97%' },
  { label: 'Biru Muda', hsl: '205 35% 96%' },
  { label: 'Peach Muda', hsl: '20 45% 96%' },
  { label: 'Kelabu Netral', hsl: '0 0% 96%' },
  { label: 'Krem Karamel Muda', hsl: '35 30% 94%' },
]

const TEXT_COLORS = [
  { label: 'Cokelat Gelap', hsl: '20 18% 14%' },
  { label: 'Hitam Lembut', hsl: '0 0% 12%' },
  { label: 'Abu Gelap', hsl: '220 10% 18%' },
  { label: 'Marun Gelap', hsl: '345 25% 16%' },
  { label: 'Cokelat Tua', hsl: '25 30% 18%' },
  { label: 'Hijau Tua', hsl: '150 25% 20%' },
  { label: 'Biru Tua', hsl: '220 35% 22%' },
  { label: 'Ungu Gelap', hsl: '270 25% 22%' },
  { label: 'Abu Sedang', hsl: '0 0% 28%' },
]

const LIGHT_NEUTRAL_TEXT = [
  { label: 'Krem Terang', hsl: '35 20% 90%' },
  { label: 'Putih', hsl: '0 0% 100%' },
  { label: 'Krem Pudar', hsl: '40 25% 88%' },
  { label: 'Mint Pudar', hsl: '150 20% 88%' },
  { label: 'Lavender Pudar', hsl: '260 25% 90%' },
  { label: 'Biru Pudar', hsl: '210 25% 90%' },
]

const SURFACE_OPTIONS = [
  { label: 'Putih', hsl: '0 0% 100%' },
  { label: 'Krem', hsl: '35 20% 98%' },
  { label: 'Krem Pudar', hsl: '40 30% 96%' },
  { label: 'Abu Sangat Muda', hsl: '210 15% 97%' },
  { label: 'Mint Muda', hsl: '150 25% 97%' },
  { label: 'Lavender Muda', hsl: '260 30% 98%' },
]

const BORDER_OPTIONS = [
  { label: 'Terang', hsl: '30 15% 88%' },
  { label: 'Sedang', hsl: '30 15% 80%' },
  { label: 'Gelap', hsl: '30 15% 72%' },
  { label: 'Abu', hsl: '210 12% 85%' },
  { label: 'Karamel', hsl: '35 25% 82%' },
  { label: 'Mint', hsl: '150 20% 84%' },
]

const SEMANTIC_COLORS = {
  success: [
    { label: 'Hijau Standar', hsl: '145 45% 34%' },
    { label: 'Hijau Sage', hsl: '120 30% 38%' },
    { label: 'Hijau Emerald', hsl: '152 55% 38%' },
    { label: 'Hijau Teal', hsl: '170 50% 36%' },
  ],
  danger: [
    { label: 'Merah Standar', hsl: '355 68% 46%' },
    { label: 'Merah Bata', hsl: '15 60% 46%' },
    { label: 'Merah Muda', hsl: '345 70% 50%' },
    { label: 'Merah Tua', hsl: '358 65% 40%' },
  ],
  warning: [
    { label: 'Kuning Standar', hsl: '38 82% 42%' },
    { label: 'Oranye Karamel', hsl: '28 75% 46%' },
    { label: 'Oranye Cerah', hsl: '25 90% 50%' },
    { label: 'Amber', hsl: '42 90% 48%' },
  ],
}

const FIELD_MAP: Record<string, string> = {
  primary_color: 'primaryColor',
  accent_color: 'accentColor',
  sidebar_color: 'sidebarColor',
  background_color: 'backgroundColor',
  surface_color: 'surfaceColor',
  text_color: 'textColor',
  text_muted_color: 'textMutedColor',
  border_color: 'borderColor',
  button_text_color: 'buttonTextColor',
  success_color: 'successColor',
  danger_color: 'dangerColor',
  warning_color: 'warningColor',
  sidebar_text_color: 'sidebarTextColor',
  footer_bg_color: 'footerBgColor',
  footer_text_color: 'footerTextColor',
  text_secondary_color: 'textSecondaryColor',
  accent_foreground_color: 'accentForegroundColor',
  surface_raised_color: 'surfaceRaisedColor',
}

const DEFAULT_COLORS: Record<string, string> = {
  primary_color: '32 95% 44%',
  accent_color: '38 55% 48%',
  sidebar_color: '345 32% 18%',
  background_color: '35 35% 97%',
  surface_color: '0 0% 100%',
  text_color: '20 18% 14%',
  text_muted_color: '20 10% 50%',
  text_secondary_color: '20 12% 35%',
  border_color: '30 15% 88%',
  button_text_color: '0 0% 100%',
  accent_foreground_color: '0 0% 100%',
  surface_raised_color: '35 30% 99%',
  success_color: '145 45% 34%',
  danger_color: '355 68% 46%',
  warning_color: '38 82% 42%',
  sidebar_text_color: '35 20% 90%',
  footer_bg_color: '345 32% 18%',
  footer_text_color: '35 20% 90%',
}

interface ColorSlot {
  key: string
  label: string
  options: { label: string; hsl: string }[]
}

const COLOR_SECTIONS: { title: string; slots: ColorSlot[] }[] = [
  {
    title: 'Warna Utama',
    slots: [
      { key: 'primary_color', label: 'Warna Tombol & Hero', options: PRIMARY_COLORS },
      { key: 'accent_color', label: 'Warna Aksen', options: PRIMARY_COLORS },
    ],
  },
  {
    title: 'Latar & Permukaan',
    slots: [
      { key: 'background_color', label: 'Latar Halaman', options: BACKGROUND_COLORS },
      { key: 'surface_color', label: 'Latar Kartu/Panel', options: SURFACE_OPTIONS },
      { key: 'border_color', label: 'Warna Garis Pembatas', options: BORDER_OPTIONS },
    ],
  },
  {
    title: 'Teks',
    slots: [
      { key: 'text_color', label: 'Warna Teks Utama', options: TEXT_COLORS },
      { key: 'text_muted_color', label: 'Warna Teks Sekunder', options: TEXT_COLORS },
    ],
  },
  {
    title: 'Teks & Permukaan Lanjutan',
    slots: [
      { key: 'text_secondary_color', label: 'Teks Deskripsi/Label', options: TEXT_COLORS },
      { key: 'accent_foreground_color', label: 'Teks di Atas Aksen', options: LIGHT_NEUTRAL_TEXT },
      { key: 'surface_raised_color', label: 'Latar Gambar/Highlight', options: SURFACE_OPTIONS },
    ],
  },
  {
    title: 'Sidebar Dashboard',
    slots: [
      { key: 'sidebar_color', label: 'Latar Sidebar', options: NEUTRAL_DARK_COLORS },
      { key: 'sidebar_text_color', label: 'Teks Sidebar', options: LIGHT_NEUTRAL_TEXT },
    ],
  },
  {
    title: 'Footer Toko Online',
    slots: [
      { key: 'footer_bg_color', label: 'Latar Footer', options: NEUTRAL_DARK_COLORS },
      { key: 'footer_text_color', label: 'Teks Footer', options: LIGHT_NEUTRAL_TEXT },
    ],
  },
  {
    title: 'Status & Notifikasi',
    slots: [
      { key: 'success_color', label: 'Warna Sukses', options: SEMANTIC_COLORS.success },
      { key: 'danger_color', label: 'Warna Bahaya/Batal', options: SEMANTIC_COLORS.danger },
      { key: 'warning_color', label: 'Warna Peringatan', options: SEMANTIC_COLORS.warning },
    ],
  },
]

export function StoreSettingsForm({ settings }: Props) {
  const [state, formAction, isPending] = useActionState(updateStoreSettings, null)
  const [uploading, setUploading] = useState<'logo' | 'icon' | null>(null)
  const [previewLogo, setPreviewLogo] = useState<string | null>(settings?.logo_url ?? null)
  const [previewIcon, setPreviewIcon] = useState<string | null>(settings?.logo_icon_url ?? null)
  const logoRef = useRef<HTMLInputElement>(null)
  const iconRef = useRef<HTMLInputElement>(null)

  const [colors, setColors] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const key of Object.keys(FIELD_MAP)) {
      initial[key] = (settings?.[key as keyof StoreSettings] as string) || DEFAULT_COLORS[key] || ''
    }
    return initial
  })

  const primaryHex = PRIMARY_COLORS.find(c => c.hsl === colors.primary_color)?.hex
    ?? settings?.primary_color_hex ?? '#c87e1a'

  function handlePick(fieldKey: string, hsl: string) {
    setColors(prev => ({ ...prev, [fieldKey]: hsl }))
    const cssKey = FIELD_MAP[fieldKey]
    previewCssVariables({ [cssKey]: hsl })
  }

  useEffect(() => {
    if (state?.success) {
      sessionStorage.removeItem('eattie-branding')
      const applied: Record<string, string> = {}
      for (const [dbKey, cssKey] of Object.entries(FIELD_MAP)) {
        if (colors[dbKey]) applied[cssKey] = colors[dbKey]
      }
      previewCssVariables(applied)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const handleUpload = async (file: File, type: 'logo' | 'icon') => {
    setUploading(type)
    const result = await uploadStoreLogo(file, type)
    setUploading(null)
    if (result.url) {
      if (type === 'logo') setPreviewLogo(result.url)
      else setPreviewIcon(result.url)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">

      <div className="bg-white rounded-2xl border p-5 space-y-4" style={{ borderColor: 'hsl(var(--border))' }}>
        <h3 className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>Logo Toko</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Logo Utama', preview: previewLogo, ref: logoRef, type: 'logo' as const },
            { label: 'Logo Ikon (kotak)', preview: previewIcon, ref: iconRef, type: 'icon' as const },
          ].map(({ label, preview, ref, type }) => (
            <div key={type}>
              <p className="text-xs font-medium mb-1.5" style={{ color: 'hsl(var(--text-muted))' }}>{label}</p>
              <button
                type="button"
                onClick={() => ref.current?.click()}
                disabled={uploading === type}
                className="w-full h-24 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors hover:bg-gray-50"
                style={{ borderColor: 'hsl(var(--border))' }}
              >
                {uploading === type ? (
                  <Loader size={18} className="animate-spin" style={{ color: 'hsl(var(--text-muted))' }} />
                ) : preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt={label} className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-1" style={{ color: 'hsl(var(--text-muted))' }}>
                    <Upload size={16} />
                    <span className="text-xs">Klik untuk upload</span>
                  </div>
                )}
              </button>
              <input
                ref={ref}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleUpload(file, type)
                }}
              />
            </div>
          ))}
        </div>
        <p className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
          Logo tersimpan otomatis begitu selesai diupload — tidak perlu klik &quot;Simpan&quot; di bawah.
        </p>
      </div>

      <form action={formAction} className="space-y-6">
        {Object.keys(FIELD_MAP).map(key => (
          <input key={key} type="hidden" name={key} value={colors[key] ?? ''} />
        ))}
        <input type="hidden" name="primary_color_hex" value={primaryHex} />

        <div className="bg-white rounded-2xl border p-5 space-y-4" style={{ borderColor: 'hsl(var(--border))' }}>
          <h3 className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>Info Toko</h3>
          {[
            { name: 'company_name', label: 'Nama Perusahaan', defaultValue: settings?.company_name },
            { name: 'short_name', label: 'Nama Singkat', defaultValue: settings?.short_name },
            { name: 'tagline', label: 'Tagline', defaultValue: settings?.tagline },
          ].map(f => (
            <div key={f.name}>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-secondary))' }}>{f.label}</label>
              <input
                name={f.name}
                defaultValue={f.defaultValue ?? ''}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ borderColor: 'hsl(var(--border))' }}
              />
            </div>
          ))}
          <div className="grid grid-cols-3 gap-3">
            {[
              { name: 'whatsapp', label: 'WhatsApp', defaultValue: settings?.whatsapp },
              { name: 'instagram', label: 'Instagram', defaultValue: settings?.instagram },
              { name: 'facebook', label: 'Facebook', defaultValue: settings?.facebook },
            ].map(f => (
              <div key={f.name}>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-secondary))' }}>{f.label}</label>
                <input
                  name={f.name}
                  defaultValue={f.defaultValue ?? ''}
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ borderColor: 'hsl(var(--border))' }}
                />
              </div>
            ))}
          </div>
        </div>

        {COLOR_SECTIONS.map(section => (
          <div key={section.title} className="bg-white rounded-2xl border p-5 space-y-4" style={{ borderColor: 'hsl(var(--border))' }}>
            <div className="flex items-center gap-2">
              <Palette size={14} style={{ color: 'hsl(var(--primary))' }} />
              <h3 className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>{section.title}</h3>
            </div>
            {section.slots.map(slot => (
              <div key={slot.key}>
                <p className="text-xs font-medium mb-2" style={{ color: 'hsl(var(--text-secondary))' }}>{slot.label}</p>
                <div className="flex flex-wrap gap-2">
                  {slot.options.map(opt => {
                    const isSelected = colors[slot.key] === opt.hsl
                    return (
                      <button
                        key={opt.hsl}
                        type="button"
                        onClick={() => handlePick(slot.key, opt.hsl)}
                        title={opt.label}
                        className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border-2 transition-all text-xs font-medium"
                        style={{
                          borderColor: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                          background: isSelected ? 'hsl(var(--primary-subtle))' : 'white',
                          color: 'hsl(var(--text-secondary))',
                        }}
                      >
                        <span
                          className="w-5 h-5 rounded-full border flex items-center justify-center shrink-0"
                          style={{ background: `hsl(${opt.hsl})`, borderColor: 'hsl(var(--border))' }}
                        >
                          {isSelected && <Check size={11} color="white" />}
                        </span>
                        {opt.label}
                      </button>
                    )
                  })}
                  <label
                    title="Warna kustom"
                    className="flex items-center gap-1.5 pl-1.5 pr-2 py-1.5 rounded-full border-2 cursor-pointer transition-all text-xs font-medium"
                    style={{
                      borderColor: 'hsl(var(--border))',
                      background: 'hsl(var(--surface-raised))',
                      color: 'hsl(var(--text-secondary))',
                    }}
                  >
                    <span
                      className="w-5 h-5 rounded-full border overflow-hidden shrink-0"
                      style={{ borderColor: 'hsl(var(--border))' }}
                    >
                      <input
                        type="color"
                        value={hslToHex(colors[slot.key])}
                        onChange={e => handlePick(slot.key, hexToHsl(e.target.value))}
                        className="w-7 h-7 -m-1 cursor-pointer border-0 p-0 bg-transparent"
                        aria-label={`Warna kustom ${slot.label}`}
                      />
                    </span>
                    Kustom
                  </label>
                </div>
              </div>
            ))}
          </div>
        ))}

        {state?.error && (
          <p className="text-sm px-4 py-2 rounded-lg" style={{ background: 'hsl(var(--danger-bg))', color: 'hsl(var(--danger))' }}>
            {state.error}
          </p>
        )}
        {state?.success && (
          <p className="text-sm px-4 py-2 rounded-lg" style={{ background: 'hsl(var(--success-bg))', color: 'hsl(var(--success))' }}>
            ✓ Pengaturan tersimpan &amp; sudah diterapkan
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60"
          style={{ background: 'hsl(var(--primary))' }}
        >
          {isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
      </form>
    </div>
  )
}
