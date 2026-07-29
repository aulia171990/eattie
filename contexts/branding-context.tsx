'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { BRANDING } from '@/config/branding'
import { getStoreSettings } from '@/actions/store-settings'
import type { StoreSettings } from '@/actions/store-settings'

export interface BrandingValue {
  companyName: string
  shortName: string
  tagline: string
  logoUrl: string | null
  logoIconUrl: string | null
  faviconUrl: string | null
  primaryColor: string
  primaryColorHex: string
  accentColor: string
  sidebarColor: string
  backgroundColor: string
  surfaceColor: string
  textColor: string
  textMutedColor: string
  borderColor: string
  buttonTextColor: string
  successColor: string
  dangerColor: string
  warningColor: string
  sidebarTextColor: string
  footerBgColor: string
  footerTextColor: string
  whatsapp: string
  instagram: string
  facebook: string
}

const defaultBranding: BrandingValue = {
  companyName: BRANDING.companyName,
  shortName: BRANDING.shortName,
  tagline: BRANDING.tagline,
  logoUrl: null,
  logoIconUrl: null,
  faviconUrl: null,
  primaryColor: BRANDING.colors.primary,
  primaryColorHex: BRANDING.colors.primaryHex,
  accentColor: '38 55% 48%',
  sidebarColor: '345 32% 18%',
  backgroundColor: '35 35% 97%',
  surfaceColor: '0 0% 100%',
  textColor: '20 18% 14%',
  textMutedColor: '20 10% 50%',
  borderColor: '30 15% 88%',
  buttonTextColor: '0 0% 100%',
  successColor: '145 45% 34%',
  dangerColor: '355 68% 46%',
  warningColor: '38 82% 42%',
  sidebarTextColor: '35 20% 90%',
  footerBgColor: '345 32% 18%',
  footerTextColor: '35 20% 90%',
  whatsapp: BRANDING.whatsapp,
  instagram: BRANDING.instagram,
  facebook: BRANDING.facebook,
}

const BrandingContext = createContext<BrandingValue>(defaultBranding)

export function useBranding() {
  return useContext(BrandingContext)
}

/**
 * Parse string "H S% L%" jadi angka terpisah. Return null kalau formatnya
 * tidak sesuai — supaya tidak crash kalau ada data lama/aneh di database.
 */
function parseHsl(value: string): { h: number; s: number; l: number } | null {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/)
  if (!match) return null
  return { h: Number(match[1]), s: Number(match[2]), l: Number(match[3]) }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

/**
 * Hitung warna hover & subtle dari primary color secara otomatis.
 * - hover: sedikit lebih gelap, dipakai untuk hover tombol
 * - subtle: sangat terang + saturasi rendah, dipakai untuk background
 *   highlight/badge (misal border swatch warna terpilih di form settings)
 *
 * Di-clamp supaya tidak ekstrem untuk warna yang sudah sangat terang
 * (pastel) atau sangat gelap sekalipun.
 */
function deriveShades(primaryHsl: string): { hover: string; subtle: string } | null {
  const parsed = parseHsl(primaryHsl)
  if (!parsed) return null
  const { h, s, l } = parsed

  const hoverL = clamp(l - 10, 15, 85)
  const hoverS = clamp(s, 20, 100)
  const hover = `${h} ${hoverS}% ${hoverL}%`

  const subtleL = clamp(l + (100 - l) * 0.85, 88, 97)
  const subtleS = clamp(s * 0.5, 15, 60)
  const subtle = `${h} ${subtleS}% ${subtleL}%`

  return { hover, subtle }
}

/**
 * Terapkan warna baru secara langsung ke halaman yang sedang aktif,
 * tanpa perlu reload. Dipakai oleh form Settings untuk live preview
 * saat owner memilih warna, dan untuk update instan setelah submit.
 * Hanya field yang disebut di `partial` yang berubah — field lain
 * TIDAK direset ke default.
 */
export function previewCssVariables(partial: Partial<BrandingValue>) {
  applyCssVariables(partial)
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<BrandingValue>(defaultBranding)

  useEffect(() => {
    const stored = sessionStorage.getItem('eattie-branding')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setBranding(parsed)
        applyCssVariables(parsed)
        return
      } catch { /* ignore */ }
    }

    getStoreSettings().then((settings: StoreSettings | null) => {
      if (!settings) return
      const value: BrandingValue = {
        companyName: settings.company_name,
        shortName: settings.short_name,
        tagline: settings.tagline,
        logoUrl: settings.logo_url,
        logoIconUrl: settings.logo_icon_url,
        faviconUrl: settings.favicon_url,
        primaryColor: settings.primary_color,
        primaryColorHex: settings.primary_color_hex,
        accentColor: settings.accent_color,
        sidebarColor: settings.sidebar_color,
        backgroundColor: settings.background_color,
        surfaceColor: settings.surface_color,
        textColor: settings.text_color,
        textMutedColor: settings.text_muted_color,
        borderColor: settings.border_color,
        buttonTextColor: settings.button_text_color,
        successColor: settings.success_color,
        dangerColor: settings.danger_color,
        warningColor: settings.warning_color,
        sidebarTextColor: settings.sidebar_text_color,
        footerBgColor: settings.footer_bg_color,
        footerTextColor: settings.footer_text_color,
        whatsapp: settings.whatsapp,
        instagram: settings.instagram,
        facebook: settings.facebook,
      }
      setBranding(value)
      applyCssVariables(value)
      sessionStorage.setItem('eattie-branding', JSON.stringify(value))
    })
  }, [])

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  )
}

function applyCssVariables(b: Partial<BrandingValue>) {
  const root = document.documentElement
  if (b.primaryColor) {
    root.style.setProperty('--primary', b.primaryColor)
    const shades = deriveShades(b.primaryColor)
    if (shades) {
      root.style.setProperty('--primary-hover', shades.hover)
      root.style.setProperty('--primary-subtle', shades.subtle)
    }
  }
  if (b.accentColor)       root.style.setProperty('--accent', b.accentColor)
  if (b.sidebarColor)      root.style.setProperty('--sidebar-bg', b.sidebarColor)
  if (b.backgroundColor)   root.style.setProperty('--background', b.backgroundColor)
  if (b.surfaceColor)      root.style.setProperty('--surface', b.surfaceColor)
  if (b.textColor)         root.style.setProperty('--foreground', b.textColor)
  if (b.textMutedColor)    root.style.setProperty('--text-muted', b.textMutedColor)
  if (b.borderColor)       root.style.setProperty('--border', b.borderColor)
  if (b.buttonTextColor)   root.style.setProperty('--primary-foreground', b.buttonTextColor)
  if (b.successColor)      root.style.setProperty('--success', b.successColor)
  if (b.dangerColor)       root.style.setProperty('--danger', b.dangerColor)
  if (b.warningColor)      root.style.setProperty('--warning', b.warningColor)
  if (b.sidebarTextColor)  root.style.setProperty('--sidebar-text', b.sidebarTextColor)
  if (b.footerBgColor)     root.style.setProperty('--footer-bg', b.footerBgColor)
  if (b.footerTextColor)   root.style.setProperty('--footer-text', b.footerTextColor)
}
