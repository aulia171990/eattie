/**
 * EATTIE DESIGN SYSTEM — BRANDING
 *
 * Single source of truth for brand identity.
 * Update this file to rebrand the entire application.
 *
 * Phase 1: Architecture prepared.
 * Phase 2: Replace emoji logos with SVG files in public/branding/
 */

export const BRANDING = {
  /** Full company name */
  companyName: 'eattie by Ana',

  /** Short name — used in navbar, sidebar, title */
  shortName: 'eattie',

  /** Tagline */
  tagline: 'Roti & Kue Segar, Dipesan, Dibuat, Diantar',

  /** Logo paths — replace emoji with SVG in Phase 2 */
  logo:       '/branding/logo.svg',
  logoWhite:  '/branding/logo-white.svg',
  logoIcon:   '/branding/logo-icon.svg',

  /** Favicon */
  favicon: '/branding/favicon.ico',

  /** Emoji fallback — used until SVG logos are ready */
  logoEmoji: '/branding/logo.svg',

  /** Brand colors (mirrors CSS variables — for use in JS/TS) */
  colors: {
    primary:    'hsl(32, 95%, 44%)',
    primaryHex: '#c87e1a',
    dark:       'hsl(25, 30%, 12%)',
    darkHex:    '#221409',
  },

  /** Contact */
  whatsapp: process.env.NEXT_PUBLIC_STORE_WHATSAPP ?? '',

  /** Social */
  instagram: '',
  facebook:  '',
} as const

export type BrandingConfig = typeof BRANDING
