'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CustomCakeRequest, CustomCakeStatus } from '@/types/custom-cake'
import { CustomCakeSchema } from '@/lib/validations/custom-cake'

// Generate request number candidate: CC-YYYYMMDD-XXXX.
function generateReqNumberCandidate(): string {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '')
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

  for (let attempt = 0; attempt < 10; attempt++) {
    const reqNumber = generateReqNumberCandidate().toUpperCase()

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

    if (!error) {
      return { success: true, reqNumber }
    }

    if (error.code !== '23505') {
      return { error: error.message }
    }
  }

  return { error: 'Gagal membuat nomor request unik, coba lagi' }
}

// ─── Admin: list all requests ────────────────────────────────────────────────
export async function getCustomCakeRequests(status?: CustomCakeStatus): Promise<CustomCakeRequest[]> {
  const supabase = await createClient()
  let q = supabase
    .from('custom_cake_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) {
    q = q.eq('status', status)
  }

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []) as CustomCakeRequest[]
}

// ─── Admin: get valid actions for a request ──────────────────────────────────
export async function getCustomCakeActions(requestId: string): Promise<{
  found: boolean
  current_status: string
  valid_next_statuses: string[]
} | null> {
  const supabase = await createClient()
  try {
    const { data, error } = await (supabase.rpc as any)('get_custom_cake_actions', {
      p_request_id: requestId,
    })
    if (error || !data) return null
    const result = data as {
      found: boolean
      current_status: string
      valid_next_statuses: string[]
    }
    return result.found ? result : null
  } catch {
    return null
  }
}

// ─── Admin: update status & quoted price via RPC ─────────────────────────────
export async function updateCustomCakeRequest(
  id: string,
  updates: { status?: CustomCakeStatus; quoted_price?: number | null }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi' }

  const { data, error } = await (supabase.rpc as any)('update_custom_cake_request_rpc', {
    p_request_id: id,
    p_status: updates.status ?? null,
    p_quoted_price: updates.quoted_price ?? null,
    p_user_id: user.id,
  })

  if (error) return { error: error.message }

  const result = data as { success?: boolean; error?: string }
  if (!result?.success) return { error: result?.error ?? 'Gagal update' }

  revalidatePath('/dashboard/custom-cakes')
  return {}
}
