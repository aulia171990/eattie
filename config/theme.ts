/**
 * EATTIE DESIGN SYSTEM — THEME CONFIG
 *
 * Reusable UI constants that reference CSS variables.
 * Use these in components instead of hardcoded values.
 *
 * Example:
 *   import { THEME } from '@/config/theme'
 *   <div style={{ borderRadius: THEME.radius.xl }}>
 */

export const THEME = {
  /** Border radius presets */
  radius: {
    sm:   '6px',
    md:   '8px',
    base: '10px',
    lg:   '14px',
    xl:   '16px',
    '2xl':'20px',
    '3xl':'24px',
    '4xl':'28px',
    '5xl':'32px',
    full: '9999px',
  },

  /** Shadow presets — reference CSS variables */
  shadow: {
    card:        'var(--shadow-card)',
    cardHover:   'var(--shadow-card-hover)',
    modal:       'var(--shadow-modal)',
    dropdown:    'var(--shadow-dropdown)',
    floating:    'var(--shadow-floating)',
    primary:     'var(--shadow-primary)',
  },

  /** Transition presets */
  transition: {
    default:   'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    fast:      'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    colors:    'color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease',
    transform: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  /** Z-index scale */
  zIndex: {
    dropdown: 20,
    sticky:   30,
    overlay:  40,
    modal:    50,
    toast:    60,
    tooltip:  70,
  },

  /** Semantic color references (CSS variable wrappers) */
  color: {
    primary:         'hsl(var(--primary))',
    primaryHover:    'hsl(var(--primary-hover))',
    primarySubtle:   'hsl(var(--primary-subtle))',
    background:      'hsl(var(--background))',
    surface:         'hsl(var(--surface))',
    border:          'hsl(var(--border))',
    text:            'hsl(var(--foreground))',
    textSecondary:   'hsl(var(--text-secondary))',
    textMuted:       'hsl(var(--text-muted))',
    success:         'hsl(var(--success))',
    successBg:       'hsl(var(--success-bg))',
    warning:         'hsl(var(--warning))',
    warningBg:       'hsl(var(--warning-bg))',
    danger:          'hsl(var(--danger))',
    dangerBg:        'hsl(var(--danger-bg))',
    info:            'hsl(var(--info))',
    infoBg:          'hsl(var(--info-bg))',
  },

  /** Typography */
  font: {
    sans:    'var(--font-sans)',
    display: 'var(--font-display)',
    mono:    'var(--font-mono)',
  },
} as const

export type ThemeConfig = typeof THEME
