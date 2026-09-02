interface StatsCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: React.ReactNode
  color?: 'amber' | 'green' | 'red' | 'blue' | 'gray'
}

const colorMap = {
  amber: { bg: 'hsl(var(--primary-subtle))', icon: 'hsl(var(--primary))' },
  green: { bg: 'hsl(var(--success-bg))', icon: 'hsl(var(--success))' },
  red:   { bg: 'hsl(var(--danger-bg))',   icon: 'hsl(var(--danger))' },
  blue:  { bg: 'hsl(var(--info-bg))', icon: 'hsl(var(--info))' },
  gray:  { bg: 'hsl(var(--info-bg))', icon: 'hsl(var(--info))' },
}

export function StatsCard({ label, value, sub, icon, color = 'amber' }: StatsCardProps) {
  const c = colorMap[color]
  return (
    <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'hsl(var(--border))' }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-muted))' }}>{label}</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'hsl(var(--foreground))' }}>{value}</p>
          {sub && <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-muted))' }}>{sub}</p>}
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: c.bg, color: c.icon }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
