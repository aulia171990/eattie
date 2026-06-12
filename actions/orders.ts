'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionState } from '@/types'

export type OrderStatus = 'NEW' | 'PAID' | 'IN_PRODUCTION' | 'READY_FOR_PICKUP' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED'

export interface OrderWithItems {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  customer_address: string | null
  order_type: string
  pickup_date: string | null
  pickup_time: string | null
  delivery_address: string | null
  notes: string | null
  subtotal: number
  discount_amount: number
  total_amount: number
  status: OrderStatus
  payment_status: 'UNPAID' | 'PAID' | 'REFUNDED' | string
  payment_proof_url: string | null
  payment_confirmed_at: string | null
  sale_id: string | null
  source: string
  created_at: string
  updated_at: string
  confirmed_at: string | null
  order_items: {
    id: string
    product_id: string
    product_name: string
    quantity: number
    unit_price: number
    subtotal: number
    notes: string | null
  }[]
}

export async function getOrders(filters?: {
  status?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}): Promise<OrderWithItems[]> {
  const supabase = await createClient()

  let query = supabase
    .from('orders')
    .select('*,order_items!order_items_order_id_fkey(*)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status as string)
  }
  if (filters?.dateFrom) query = query.gte('created_at', `${filters.dateFrom}T00:00:00`)
  if (filters?.dateTo)   query = query.lte('created_at', `${filters.dateTo}T23:59:59`)
  if (filters?.search) {
    query = query.or(
      `order_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,customer_phone.ilike.%${filters.search}%`
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as OrderWithItems[]
}

export async function getOrder(id: string): Promise<OrderWithItems> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*,order_items!order_items_order_id_fkey(*)')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data as unknown as OrderWithItems
}

export async function getOrderByNumber(orderNumber: string): Promise<OrderWithItems | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('orders')
    .select('*,order_items!order_items_order_id_fkey(*)')
    .eq('order_number', orderNumber)
    .maybeSingle()
  return data as unknown as OrderWithItems | null
}

export async function updateOrderStatus(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const status = formData.get('status') as OrderStatus

  const { error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/orders')
  revalidatePath(`/dashboard/orders/${id}`)
  return { success: true }
}

export async function confirmOrderPayment(
  id: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi' }

  const { data, error } = await supabase
    .rpc('confirm_order', { p_order_id: id, p_user_id: user.id })

  if (error) return { error: `Gagal konfirmasi: ${error.message}` }
  const result = data as unknown as { success?: boolean; error?: string; invoice_number?: string }
  if (!result?.success) return { error: result?.error ?? 'Gagal konfirmasi order' }

  revalidatePath('/dashboard/orders')
  revalidatePath(`/dashboard/orders/${id}`)
  revalidatePath('/dashboard/sales')
  return { success: true }
}

export async function cancelOrder(
  id: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('orders')
    .update({ status: 'CANCELLED' as OrderStatus, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/orders')
  revalidatePath(`/dashboard/orders/${id}`)
  return { success: true }
}
