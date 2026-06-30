import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { ROLE_LABELS } from '@/lib/constants'
import type { Profile } from '@/types'
import { UserRoleForm, ToggleActiveForm } from '@/components/forms/user-role-form'
import { updateUserRole, toggleUserActive } from '@/actions/users'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── Owner only guard ──────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner') redirect('/dashboard')
  // ─────────────────────────────────────────────────────────

  const { data } = await supabase
    .from('profiles')
    .select('id,full_name,role,phone,avatar_url,is_active,created_at,updated_at')
    .order('full_name')

  const users = (data ?? []) as Profile[]

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <PageHeader
        title="Manajemen Pengguna"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Pengaturan', href: '/dashboard/settings' },
          { label: 'Pengguna' },
        ]}
      />

      <p className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
        Hanya owner yang dapat mengubah role pengguna.
      </p>

      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'hsl(var(--surface-raised))' }}>
              {['Nama', 'Role', 'Status', 'Ubah Role', 'Aksi'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold"
                  style={{ color: 'hsl(var(--text-muted))' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t" style={{ borderColor: 'hsl(var(--border))' }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: 'hsl(var(--primary-subtle))', color: 'hsl(var(--primary))' }}>
                      {u.full_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                      {u.full_name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2.5 py-0.5 rounded-full"
                    style={{ background: 'hsl(32, 80%, 93%)', color: 'hsl(var(--primary))' }}>
                    {ROLE_LABELS.id[u.role] ?? u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: u.is_active ? 'hsl(var(--success-bg))' : 'hsl(var(--danger-bg))',
                      color: u.is_active ? 'hsl(var(--success))' : 'hsl(var(--danger))',
                    }}>
                    {u.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {/* Prevent owner from changing their own role */}
                  {u.id !== user.id ? (
                    <UserRoleForm
                      userId={u.id}
                      currentRole={u.role}
                      action={updateUserRole.bind(null, u.id)}
                    />
                  ) : (
                    <span className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
                      (Anda)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.id !== user.id ? (
                    <ToggleActiveForm
                      userId={u.id}
                      isActive={u.is_active}
                      action={toggleUserActive.bind(null, u.id)}
                    />
                  ) : (
                    <span className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
