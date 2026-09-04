'use client'

import { useToast } from '@/contexts/toast-context'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

export function Toaster() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[var(--toast-z)] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => {
        const Icon = toast.type === 'error' ? AlertCircle : toast.type === 'info' ? Info : CheckCircle
        const bg = toast.type === 'error' 
          ? 'hsl(var(--danger))' 
          : toast.type === 'info' 
            ? 'hsl(var(--info))' 
            : 'hsl(var(--success))'

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 text-white shadow-2xl animate-in slide-in-from-right"
            style={{ background: bg, minWidth: '260px', maxWidth: '360px' }}
            role="alert"
          >
            <Icon size={18} className="shrink-0" />
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 rounded-full p-1 transition-colors hover:bg-white/20"
              aria-label="Tutup"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
