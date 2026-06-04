interface StatusBadgeProps {
  status: string
  type?: 'production' | 'purchase' | 'stock' | 'payment'
}

const configs: Record<string, Record<string, { label: string; bg: string; text: string }>> = {
  production: {
    planned:     { label: 'Direncanakan', bg: 'hsl(210, 60%, 93%)', text: 'hsl(210, 60%, 35%)' },
    in_progress: { label: 'Berlangsung',  bg: 'hsl(36, 80%, 90%)',  text: 'hsl(32, 95%, 38%)' },
    completed:   { label: 'Selesai',      bg: 'hsl(142, 50%, 90%)', text: 'hsl(142, 60%, 28%)' },
    cancelled:   { label: 'Dibatalkan',   bg: 'hsl(0, 60%, 93%)',   text: 'hsl(0, 70%, 40%)' },
  },
  purchase: {
    draft:     { label: 'Draft',     bg: 'hsl(210, 10%, 93%)', text: 'hsl(210, 10%, 40%)' },
    ordered:   { label: 'Dipesan',   bg: 'hsl(210, 60%, 93%)', text: 'hsl(210, 60%, 35%)' },
    received:  { label: 'Diterima',  bg: 'hsl(142, 50%, 90%)', text: 'hsl(142, 60%, 28%)' },
    cancelled: { label: 'Dibatalkan',bg: 'hsl(0, 60%, 93%)',   text: 'hsl(0, 70%, 40%)' },
  },
  stock: {
    normal:   { label: 'Normal',    bg: 'hsl(142, 50%, 90%)', text: 'hsl(142, 60%, 28%)' },
    low:      { label: 'Menipis',   bg: 'hsl(36, 80%, 90%)',  text: 'hsl(32, 95%, 38%)' },
    critical: { label: 'Kritis',    bg: 'hsl(0, 80%, 95%)',   text: 'hsl(0, 70%, 40%)' },
    out:      { label: 'Habis',     bg: 'hsl(210, 10%, 93%)', text: 'hsl(210, 10%, 40%)' },
  },
  payment: {
    unpaid:  { label: 'Belum Bayar', bg: 'hsl(0, 80%, 95%)',   text: 'hsl(0, 70%, 40%)' },
    partial: { label: 'Sebagian',    bg: 'hsl(36, 80%, 90%)',  text: 'hsl(32, 95%, 38%)' },
    paid:    { label: 'Lunas',       bg: 'hsl(142, 50%, 90%)', text: 'hsl(142, 60%, 28%)' },
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
