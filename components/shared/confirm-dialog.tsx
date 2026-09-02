'use client'
import { useState } from 'react'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  children: React.ReactNode
}

export function ConfirmDialog({ title, message, confirmLabel = 'Hapus', onConfirm, children }: ConfirmDialogProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <span onClick={() => setOpen(true)}>{children}</span>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm z-10">
            <h3 className="font-semibold text-base" style={{ color: 'hsl(var(--foreground))' }}>{title}</h3>
            <p className="text-sm mt-2" style={{ color: 'hsl(var(--text-muted))' }}>{message}</p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setOpen(false)}
                className="flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-all hover:bg-gray-50"
                style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-secondary))' }}>
                Batal
              </button>
              <button onClick={() => { onConfirm(); setOpen(false) }}
                className="flex-1 py-2 px-4 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
                style={{ background: 'hsl(var(--danger))' }}>
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
