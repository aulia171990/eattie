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
        style={{ borderColor: 'hsl(36, 20%, 85%)', color: 'hsl(25, 30%, 20%)' }}
      >
        {ROLES.map(r => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="text-xs px-3 py-1.5 rounded-lg font-medium text-white disabled:opacity-60"
        style={{ background: 'hsl(32, 95%, 44%)' }}
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
        <span className="text-xs" style={{ color: 'hsl(142, 60%, 35%)' }}>✓</span>
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
          ? { borderColor: 'hsl(0,70%,80%)', color: 'hsl(0,70%,45%)', background: 'white' }
          : { borderColor: 'hsl(142,50%,70%)', color: 'hsl(142,60%,35%)', background: 'white' }
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
