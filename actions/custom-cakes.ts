'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CustomCakeRequest, CustomCakeStatus } from '@/types/custom-cake'

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

  const customerName  = (formData.get('customer_name') as string)?.trim()
  const customerPhone = (formData.get('customer_phone') as string)?.trim()
  const size          = (formData.get('size') as string)?.trim()
  const flavor        = (formData.get('flavor') as string)?.trim()
  const colorTheme    = (formData.get('color_theme') as string)?.trim() || null
  const specialNotes  = (formData.get('special_notes') as string)?.trim() || null
  const refImageUrl   = (formData.get('reference_image_url') as string)?.trim() || null

  if (!customerName || !customerPhone || !size || !flavor) {
    return { error: 'Nama, nomor HP, ukuran, dan rasa wajib diisi.' }
  }

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

  if (status) q = q.eq('status', status)

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

  const { error } = await supabase
    .from('custom_cake_requests')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/custom-cakes')
  return {}
}
