'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type StoreSettings = {
  id: number
  company_name: string
  short_name: string
  tagline: string
  logo_url: string | null
  logo_icon_url: string | null
  favicon_url: string | null
  primary_color: string
  primary_color_hex: string
  accent_color: string
  sidebar_color: string
  whatsapp: string
  instagram: string
  facebook: string
  updated_at: string
  updated_by: string | null
}

export async function getStoreSettings(): Promise<StoreSettings | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('store_settings')
    .select('*')
    .eq('id', 1)
    .single()
  return data
}

export async function updateStoreSettings(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean } | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi' }

  const { data: caller } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (caller?.role !== 'owner') {
    return { error: 'Hanya owner yang dapat mengubah pengaturan toko' }
  }

  const fields: Record<string, string> = {
    company_name: (formData.get('company_name') as string) ?? '',
    short_name: (formData.get('short_name') as string) ?? '',
    tagline: (formData.get('tagline') as string) ?? '',
    primary_color: (formData.get('primary_color') as string) ?? '',
    primary_color_hex: (formData.get('primary_color_hex') as string) ?? '',
    accent_color: (formData.get('accent_color') as string) ?? '',
    sidebar_color: (formData.get('sidebar_color') as string) ?? '',
    whatsapp: (formData.get('whatsapp') as string) ?? '',
    instagram: (formData.get('instagram') as string) ?? '',
    facebook: (formData.get('facebook') as string) ?? '',
    updated_by: user.id,
  }

  const { error } = await supabase
    .from('store_settings')
    .update(fields as never)
    .eq('id', 1)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings/store')
  return { success: true }
}

export async function uploadStoreLogo(
  file: File,
  type: 'logo' | 'icon'
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi' }

  const ext = file.name.split('.').pop()
  const filename = `logos/${type}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { data, error } = await supabase.storage
    .from('payment-proofs')
    .upload(filename, file, { contentType: file.type, upsert: false })

  if (error) return { error: error.message }

  const { data: { publicUrl } } = supabase.storage
    .from('payment-proofs')
    .getPublicUrl(data.path)

  const column = type === 'logo' ? 'logo_url' : 'logo_icon_url'
  const { error: updateError } = await supabase
    .from('store_settings')
    .update({ [column]: publicUrl, updated_by: user.id } as never)
    .eq('id', 1)

  if (updateError) return { error: updateError.message }

  revalidatePath('/dashboard/settings/store')
  return { url: publicUrl }
}
