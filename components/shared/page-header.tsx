import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface Breadcrumb { label: string; href?: string }
interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: Breadcrumb[]
  action?: React.ReactNode
}

export function PageHeader({ title, description, breadcrumbs, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 mb-1.5 text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={12} />}
                {crumb.href
                  ? <Link href={crumb.href} className="hover:underline" style={{ color: 'hsl(32, 95%, 44%)' }}>{crumb.label}</Link>
                  : <span>{crumb.label}</span>}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-xl font-semibold" style={{ color: 'hsl(25, 30%, 12%)' }}>{title}</h1>
        {description && <p className="text-sm mt-0.5" style={{ color: 'hsl(25, 15%, 50%)' }}>{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
