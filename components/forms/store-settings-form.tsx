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

/** Luminance relatif (WCAG) dari sebuah HSL string, range 0..1. */
function relativeLuminance(hsl: string): number {
  const p = parseHsl(hsl)
  if (!p) return 0.2
  const { h, s, l } = { h: p.h / 360, s: p.s / 100, l: p.l / 100 }
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h * 12) % 12
    const c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))
    return c
  }
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  const r = lin(f(0))
  const g = lin(f(8))
  const b = lin(f(4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Rasio kontras WCAG (1..21) antara dua HSL string. */
function contrastRatio(hsl1: string, hsl2: string): number {
  const l1 = relativeLuminance(hsl1)
  const l2 = relativeLuminance(hsl2)
  const light = Math.max(l1, l2)
  const dark = Math.min(l1, l2)
  return (light + 0.05) / (dark + 0.05)
}

/** Palet warna — 6 warna utama bakery simple-luxury */
const PRIMARY_COLORS = [
  { label: 'Cokelat Hangat', hsl: '32 95% 44%', hex: '#c87e1a' },
  { label: 'Krem Karamel', hsl: '35 60% 52%', hex: '#c99a4a' },
  { label: 'Cokelat Cokelat', hsl: '25 45% 35%', hex: '#7a4a26' },
  { label: 'Terakota', hsl: '18 68% 48%', hex: '#c1622e' },
  { label: 'Merah Marun', hsl: '345 52% 36%', hex: '#8a2e42' },
  { label: 'Beige Lembut', hsl: '30 20% 70%', hex: '#b8a789' },
]

/** Warna netral & pendukung (lebih sedikit pilihan, terkonsentrasi) */
const NEUTRAL_DARK_COLORS = [
  { label: 'Cokelat Tua', hsl: '25 30% 12%' },
  { label: 'Terakota Tua', hsl: '18 40% 16%' },
  { label: 'Merah Marun', hsl: '345 32% 18%' },
]

const BACKGROUND_COLORS = [
  { label: 'Beige Lembut', hsl: '30 20% 70%' },
  { label: 'Putih Bersih', hsl: '0 0% 100%' },
  { label: 'Krem Hangat', hsl: '35 35% 97%' },
]

const TEXT_COLORS = [
  { label: 'Cokelat Tua', hsl: '25 30% 18%' },
  { label: 'Hitam Lembut', hsl: '0 0% 12%' },
]

const LIGHT_NEUTRAL_TEXT = [
  { label: 'Putih', hsl: '0 0% 100%' },
  { label: 'Beige Lembut', hsl: '30 20% 90%' },
]

const SURFACE_OPTIONS = [
  { label: 'Putih', hsl: '0 0% 100%' },
  { label: 'Krem Hangat', hsl: '35 20% 98%' },
  { label: 'Beige Lembut', hsl: '30 15% 95%' },
]

const BORDER_OPTIONS = [
  { label: 'Terakota', hsl: '18 20% 85%' },
  { label: 'Beige Lembut', hsl: '30 15% 80%' },
  { label: 'Abu Terracotta', hsl: '0 0% 88%' },
]
/** Status & Notifikasi */
const SEMANTIC_COLORS = {
  success: [
    { label: 'Hijau Standar', hsl: '145 45% 34%' },
    { label: 'Hijau Sage', hsl: '120 30% 38%' },
    { label: 'Hijau Emerald', hsl: '152 55% 38%' },
  ],
  danger: [
    { label: 'Merah Standar', hsl: '355 68% 46%' },
    { label: 'Merah Bata', hsl: '15 60% 46%' },
    { label: 'Merah Tua', hsl: '358 65% 40%' },
  ],
  warning: [
    { label: 'Kuning Standar', hsl: '38 82% 42%' },
    { label: 'Oranye Karamel', hsl: '28 75% 46%' },
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
  accent_color: '35 60% 52%',
  sidebar_color: '18 68% 48%',
  background_color: '30 20% 70%',
  surface_color: '0 0% 100%',
  text_color: '25 30% 18%',
  text_muted_color: '25 30% 18%',
  text_secondary_color: '25 30% 18%',
  border_color: '18 20% 85%',
  button_text_color: '0 0% 100%',
  accent_foreground_color: '0 0% 100%',
  surface_raised_color: '35 20% 98%',
  success_color: '145 45% 34%',
  danger_color: '355 68% 46%',
  warning_color: '38 82% 42%',
  sidebar_text_color: '35 20% 90%',
  footer_bg_color: '18 32% 18%',
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

/**
 * Kontrol pemilih warna kustom — modern & sederhana.
 * Tombol swatch membuka popover berisi pemilih warna native + input hex
 * (bisa diketik/ditempel) dan bacaannya dalam HSL. Mengubah salah satu
 * langsung memanggil onPick.
 */
function CustomColorSwatch({ hsl, onPick }: { hsl: string; onPick: (hsl: string) => void }) {
  const hex = hslToHex(hsl)
  const [text, setText] = useState(hex)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setText(hslToHex(hsl)) }, [hsl])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function commitHex(value: string) {
    const v = value.trim().replace(/^#/, '')
    if (/^[0-9a-fA-F]{6}$/.test(v)) {
      const full = `#${v}`
      onPick(hexToHsl(full))
      setText(full)
    } else {
      setText(hex)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title="Warna kustom"
        className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border-2 transition-all text-xs font-medium"
        style={{ borderColor: 'hsl(var(--border))', background: 'white', color: 'hsl(var(--text-secondary))' }}
      >
        <span
          className="w-5 h-5 rounded-full border shrink-0"
          style={{ background: `hsl(${hsl})`, borderColor: 'hsl(var(--border))' }}
        />
        Kustom
      </button>

      {open && (
        <div
          className="absolute z-20 mt-2 p-3 rounded-xl border bg-white shadow-lg space-y-2 w-56"
          style={{ borderColor: 'hsl(var(--border))' }}
        >
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={hex}
              onChange={e => { onPick(hexToHsl(e.target.value)); setText(e.target.value) }}
              className="w-10 h-10 rounded-lg border-0 cursor-pointer p-0 bg-transparent shrink-0"
              aria-label="Pilih warna"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: 'hsl(var(--text-muted))' }}>Hex</p>
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                onBlur={() => commitHex(text)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    commitHex(text)
                    ;(e.target as HTMLInputElement).blur()
                  }
                }}
                className="w-full px-2 py-1 text-xs rounded-md border outline-none font-mono"
                style={{ borderColor: 'hsl(var(--border))' }}
                placeholder="#c87e1a"
                spellCheck={false}
              />
            </div>
          </div>
          <p className="text-[10px] font-mono" style={{ color: 'hsl(var(--text-muted))' }}>HSL: {hsl}</p>
          <div className="pt-2 border-t space-y-1" style={{ borderColor: 'hsl(var(--border))' }}>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: 'hsl(var(--text-muted))' }}>Kontras teks</p>
            <ContrastRow label="vs Teks Putih" bg={hsl} fg="0 0% 100%" />
            <ContrastRow label="vs Teks Gelap" bg={hsl} fg="0 0% 12%" />
          </div>
        </div>
      )}
    </div>
  )
}

