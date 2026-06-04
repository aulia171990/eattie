interface StatsCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: React.ReactNode
  color?: 'amber' | 'green' | 'red' | 'blue' | 'gray'
}

const colorMap = {
  amber: { bg: 'hsl(36, 80%, 93%)', icon: 'hsl(32, 95%, 44%)' },
  green: { bg: 'hsl(142, 50%, 92%)', icon: 'hsl(142, 60%, 35%)' },
  red:   { bg: 'hsl(0, 80%, 95%)',   icon: 'hsl(0, 70%, 48%)' },
  blue:  { bg: 'hsl(210, 70%, 93%)', icon: 'hsl(210, 70%, 40%)' },
  gray:  { bg: 'hsl(210, 10%, 93%)', icon: 'hsl(210, 10%, 50%)' },
}

export function StatsCard({ label, value, sub, icon, color = 'amber' }: StatsCardProps) {
  const c = colorMap[color]
  return (
    <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium" style={{ color: 'hsl(25, 15%, 50%)' }}>{label}</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'hsl(25, 30%, 12%)' }}>{value}</p>
          {sub && <p className="text-xs mt-1" style={{ color: 'hsl(25, 15%, 55%)' }}>{sub}</p>}
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
