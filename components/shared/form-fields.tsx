'use client'

import { cn } from '@/lib/utils'
import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

// ─── Field Wrapper ────────────────────────────────────────────
interface FieldProps {
  label?: string
  error?: string
  hint?: string
  required?: boolean
  children: ReactNode
  className?: string
}

export function Field({ label, error, hint, required, children, className }: FieldProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <label className="text-xs font-medium block" style={{ color: 'hsl(25, 30%, 25%)' }}>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="text-xs" style={{ color: 'hsl(25, 15%, 60%)' }}>{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}

// ─── Base input styles ────────────────────────────────────────
const inputBase = [
  'w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all',
  'placeholder:text-gray-400',
  'focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15',
  'disabled:opacity-60 disabled:cursor-not-allowed',
].join(' ')

// ─── Input ───────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, className, required, ...props }: InputProps) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      <input
        {...props}
        required={required}
        className={cn(
          inputBase,
          error ? 'border-red-400' : 'border-gray-200',
          className
        )}
      />
    </Field>
  )
}

// ─── Select ──────────────────────────────────────────────────
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  placeholder?: string
}

export function Select({ label, error, hint, placeholder, className, required, children, ...props }: SelectProps) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      <select
        {...props}
        required={required}
        className={cn(
          inputBase,
          error ? 'border-red-400' : 'border-gray-200',
          'bg-white',
          className
        )}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {children}
      </select>
    </Field>
  )
}

// ─── Textarea ────────────────────────────────────────────────
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export function Textarea({ label, error, hint, className, required, ...props }: TextareaProps) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      <textarea
        {...props}
        required={required}
        className={cn(
          inputBase,
          'resize-none',
          error ? 'border-red-400' : 'border-gray-200',
          className
        )}
      />
    </Field>
  )
}

// ─── Form Section ────────────────────────────────────────────
export function FormSection({ title, children, className }: {
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {title && (
        <h3 className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'hsl(25, 15%, 50%)' }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}

// ─── Submit Button ───────────────────────────────────────────
export function SubmitButton({
  children,
  loading = false,
  className,
  variant = 'primary',
}: {
  children: ReactNode
  loading?: boolean
  className?: string
  variant?: 'primary' | 'secondary' | 'danger'
}) {
  const styles = {
    primary: 'bg-amber-600 text-white hover:bg-amber-700',
    secondary: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }

  return (
    <button
      type="submit"
      disabled={loading}
      className={cn(
        'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        'flex items-center gap-2',
        styles[variant],
        className
      )}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
