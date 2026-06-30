interface StatusBadgeProps {
  status: string
  type?: 'production' | 'purchase' | 'stock' | 'payment'
}

const configs: Record<string, Record<string, { label: string; bg: string; text: string }>> = {
  production: {
    planned:     { label: 'Direncanakan', bg: 'hsl(210, 60%, 93%)', text: 'hsl(210, 60%, 35%)' },
    in_progress: { label: 'Berlangsung',  bg: 'hsl(var(--primary-subtle))',  text: 'hsl(var(--primary-hover))' },
    completed:   { label: 'Selesai',      bg: 'hsl(var(--success-bg))', text: 'hsl(var(--success))' },
    cancelled:   { label: 'Dibatalkan',   bg: 'hsl(var(--danger-bg))',   text: 'hsl(var(--danger))' },
  },
  purchase: {
    draft:     { label: 'Draft',     bg: 'hsl(210, 10%, 93%)', text: 'hsl(210, 10%, 40%)' },
    ordered:   { label: 'Dipesan',   bg: 'hsl(210, 60%, 93%)', text: 'hsl(210, 60%, 35%)' },
    received:  { label: 'Diterima',  bg: 'hsl(var(--success-bg))', text: 'hsl(var(--success))' },
    cancelled: { label: 'Dibatalkan',bg: 'hsl(var(--danger-bg))',   text: 'hsl(var(--danger))' },
  },
  stock: {
    normal:   { label: 'Normal',    bg: 'hsl(var(--success-bg))', text: 'hsl(var(--success))' },
    low:      { label: 'Menipis',   bg: 'hsl(var(--primary-subtle))',  text: 'hsl(var(--primary-hover))' },
    critical: { label: 'Kritis',    bg: 'hsl(var(--danger-bg))',   text: 'hsl(var(--danger))' },
    out:      { label: 'Habis',     bg: 'hsl(210, 10%, 93%)', text: 'hsl(210, 10%, 40%)' },
  },
  payment: {
    unpaid:  { label: 'Belum Bayar', bg: 'hsl(var(--danger-bg))',   text: 'hsl(var(--danger))' },
    partial: { label: 'Sebagian',    bg: 'hsl(var(--primary-subtle))',  text: 'hsl(var(--primary-hover))' },
    paid:    { label: 'Lunas',       bg: 'hsl(var(--success-bg))', text: 'hsl(var(--success))' },
  },
}

export function StatusBadge({ status, type = 'production' }: StatusBadgeProps) {
  const s = configs[type]?.[status] ?? { label: status, bg: 'hsl(210, 10%, 93%)', text: 'hsl(210, 10%, 40%)' }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ background: s.bg, color: s.text }}>
      {s.label}
    </span>
  )
}
