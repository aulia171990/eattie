import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PosInterface } from '@/components/pos/pos-interface'
import type { Product } from '@/types'

export default async function PosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: products }, { data: profile }] = await Promise.all([
    supabase
      .from('products')
      .select('id,name,name_en,description,category,selling_price,cost_price,current_stock,min_stock,image_url,is_active,created_at,updated_at')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single(),
  ])

  return (
    <PosInterface
      products={(products ?? []) as Product[]}
      cashierName={profile?.full_name ?? ''}
    />
  )
}
