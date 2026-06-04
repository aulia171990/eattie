import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gray'

const variantMap: Record<BadgeVariant, string> = {
  default: 'bg-amber-100 text-amber-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-800',
  gray: 'bg-gray-100 text-gray-600',
}

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      variantMap[variant],
      className
    )}>
      {children}
    </span>
  )
}

// Status-specific helpers
export function ProductionStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    planned: { label: 'Direncanakan', variant: 'info' },
    in_progress: { label: 'Berlangsung', variant: 'warning' },
    completed: { label: 'Selesai', variant: 'success' },
    cancelled: { label: 'Dibatalkan', variant: 'danger' },
  }
  const s = map[status] ?? { label: status, variant: 'gray' as BadgeVariant }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

export function PurchaseStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    draft: { label: 'Draft', variant: 'gray' },
    ordered: { label: 'Dipesan', variant: 'info' },
    received: { label: 'Diterima', variant: 'success' },
    cancelled: { label: 'Dibatalkan', variant: 'danger' },
  }
  const s = map[status] ?? { label: status, variant: 'gray' as BadgeVariant }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

export function StockStatusBadge({ current, min }: { current: number; min: number }) {
  if (current <= 0) return <Badge variant="danger">Habis</Badge>
  if (current <= min) return <Badge variant="danger">Kritis</Badge>
  if (current <= min * 1.5) return <Badge variant="warning">Rendah</Badge>
  return <Badge variant="success">Normal</Badge>
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    unpaid: { label: 'Belum Bayar', variant: 'danger' },
    partial: { label: 'Sebagian', variant: 'warning' },
    paid: { label: 'Lunas', variant: 'success' },
  }
  const s = map[status] ?? { label: status, variant: 'gray' as BadgeVariant }
  return <Badge variant={s.variant}>{s.label}</Badge>
}
