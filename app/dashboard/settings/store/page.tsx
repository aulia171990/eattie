import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { StoreSettingsForm } from '@/components/forms/store-settings-form'
import { getStoreSettings } from '@/actions/store-settings'

export default async function StoreSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner') redirect('/dashboard')

  const settings = await getStoreSettings()

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <PageHeader
        title="Pengaturan Toko"
        description="Atur nama toko, logo, dan tema warna"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Pengaturan', href: '/dashboard/settings' },
          { label: 'Toko' },
        ]}
      />

      <StoreSettingsForm settings={settings} />
    </div>
  )
}
