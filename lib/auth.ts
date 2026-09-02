import { createClient } from '@/lib/supabase/server'

export type AppRole = 'owner' | 'cashier' | 'baker'

export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null, role: null as AppRole | null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return {
    supabase,
    user,
    profile,
    role: (profile?.role as AppRole | null) ?? null,
  }
}

export async function requireRole(allowedRoles: AppRole[]) {
  const { supabase, user, profile, role } = await requireAuth()

  if (!user) {
    return { supabase, user: null, profile: null, error: 'Tidak terautentikasi' as const }
  }

  if (!profile || !role || !allowedRoles.includes(role)) {
    return { supabase, user, profile, error: 'Tidak memiliki akses' as const }
  }

  if (!profile.is_active) {
    return { supabase, user, profile, error: 'Akun dinonaktifkan' as const }
  }

  return { supabase, user, profile, role, error: null }
}
