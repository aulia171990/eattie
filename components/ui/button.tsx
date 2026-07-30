import { cn } from '@/lib/utils'
import type {
  ButtonHTMLAttributes,
  AnchorHTMLAttributes,
  ReactNode,
} from 'react'
import Link from 'next/link'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const base =
  'inline-flex items-center justify-center gap-2 font-medium rounded-lg ' +
  'transition-all duration-200 select-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm',
  secondary: 'bg-surface text-foreground border border-border hover:bg-muted',
  danger: 'bg-destructive text-destructive-foreground hover:bg-destructive-hover shadow-sm',
  ghost: 'text-text-secondary hover:bg-muted',
}

const sizes: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-sm px-5 py-2.5',
  icon: 'p-2',
}

interface CommonProps {
  variant?: Variant
  size?: Size
  className?: string
  children?: ReactNode
}

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { as?: 'button' }

type ButtonAsLink = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { as: 'link'; href: string }

export type ButtonProps = ButtonAsButton | ButtonAsLink

export function Button(props: ButtonProps) {
  const {
    variant = 'primary',
    size = 'md',
    className,
    children,
    ...rest
  } = props as ButtonProps & { as?: string }

  const classes = cn(base, variants[variant], sizes[size], className)

  if (props.as === 'link') {
    const { href, ...anchorRest } = rest as AnchorHTMLAttributes<HTMLAnchorElement>
    return (
      <Link href={href as string} className={classes} {...anchorRest}>
        {children}
      </Link>
    )
  }

  return (
    <button className={classes} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  )
}
