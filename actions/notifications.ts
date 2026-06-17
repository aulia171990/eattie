'use server'

import { createClient } from '@/lib/supabase/server'

export interface OrderNotification {
  id: string
  order_number: string
  customer_name: string
  total_amount: number
  created_at: string
}

export interface NotificationResult {
  count: number
  orders: OrderNotification[]
}

/**
 * Lightweight poll for new (status = NEW) orders.
 * Used by the header bell icon — only owner sees this.
 */
export async function getNewOrderNotifications(): Promise<NotificationResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { count: 0, orders: [] }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner') return { count: 0, orders: [] }

  const { data, count } = await supabase
    .from('orders')
    .select('id,order_number,customer_name,total_amount,created_at', { count: 'exact' })
    .eq('status', 'NEW')
    .order('created_at', { ascending: false })
    .limit(8)

  return {
    count: count ?? 0,
    orders: (data ?? []) as OrderNotification[],
  }
}
