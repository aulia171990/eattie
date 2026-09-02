'use client'

import { useState, useActionState } from 'react'
import { createCustomer } from '@/actions/customers'
import { Plus, X } from 'lucide-react'

export function AddCustomerButton() {
  const [open, setOpen] = useState(false)
  const [state, formAction, isPending] = useActionState(createCustomer, null)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
        style={{ background: 'hsl(var(--primary))' }}
      >
        <Plus size={14} />
        Tambah Pelanggan
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                Tambah Pelanggan
              </h3>
              <button onClick={() => setOpen(false)}>
                <X size={18} style={{ color: 'hsl(var(--text-muted))' }} />
              </button>
            </div>

            <form action={formAction} className="space-y-3">
              <div>
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>
                  Nama *
                </label>
                <input name="name" required
                  className="w-full mt-1 px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ borderColor: 'hsl(var(--border))' }} />
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>
                  Nomor HP / WA *
                </label>
                <input name="phone" required
                  className="w-full mt-1 px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ borderColor: 'hsl(var(--border))' }} />
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>
                  Email
                </label>
                <input name="email" type="email"
                  className="w-full mt-1 px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ borderColor: 'hsl(var(--border))' }} />
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>
                  Alamat
                </label>
                <input name="address"
                  className="w-full mt-1 px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ borderColor: 'hsl(var(--border))' }} />
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>
                  Catatan
                </label>
                <textarea name="notes" rows={2}
                  placeholder="Preferensi rasa, ulang tahun, dll."
                  className="w-full mt-1 px-3 py-2 rounded-lg border text-sm outline-none resize-none"
                  style={{ borderColor: 'hsl(var(--border))' }} />
              </div>

              {state && 'error' in state && state.error && (
                <p className="text-xs text-red-600">{state.error}</p>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: 'hsl(var(--primary))' }}
                onClick={() => {
                  if (state && 'success' in state && state.success) setOpen(false)
                }}
              >
                {isPending ? 'Menyimpan...' : 'Simpan Pelanggan'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
