import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import type { Profile } from '@/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,full_name,role,phone,avatar_url,is_active,created_at,updated_at')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const typedProfile = profile as Profile

  let lowStockCount = 0
  if (typedProfile.role === 'owner') {
    const { data: ingredients } = await supabase
      .from('ingredients')
      .select('id, current_stock, min_stock')
      .eq('is_active', true)
    lowStockCount = (ingredients ?? []).filter(
      (i) => (i.current_stock as number) <= (i.min_stock as number)
    ).length
  }

  return (
    <DashboardShell user={typedProfile} lowStockCount={lowStockCount}>
      {children}
    </DashboardShell>
  )
}
