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
  whatsapp: BRANDING.whatsapp,
  instagram: BRANDING.instagram,
  facebook: BRANDING.facebook,
}

const BrandingContext = createContext<BrandingValue>(defaultBranding)

export function useBranding() {
  return useContext(BrandingContext)
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

function applyCssVariables(b: BrandingValue) {
  const root = document.documentElement
  if (b.primaryColor) root.style.setProperty('--primary', b.primaryColor)
  if (b.accentColor) root.style.setProperty('--accent', b.accentColor)
  if (b.sidebarColor) root.style.setProperty('--sidebar-bg', b.sidebarColor)
}
