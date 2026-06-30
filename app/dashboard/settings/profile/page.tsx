import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { logout } from '@/actions/auth'
import { ROLE_LABELS } from '@/lib/constants'
import type { Profile } from '@/types'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('profiles')
    .select('id,full_name,role,phone,avatar_url,is_active,created_at,updated_at')
    .eq('id', user.id)
    .single()

  if (!data) redirect('/login')
  const profile = data as Profile

  return (
    <div className="p-6 max-w-lg">
      <PageHeader
        title="Profil Saya"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Pengaturan', href: '/dashboard/settings' },
          { label: 'Profil' },
        ]}
      />
      <div className="bg-white rounded-xl border p-6 space-y-5" style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
            style={{ background: 'hsl(var(--primary-subtle))', color: 'hsl(var(--primary))' }}
          >
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-bold text-base" style={{ color: 'hsl(var(--foreground))' }}>
              {profile.full_name}
            </h2>
            <p className="text-sm" style={{ color: 'hsl(var(--text-muted))' }}>{user.email}</p>
            <span
              className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium mt-1"
              style={{ background: 'hsl(32, 80%, 93%)', color: 'hsl(var(--primary))' }}
            >
              {ROLE_LABELS.id[profile.role] ?? profile.role}
            </span>
          </div>
        </div>
        <div className="pt-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
          <form action={logout}>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg text-sm font-medium border transition-all hover:bg-red-50"
              style={{ borderColor: 'hsl(0, 70%, 80%)', color: 'hsl(var(--danger))' }}
            >
              Keluar dari Akun
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
