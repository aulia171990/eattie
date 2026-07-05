/**
 * EATTIE DESIGN SYSTEM — BRANDING
 * Single source of truth for brand identity.
 */

export const BRANDING = {
  companyName: 'Eattie Bakery',
  shortName:   'Eattie',
  tagline:     'Roti & Kue Segar, Dipesan, Dibuat, Diantar',

  /** Square icon — use on light backgrounds (has maroon bg) */
  logoIcon:      '/branding/logo-icon.svg',

  /** Square icon transparent — use on dark/colored backgrounds */
  logoIconWhite: '/branding/logo-icon-white.svg',

  /** Square icon transparent — use on white/light backgrounds */
  logoIconDark:  '/branding/logo-icon-dark.svg',

  /** Horizontal wordmark — use where horizontal space available */
  logo:          '/branding/logo.svg',

  /** Horizontal wordmark with light background */
  logoWhite:     '/branding/logo-white.svg',

  favicon: '/branding/favicon.ico',

  /** Emoji fallback — used in receipt template (print) */
  logoEmoji: '🍞',

  colors: {
    primary:    'hsl(32, 95%, 44%)',
    primaryHex: '#c87e1a',
    dark:       'hsl(25, 30%, 12%)',
    darkHex:    '#221409',
  },

  whatsapp:  process.env.NEXT_PUBLIC_STORE_WHATSAPP ?? '',
  instagram: '',
  facebook:  '',
} as const

export type BrandingConfig = typeof BRANDING
