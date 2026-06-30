'use client'

import { useActionState } from 'react'

type ActionState = { error?: string; success?: boolean } | null

interface UserRoleFormProps {
  userId: string
  currentRole: string
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>
}

const ROLES = [
  { value: 'cashier', label: 'Kasir' },
  { value: 'baker',   label: 'Baker' },
  { value: 'owner',   label: 'Pemilik' },
]

export function UserRoleForm({ currentRole, action }: UserRoleFormProps) {
  const [state, formAction, isPending] = useActionState(action, null)

  return (
    <form action={formAction} className="flex items-center gap-2">
      <select
        name="role"
        defaultValue={currentRole}
        disabled={isPending}
        className="text-xs px-2 py-1.5 rounded-lg border outline-none"
        style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-secondary))' }}
      >
        {ROLES.map(r => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="text-xs px-3 py-1.5 rounded-lg font-medium text-white disabled:opacity-60"
        style={{ background: 'hsl(var(--primary))' }}
        onClick={e => {
          if (!confirm('Ubah role pengguna ini?')) e.preventDefault()
        }}
      >
        {isPending ? '...' : 'Simpan'}
      </button>
      {state?.error && (
        <span className="text-xs text-red-600">{state.error}</span>
      )}
      {state?.success && (
        <span className="text-xs" style={{ color: 'hsl(var(--success))' }}>✓</span>
      )}
    </form>
  )
}

interface ToggleActiveFormProps {
  userId: string
  isActive: boolean
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>
}

export function ToggleActiveForm({ isActive, action }: ToggleActiveFormProps) {
  const [state, formAction, isPending] = useActionState(action, null)

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="is_active" value={String(!isActive)} />
      <button
        type="submit"
        disabled={isPending}
        className="text-xs px-3 py-1.5 rounded-lg font-medium border disabled:opacity-60 transition-all"
        style={isActive
          ? { borderColor: 'hsl(var(--danger-bg))', color: 'hsl(var(--danger))', background: 'white' }
          : { borderColor: 'hsl(var(--success))', color: 'hsl(var(--success))', background: 'white' }
        }
        onClick={e => {
          const msg = isActive
            ? 'Nonaktifkan pengguna ini? Mereka tidak bisa login lagi.'
            : 'Aktifkan kembali pengguna ini?'
          if (!confirm(msg)) e.preventDefault()
        }}
      >
        {isPending ? '...' : isActive ? 'Nonaktifkan' : 'Aktifkan'}
      </button>
      {state?.error && (
        <span className="text-xs text-red-600">{state.error}</span>
      )}
    </form>
  )
}
