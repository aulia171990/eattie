'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionState } from '@/types'

// ── Types ────────────────────────────────────────────────────

export type OrderStatus =
  | 'NEW'
  | 'PAID'
  | 'IN_PRODUCTION'
  | 'READY_FOR_PICKUP'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'

export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED'

export interface OrderItem {
  id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
  notes: string | null
}

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
  payment_status: PaymentStatus
  payment_proof_url: string | null
  payment_confirmed_at: string | null
  payment_confirmed_by: string | null
  sale_id: string | null
  source: string | null
  created_at: string
  updated_at: string
  confirmed_at: string | null
  confirmed_by: string | null
  order_items: OrderItem[]
}

export interface GetOrdersParams {
  status?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  pageSize?: number
}

export interface GetOrdersResult {
  data: OrderWithItems[]
  total: number
  page: number
  pageSize: number
}

// ── RPC result type ──────────────────────────────────────────
interface RpcResult {
  success: boolean
  error?: string
  sale_id?: string
  invoice_number?: string
  idempotent?: boolean
}

// ── Helper ───────────────────────────────────────────────────
function revalidateOrders(id?: string) {
  revalidatePath('/dashboard/orders')
  if (id) revalidatePath(`/dashboard/orders/${id}`)
}

async function callRpc(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fn: string,
  params: Record<string, string>
): Promise<{ result: RpcResult | null; error: string | null }> {
  const { data, error } = await supabase.rpc(fn, params)
  if (error) return { result: null, error: error.message }
  const result = data as unknown as RpcResult
  if (!result?.success) return { result: null, error: result?.error ?? `Gagal: ${fn}` }
  return { result, error: null }
}

// ── READ FUNCTIONS ───────────────────────────────────────────

export async function getOrders(
  params: GetOrdersParams = {}
): Promise<GetOrdersResult> {
  const supabase = await createClient()
  const page     = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 20))
  const from     = (page - 1) * pageSize
  const to       = from + pageSize - 1

  let query = supabase
    .from('orders')
    .select('*,order_items!order_items_order_id_fkey(*)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status)
  }
  if (params.dateFrom) query = query.gte('created_at', `${params.dateFrom}T00:00:00`)
  if (params.dateTo)   query = query.lte('created_at', `${params.dateTo}T23:59:59`)
  if (params.search) {
    query = query.or(
      `order_number.ilike.%${params.search}%,` +
      `customer_name.ilike.%${params.search}%,` +
      `customer_phone.ilike.%${params.search}%`
    )
  }

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  return {
    data: (data ?? []) as unknown as OrderWithItems[],
    total: count ?? 0,
    page,
    pageSize,
  }
}

// Convenience: return flat array for Kanban (no pagination needed, only active orders)
export async function getOrdersFlat(params: GetOrdersParams = {}): Promise<OrderWithItems[]> {
  const result = await getOrders({ ...params, pageSize: 50 })
  return result.data
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

export async function getOrderByNumber(
  orderNumber: string
): Promise<OrderWithItems | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('orders')
    .select('*,order_items!order_items_order_id_fkey(*)')
    .eq('order_number', orderNumber.toUpperCase())
    .maybeSingle()
  return data as unknown as OrderWithItems | null
}

// ── WRITE FUNCTIONS (all via RPC) ────────────────────────────

/**
 * Confirm payment + create sale.
 * NEW → PAID, idempotent if sale_id already exists.
 * Allowed: owner, cashier
 */
export async function confirmOrderPayment(
  id: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi' }

  const { result, error } = await callRpc(supabase, 'rpc_confirm_order', {
    p_order_id: id,
    p_user_id: user.id,
  })
  if (error) return { error: `Gagal konfirmasi: ${error}` }

  revalidateOrders(id)
  revalidatePath('/dashboard/sales')
  return { success: true }
}

/**
 * Cancel order.
 * Only NEW or PAID can be cancelled.
 * Allowed: owner, cashier
 */
export async function cancelOrder(
  id: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi' }

  const { error } = await callRpc(supabase, 'rpc_cancel_order', {
    p_order_id: id,
    p_user_id: user.id,
  })
  if (error) return { error }

  revalidateOrders(id)
  return { success: true }
}

/**
 * Update order status via the correct RPC for each transition.
 * Maps next_status → correct RPC function.
 * Validates transition server-side inside each RPC.
 */
export async function updateOrderStatus(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi' }

  const status = formData.get('status') as OrderStatus

  // Map status → RPC function name
  const rpcMap: Partial<Record<OrderStatus, string>> = {
    IN_PRODUCTION:    'rpc_start_production',
    READY_FOR_PICKUP: 'rpc_ready_for_pickup',
    DELIVERED:        'rpc_deliver_order',
    COMPLETED:        'rpc_complete_order',
  }

  const rpcFn = rpcMap[status]
  if (!rpcFn) return { error: `Status tidak valid untuk transisi: ${status}` }

  const { error } = await callRpc(supabase, rpcFn, {
    p_order_id: id,
    p_user_id: user.id,
  })
  if (error) return { error }

  revalidateOrders(id)
  return { success: true }
}

/**
 * Mark payment as PAID without creating a sale.
 * Used for orders already COMPLETED without payment confirmation.
 * Idempotent.
 * Allowed: owner, cashier
 */
export async function markOrderAsPaid(
  id: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi' }

  const { error } = await callRpc(supabase, 'rpc_mark_paid', {
    p_order_id: id,
    p_user_id: user.id,
  })
  if (error) return { error }

  revalidateOrders(id)
  return { success: true }
}