/** Baris info rasio kontras WCAG — membantu memilih warna teks yang mudah dibaca. */
function ContrastRow({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  const ratio = contrastRatio(bg, fg)
  const pass = ratio >= 4.5
  const largePass = ratio >= 3
  const badgeBg = pass ? '#15803d' : largePass ? '#b45309' : '#b91c1c'
  return (
    <div className="flex items-center justify-between text-[10px] font-mono">
      <span style={{ color: 'hsl(var(--text-muted))' }}>{label}</span>
      <span className="flex items-center gap-1">
        <span style={{ color: 'hsl(var(--text-muted))' }}>{ratio.toFixed(2)}:1</span>
        <span className="px-1 rounded text-white" style={{ background: badgeBg }}>
          {pass ? 'AA' : largePass ? 'AA·' : '✗'}
        </span>
      </span>
    </div>
  )
}

export function StoreSettingsForm({ settings }: Props) {
  const [state, formAction, isPending] = useActionState(updateStoreSettings, null)
  const [uploading, setUploading] = useState<'logo' | 'icon' | null>(null)
  const [previewLogo, setPreviewLogo] = useState<string | null>(settings?.logo_url ?? null)
  const [previewIcon, setPreviewIcon] = useState<string | null>(settings?.logo_icon_url ?? null)
  const logoRef = useRef<HTMLInputElement>(null)
  const iconRef = useRef<HTMLInputElement>(null)
  const savedRef = useRef(false)

  const [colors, setColors] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const key of Object.keys(FIELD_MAP)) {
      initial[key] = (settings?.[key as keyof StoreSettings] as string) || DEFAULT_COLORS[key] || ''
    }
    return initial
  })

  const primaryHex = hslToHex(colors.primary_color)

  function handlePick(fieldKey: string, hsl: string) {
    setColors(prev => ({ ...prev, [fieldKey]: hsl }))
    const cssKey = FIELD_MAP[fieldKey]
    previewCssVariables({ [cssKey]: hsl })
  }

  const initialColors = useRef<Record<string, string>>(
    (() => {
      const init: Record<string, string> = {}
      for (const key of Object.keys(FIELD_MAP)) {
        init[key] = (settings?.[key as keyof StoreSettings] as string) || DEFAULT_COLORS[key] || ''
      }
      return init
    })()
  )

  useEffect(() => {
    if (state?.success) {
      savedRef.current = true
      sessionStorage.removeItem('eattie-branding')
      const applied: Record<string, string> = {}
      for (const [dbKey, cssKey] of Object.entries(FIELD_MAP)) {
        if (colors[dbKey]) applied[cssKey] = colors[dbKey]
      }
      previewCssVariables(applied)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  // Restore the originally-loaded colors when leaving the page so a live
  // preview that was never saved doesn't leak into the rest of the app.
  useEffect(() => {
    return () => {
      if (savedRef.current) return
      const applied: Record<string, string> = {}
      for (const [dbKey, cssKey] of Object.entries(FIELD_MAP)) {
        if (initialColors.current[dbKey]) applied[cssKey] = initialColors.current[dbKey]
      }
      previewCssVariables(applied)
    }
  }, [])

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
                  <CustomColorSwatch
                    hsl={colors[slot.key]}
                    onPick={(hsl) => handlePick(slot.key, hsl)}
                  />
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
