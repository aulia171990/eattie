import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { id as localeId, enUS } from 'date-fns/locale'

// Tailwind class merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Currency formatter (Indonesian Rupiah)
export function formatCurrency(amount: number, locale: string = 'id'): string {
  return new Intl.NumberFormat(locale === 'id' ? 'id-ID' : 'en-US', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Number formatter
export function formatCompact(amount: number): string {
  if (amount >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1).replace('.', ',')}M`
  if (amount >= 1_000_000)     return `Rp ${(amount / 1_000_000).toFixed(1).replace('.', ',')}jt`
  if (amount >= 1_000)         return `Rp ${(amount / 1_000).toFixed(0)}rb`
  return `Rp ${amount.toFixed(0)}`
}

export function formatNumber(num: number, decimals: number = 0): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

// Date formatter
export function formatDate(
  date: string | Date,
  formatStr: string = 'dd MMM yyyy',
  locale: string = 'id'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, formatStr, {
    locale: locale === 'id' ? localeId : enUS,
  })
}

// Relative time formatter
export function formatRelativeTime(date: string | Date, locale: string = 'id'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(dateObj, {
    addSuffix: true,
    locale: locale === 'id' ? localeId : enUS,
  })
}

// Date time formatter
export function formatDateTime(date: string | Date, locale: string = 'id'): string {
  return formatDate(date, 'dd MMM yyyy, HH:mm', locale)
}

// Generate invoice/PO number: INV-YYYYMMDD-XXX
export function generateInvoiceNumber(prefix: string = 'INV'): string {
  const now = new Date()
  const date = format(now, 'yyyyMMdd')
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `${prefix}-${date}-${random}`
}

// Truncate text
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}

// Calculate percentage change
export function percentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

// Stock status
export function getStockStatus(
  current: number,
  min: number,
  reorderPoint: number | null
): 'normal' | 'low' | 'critical' | 'out' {
  if (current <= 0) return 'out'
  if (current <= min) return 'critical'
  if (reorderPoint && current <= reorderPoint) return 'low'
  return 'normal'
}

// Stock status label
export function getStockStatusLabel(status: string, locale: string = 'id'): string {
  const labels: Record<string, Record<string, string>> = {
    id: {
      normal: 'Normal',
      low: 'Hampir Habis',
      critical: 'Kritis',
      out: 'Habis',
    },
    en: {
      normal: 'Normal',
      low: 'Low Stock',
      critical: 'Critical',
      out: 'Out of Stock',
    },
  }
  return labels[locale]?.[status] ?? status
}

// Payment method label
export function getPaymentMethodLabel(method: string, locale: string = 'id'): string {
  const labels: Record<string, Record<string, string>> = {
    id: {
      cash: 'Tunai',
      card: 'Kartu',
      transfer: 'Transfer',
      qris: 'QRIS',
    },
    en: {
      cash: 'Cash',
      card: 'Card',
      transfer: 'Transfer',
      qris: 'QRIS',
    },
  }
  return labels[locale]?.[method] ?? method
}

// Production status label
export function getProductionStatusLabel(status: string, locale: string = 'id'): string {
  const labels: Record<string, Record<string, string>> = {
    id: {
      planned: 'Direncanakan',
      in_progress: 'Berlangsung',
      completed: 'Selesai',
      cancelled: 'Dibatalkan',
    },
    en: {
      planned: 'Planned',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    },
  }
  return labels[locale]?.[status] ?? status
}

// Debounce helper
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

// Sleep helper for loading states
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
