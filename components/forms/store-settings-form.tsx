'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { updateStoreSettings, uploadStoreLogo, type StoreSettings } from '@/actions/store-settings'
import { previewCssVariables } from '@/contexts/branding-context'
import { Upload, Check, Loader, Palette } from 'lucide-react'

interface Props {
  settings: StoreSettings | null
}

/** Palet warna — campuran earthy/klasik bakery + pastel modern cafe. */
const PRIMARY_COLORS = [
  { label: 'Cokelat Hangat', hsl: '32 95% 44%', hex: '#c87e1a' },
  { label: 'Terracotta', hsl: '18 68% 48%', hex: '#c1622e' },
  { label: 'Oranye Susu', hsl: '28 85% 58%', hex: '#e8934a' },
  { label: 'Krem Karamel', hsl: '35 60% 52%', hex: '#c99a4a' },
  { label: 'Merah Marun', hsl: '345 52% 36%', hex: '#8a2e42' },
  { label: 'Hijau Segar', hsl: '142 60% 38%', hex: '#2e7d4f' },
  { label: 'Hijau Sage', hsl: '120 25% 45%', hex: '#5a8560' },
  { label: 'Biru Laut', hsl: '210 60% 38%', hex: '#27639c' },
  { label: 'Ungu Lembut', hsl: '270 40% 45%', hex: '#6b46a3' },
  { label: 'Pink Muda', hsl: '340 65% 62%', hex: '#dd6f9a' },
  { label: 'Mint Pastel', hsl: '165 40% 55%', hex: '#5cb894' },
  { label: 'Lavender', hsl: '260 45% 68%', hex: '#9683d6' },
  { label: 'Oranye Cerah', hsl: '24 90% 50%', hex: '#f0570a' },
  { label: 'Kuning Madu', hsl: '42 85% 50%', hex: '#e0a516' },
]

const NEUTRAL_DARK_COLORS = [
  { label: 'Merah Marun', hsl: '345 32% 18%' },
  { label: 'Hijau Tua', hsl: '150 30% 18%' },
  { label: 'Biru Tua', hsl: '220 30% 18%' },
  { label: 'Abu Gelap', hsl: '0 0% 15%' },
  { label: 'Cokelat Tua', hsl: '25 30% 12%' },
  { label: 'Ungu Tua', hsl: '270 25% 16%' },
]

const BACKGROUND_COLORS = [
  { label: 'Krem Hangat', hsl: '35 35% 97%' },
  { label: 'Putih Bersih', hsl: '0 0% 100%' },
  { label: 'Beige Lembut', hsl: '30 30% 95%' },
  { label: 'Pink Sangat Muda', hsl: '340 30% 97%' },
  { label: 'Mint Sangat Muda', hsl: '150 25% 96%' },
  { label: 'Abu Terang', hsl: '210 15% 96%' },
]

const TEXT_COLORS = [
  { label: 'Cokelat Gelap', hsl: '20 18% 14%' },
  { label: 'Hitam Lembut', hsl: '0 0% 12%' },
  { label: 'Abu Gelap', hsl: '220 10% 18%' },
  { label: 'Marun Gelap', hsl: '345 25% 16%' },
]

const LIGHT_NEUTRAL_TEXT = [
  { label: 'Krem Terang', hsl: '35 20% 90%' },
  { label: 'Putih', hsl: '0 0% 100%' },
]

const SURFACE_OPTIONS = [
  { label: 'Putih', hsl: '0 0% 100%' },
  { label: 'Krem', hsl: '35 20% 98%' },
]

const BORDER_OPTIONS = [
  { label: 'Terang', hsl: '30 15% 88%' },
  { label: 'Sedang', hsl: '30 15% 80%' },
]

const SEMANTIC_COLORS = {
  success: [
    { label: 'Hijau Standar', hsl: '145 45% 34%' },
    { label: 'Hijau Sage', hsl: '120 30% 38%' },
  ],
  danger: [
    { label: 'Merah Standar', hsl: '355 68% 46%' },
    { label: 'Merah Bata', hsl: '15 60% 46%' },
  ],
  warning: [
    { label: 'Kuning Standar', hsl: '38 82% 42%' },
    { label: 'Oranye Karamel', hsl: '28 75% 46%' },
  ],
}

const FIELD_MAP: Record<string, string> = {
  primary_color: 'primaryColor',
  sidebar_color: 'sidebarColor',
  background_color: 'backgroundColor',
  surface_color: 'surfaceColor',
  text_color: 'textColor',
  border_color: 'borderColor',
  success_color: 'successColor',
  danger_color: 'dangerColor',
  warning_color: 'warningColor',
  sidebar_text_color: 'sidebarTextColor',
  footer_bg_color: 'footerBgColor',
  footer_text_color: 'footerTextColor',
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
      { key: 'primary_color', label: 'Warna Tombol & Aksen', options: PRIMARY_COLORS },
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
      initial[key] = (settings?.[key as keyof StoreSettings] as string) ?? ''
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
