'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

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
  background_color: string
  surface_color: string
  text_color: string
  text_muted_color: string
  border_color: string
  button_text_color: string
  success_color: string
  danger_color: string
  warning_color: string
  sidebar_text_color: string
  footer_bg_color: string
  footer_text_color: string
  text_secondary_color: string
  accent_foreground_color: string
  surface_raised_color: string
  whatsapp: string
  instagram: string
  facebook: string
  updated_at: string
  updated_by: string | null
}

const HSL_REGEX = /^\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%$/

const settingsSchema = z.object({
  company_name: z.string().min(1).max(100),
  short_name: z.string().min(1).max(30),
  tagline: z.string().max(200).default(''),
  primary_color: z.string().regex(HSL_REGEX),
  primary_color_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accent_color: z.string().regex(HSL_REGEX),
  sidebar_color: z.string().regex(HSL_REGEX),
  background_color: z.string().regex(HSL_REGEX),
  surface_color: z.string().regex(HSL_REGEX),
  text_color: z.string().regex(HSL_REGEX),
  text_muted_color: z.string().regex(HSL_REGEX),
  border_color: z.string().regex(HSL_REGEX),
  button_text_color: z.string().regex(HSL_REGEX),
  success_color: z.string().regex(HSL_REGEX),
  danger_color: z.string().regex(HSL_REGEX),
  warning_color: z.string().regex(HSL_REGEX),
  sidebar_text_color: z.string().regex(HSL_REGEX),
  footer_bg_color: z.string().regex(HSL_REGEX),
  footer_text_color: z.string().regex(HSL_REGEX),
  text_secondary_color: z.string().regex(HSL_REGEX),
  accent_foreground_color: z.string().regex(HSL_REGEX),
  surface_raised_color: z.string().regex(HSL_REGEX),
  whatsapp: z.string().max(30).default(''),
  instagram: z.string().max(100).default(''),
  facebook: z.string().max(100).default(''),
})

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

  const rawFields: Record<string, unknown> = {
    company_name:       (formData.get('company_name') as string) ?? '',
    short_name:         (formData.get('short_name') as string) ?? '',
    tagline:            (formData.get('tagline') as string) ?? '',
    primary_color:      (formData.get('primary_color') as string) ?? '',
    primary_color_hex:  (formData.get('primary_color_hex') as string) ?? '',
    accent_color:       (formData.get('accent_color') as string) ?? '',
    sidebar_color:      (formData.get('sidebar_color') as string) ?? '',
    background_color:   (formData.get('background_color') as string) ?? '',
    surface_color:      (formData.get('surface_color') as string) ?? '',
    text_color:         (formData.get('text_color') as string) ?? '',
    text_muted_color:   (formData.get('text_muted_color') as string) ?? '',
    border_color:       (formData.get('border_color') as string) ?? '',
    button_text_color:  (formData.get('button_text_color') as string) ?? '',
    success_color:      (formData.get('success_color') as string) ?? '',
    danger_color:       (formData.get('danger_color') as string) ?? '',
    warning_color:      (formData.get('warning_color') as string) ?? '',
    sidebar_text_color: (formData.get('sidebar_text_color') as string) ?? '',
    footer_bg_color:    (formData.get('footer_bg_color') as string) ?? '',
    footer_text_color:  (formData.get('footer_text_color') as string) ?? '',
    text_secondary_color: (formData.get('text_secondary_color') as string) ?? '',
    accent_foreground_color: (formData.get('accent_foreground_color') as string) ?? '',
    surface_raised_color: (formData.get('surface_raised_color') as string) ?? '',
    whatsapp:           (formData.get('whatsapp') as string) ?? '',
    instagram:          (formData.get('instagram') as string) ?? '',
    facebook:           (formData.get('facebook') as string) ?? '',
  }

  const parsed = settingsSchema.safeParse(rawFields)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { error: `Input tidak valid: ${issue.path.join('.')}` }
  }

  const { error } = await supabase
    .from('store_settings')
    .update({ ...parsed.data, updated_by: user.id } as never)
    .eq('id', 1)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings/store')
  return { success: true }
}

export async function uploadStoreLogo(
  file: File,
  type: 'logo' | 'icon'
): Promise<{ url?: string; error?: string }> {
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
    return { error: 'Format logo tidak didukung (png, jpg, webp, svg)' }
  }
  if (file.size > 2 * 1024 * 1024) {
    return { error: 'Ukuran maksimal logo adalah 2 MB' }
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi' }

  const { data: caller } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (caller?.role !== 'owner') {
    return { error: 'Hanya owner yang dapat mengubah logo toko' }
  }

  const ext = file.name.split('.').pop()
  const filename = `logos/${type}-${Date.now()}-${crypto.randomUUID()}.${ext}`

  const { data, error } = await supabase.storage
    .from('store-assets')
    .upload(filename, file, { contentType: file.type, upsert: false })

  if (error) return { error: error.message }

  const { data: { publicUrl } } = supabase.storage
    .from('store-assets')
    .getPublicUrl(data.path)

  const column = type === 'logo' ? 'logo_url' : 'logo_icon_url'

  const { error: updateError } = await supabase
    .from('store_settings')
    .update({ [column]: publicUrl, updated_by: user.id } as never)
    .eq('id', 1)

  if (updateError) {
    // Cleanup uploaded file if DB update fails
    await supabase.storage.from('store-assets').remove([data.path])
    return { error: updateError.message }
  }

  revalidatePath('/dashboard/settings/store')
  return { url: publicUrl }
}
