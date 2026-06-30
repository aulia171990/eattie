interface StatusBadgeProps {
  status: string
  type?: 'production' | 'purchase' | 'stock' | 'payment'
}

const configs: Record<string, Record<string, { label: string; bg: string; text: string }>> = {
  production: {
    planned:     { label: 'Direncanakan', bg: 'hsl(var(--info-bg))', text: 'hsl(var(--info))' },
    in_progress: { label: 'Berlangsung',  bg: 'hsl(var(--primary-subtle))',  text: 'hsl(var(--primary-hover))' },
    completed:   { label: 'Selesai',      bg: 'hsl(var(--success-bg))', text: 'hsl(var(--success))' },
    cancelled:   { label: 'Dibatalkan',   bg: 'hsl(var(--danger-bg))',   text: 'hsl(var(--danger))' },
  },
  purchase: {
    draft:     { label: 'Draft',     bg: 'hsl(var(--info-bg))', text: 'hsl(var(--info))' },
    ordered:   { label: 'Dipesan',   bg: 'hsl(var(--info-bg))', text: 'hsl(var(--info))' },
    received:  { label: 'Diterima',  bg: 'hsl(var(--success-bg))', text: 'hsl(var(--success))' },
    cancelled: { label: 'Dibatalkan',bg: 'hsl(var(--danger-bg))',   text: 'hsl(var(--danger))' },
  },
  stock: {
    normal:   { label: 'Normal',    bg: 'hsl(var(--success-bg))', text: 'hsl(var(--success))' },
    low:      { label: 'Menipis',   bg: 'hsl(var(--primary-subtle))',  text: 'hsl(var(--primary-hover))' },
    critical: { label: 'Kritis',    bg: 'hsl(var(--danger-bg))',   text: 'hsl(var(--danger))' },
    out:      { label: 'Habis',     bg: 'hsl(var(--info-bg))', text: 'hsl(var(--info))' },
  },
  payment: {
    unpaid:  { label: 'Belum Bayar', bg: 'hsl(var(--danger-bg))',   text: 'hsl(var(--danger))' },
    partial: { label: 'Sebagian',    bg: 'hsl(var(--primary-subtle))',  text: 'hsl(var(--primary-hover))' },
    paid:    { label: 'Lunas',       bg: 'hsl(var(--success-bg))', text: 'hsl(var(--success))' },
  },
}

export function StatusBadge({ status, type = 'production' }: StatusBadgeProps) {
  const s = configs[type]?.[status] ?? { label: status, bg: 'hsl(var(--info-bg))', text: 'hsl(var(--info))' }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ background: s.bg, color: s.text }}>
      {s.label}
    </span>
  )
}
