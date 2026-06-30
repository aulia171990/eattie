'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import type { Supplier } from '@/types'
import type { ServerAction } from '@/types/forms'
import { getError } from '@/types/forms'

interface SupplierFormProps {
  action: ServerAction
  supplier?: Supplier
  cancelHref: string
}

export function SupplierForm({ action, supplier, cancelHref }: SupplierFormProps) {
  const [state, formAction, isPending] = useActionState(action, null)
  const error = getError(state)

  const fields = [
    { label: 'Nama Supplier*', name: 'name', required: true, value: supplier?.name },
    { label: 'Kontak Person', name: 'contact_person', value: supplier?.contact_person ?? '' },
    { label: 'Nomor Telepon', name: 'phone', value: supplier?.phone ?? '' },
    { label: 'Email', name: 'email', type: 'email', value: supplier?.email ?? '' },
    { label: 'Alamat', name: 'address', value: supplier?.address ?? '' },
  ] as const

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      {error && (
        <div className="p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border p-6 space-y-4" style={{ borderColor: 'hsl(var(--border))' }}>
        {fields.map((f) => (
          <div key={f.name}>
            <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--text-secondary))' }}>
              {f.label}
            </label>
            <input
              name={f.name}
              defaultValue={f.value}
              type={'type' in f ? f.type : 'text'}
              required={'required' in f ? f.required : false}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'hsl(var(--border))' }}
            />
          </div>
        ))}

        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--text-secondary))' }}>
            Catatan
          </label>
          <textarea
            name="notes"
            defaultValue={supplier?.notes ?? ''}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
            style={{ borderColor: 'hsl(var(--border))' }}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60"
          style={{ background: 'hsl(var(--primary))' }}
        >
          {isPending ? 'Menyimpan...' : supplier ? 'Simpan' : 'Tambah Supplier'}
        </button>
        <Link
          href={cancelHref}
          className="px-6 py-2.5 rounded-lg text-sm font-medium border"
          style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-secondary))' }}
        >
          Batal
        </Link>
      </div>
    </form>
  )
}
