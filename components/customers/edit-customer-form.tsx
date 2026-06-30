'use client'

import { useActionState } from 'react'
import { updateCustomer, deleteCustomer, type Customer } from '@/actions/customers'
import { useRouter } from 'next/navigation'

export function EditCustomerForm({ customer }: { customer: Customer }) {
  const router = useRouter()
  const boundUpdate = updateCustomer.bind(null, customer.id)
  const boundDelete = deleteCustomer.bind(null, customer.id)
  const [updateState, updateAction, updatePending] = useActionState(boundUpdate, null)
  const [deleteState, deleteAction, deletePending] = useActionState(boundDelete, null)

  return (
    <div className="bg-white rounded-xl border p-4 space-y-3" style={{ borderColor: 'hsl(var(--border))' }}>
      <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-muted))' }}>EDIT PROFIL</p>

      <form action={updateAction} className="space-y-3">
        <div>
          <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>Nama</label>
          <input name="name" defaultValue={customer.name} required
            className="w-full mt-1 px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'hsl(var(--border))' }} />
        </div>
        <div>
          <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>Email</label>
          <input name="email" type="email" defaultValue={customer.email ?? ''}
            className="w-full mt-1 px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'hsl(var(--border))' }} />
        </div>
        <div>
          <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>Alamat</label>
          <input name="address" defaultValue={customer.address ?? ''}
            className="w-full mt-1 px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'hsl(var(--border))' }} />
        </div>
        <div>
          <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>
            Catatan (preferensi, ulang tahun, dll.)
          </label>
          <textarea name="notes" rows={2} defaultValue={customer.notes ?? ''}
            className="w-full mt-1 px-3 py-2 rounded-lg border text-sm outline-none resize-none"
            style={{ borderColor: 'hsl(var(--border))' }} />
        </div>

        {updateState && 'error' in updateState && updateState.error && (
          <p className="text-xs text-red-600">{updateState.error}</p>
        )}
        {updateState && 'success' in updateState && updateState.success && (
          <p className="text-xs" style={{ color: 'hsl(var(--success))' }}>✓ Tersimpan</p>
        )}

        <button
          type="submit"
          disabled={updatePending}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: 'hsl(var(--primary))' }}
        >
          {updatePending ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </form>

      <form action={deleteAction}>
        <button
          type="submit"
          disabled={deletePending}
          className="w-full py-2.5 rounded-xl text-sm font-medium border disabled:opacity-60"
          style={{ borderColor: 'hsl(0, 70%, 80%)', color: 'hsl(var(--danger))' }}
          onClick={e => {
            if (!confirm(`Hapus data pelanggan "${customer.name}"? Riwayat order tetap ada tapi tidak lagi terhubung ke profil ini.`)) {
              e.preventDefault()
            } else {
              setTimeout(() => router.push('/dashboard/customers'), 300)
            }
          }}
        >
          {deletePending ? 'Menghapus...' : 'Hapus Pelanggan'}
        </button>
      </form>
      {deleteState && 'error' in deleteState && deleteState.error && (
        <p className="text-xs text-red-600 text-center">{deleteState.error}</p>
      )}
    </div>
  )
}
