import Link from 'next/link'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  actionLabel?: string
  actionHref?: string
}

export function EmptyState({ icon = '📭', title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="font-semibold text-base" style={{ color: 'hsl(25, 30%, 20%)' }}>{title}</h3>
      {description && <p className="text-sm mt-1 max-w-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>{description}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref}
          className="mt-4 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
          style={{ background: 'hsl(32, 95%, 44%)' }}>
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
