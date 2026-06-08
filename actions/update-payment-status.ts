'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type ActionState = { error?: string; success?: boolean } | null

export async function updatePaymentStatus(
  purchaseId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi' }

  const payment_status = formData.get('payment_status') as string
  if (!['unpaid', 'partial', 'paid'].includes(payment_status)) {
    return { error: 'Status pembayaran tidak valid' }
  }

  const { error } = await supabase
    .from('stock_purchases')
    .update({
      payment_status: payment_status as 'unpaid' | 'partial' | 'paid',
      updated_at: new Date().toISOString(),
    })
    .eq('id', purchaseId)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/inventory/purchases/${purchaseId}`)
  revalidatePath('/dashboard/inventory/purchases')
  return { success: true }
}
