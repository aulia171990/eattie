'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CustomCakeRequest, CustomCakeStatus } from '@/types/custom-cake'
import { CustomCakeSchema } from '@/lib/validations/custom-cake'

const CUSTOM_CAKE_STATUSES: CustomCakeStatus[] = ['pending', 'quoted', 'confirmed', 'in_production', 'ready', 'delivered', 'cancelled']

function isCustomCakeStatus(value: string): value is CustomCakeStatus {
  return CUSTOM_CAKE_STATUSES.includes(value as CustomCakeStatus)
}

// Generate request number: CC-YYYYMMDD-XXXX
function generateReqNumber(): string {
  const date = new Date()
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `CC-${ymd}-${rand}`
}

// ─── Customer: submit request from store ────────────────────────────────────
export async function submitCustomCakeRequest(formData: FormData): Promise<{
  success?: boolean
  reqNumber?: string
  error?: string
}> {
  const supabase = await createClient()

  const parsed = CustomCakeSchema.safeParse({
    customer_name: formData.get('customer_name'),
    customer_phone: formData.get('customer_phone'),
    size: formData.get('size'),
    flavor: formData.get('flavor'),
    color_theme: formData.get('color_theme') || undefined,
    special_notes: formData.get('special_notes') || undefined,
    reference_image_url: formData.get('reference_image_url') || undefined,
  })

  if (!parsed.success) {
    return { error: 'Input custom cake tidak valid' }
  }

  const { customer_name: customerName, customer_phone: customerPhone, size, flavor, color_theme: colorTheme, special_notes: specialNotes, reference_image_url: refImageUrl } = parsed.data

  if (!CUSTOM_CAKE_STATUSES.includes('pending')) return { error: 'Status internal tidak valid' }

  const reqNumber = generateReqNumber()

  const { error } = await supabase.from('custom_cake_requests').insert({
    req_number: reqNumber,
    customer_name: customerName,
    customer_phone: customerPhone,
    size,
    flavor,
    color_theme: colorTheme,
    special_notes: specialNotes,
    reference_image_url: refImageUrl,
    status: 'pending',
  })

  if (error) return { error: error.message }

  return { success: true, reqNumber }
}

// ─── Admin: list all requests ────────────────────────────────────────────────
export async function getCustomCakeRequests(status?: CustomCakeStatus): Promise<CustomCakeRequest[]> {
  const supabase = await createClient()
  let q = supabase
    .from('custom_cake_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) {
    if (!isCustomCakeStatus(status)) return []
    q = q.eq('status', status)
  }

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []) as CustomCakeRequest[]
}

// ─── Admin: update status & quoted price ────────────────────────────────────
export async function updateCustomCakeRequest(
  id: string,
  updates: { status?: CustomCakeStatus; quoted_price?: number | null }
): Promise<{ error?: string }> {
  const supabase = await createClient()

  if (!id.trim()) return { error: 'ID tidak valid' }
  if (updates.status && !isCustomCakeStatus(updates.status)) return { error: 'Status tidak valid' }
  if (updates.quoted_price != null && (!Number.isFinite(updates.quoted_price) || updates.quoted_price < 0)) {
    return { error: 'Harga tidak valid' }
  }

  const { error } = await supabase
    .from('custom_cake_requests')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/custom-cakes')
  return {}
}
