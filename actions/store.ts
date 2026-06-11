'use server'

import { createClient as createAnonClient } from '@/lib/supabase/client'
import { createClient } from '@/lib/supabase/server'

export interface StoreProduct {
  id: string
  name: string
  description: string | null
  online_description: string | null
  category: string | null
  selling_price: number
  image_url: string | null
  online_sort_order: number
}

export interface CheckoutItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
  notes?: string
}

export interface CheckoutInput {
  customer_name: string
  customer_phone: string
  customer_email?: string
  order_type: 'pickup' | 'delivery' | 'PICKUP' | 'DELIVERY'
  pickup_date?: string
  pickup_time?: string
  delivery_address?: string
  notes?: string
  items: CheckoutItem[]
  subtotal: number
  total_amount: number
  payment_proof_url?: string
}

export async function getStoreProducts(): Promise<StoreProduct[]> {
  // Use server client — RLS anon policy will filter is_available_online = true
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('id,name,description,online_description,category,selling_price,image_url,online_sort_order')
    .eq('is_available_online', true)
    .eq('is_active', true)
    .order('online_sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as StoreProduct[]
}

export async function getBestsellerProducts(limit = 6): Promise<StoreProduct[]> {
  const supabase = await createClient()
  // Get top products by qty sold, filtered to online-available ones
  const { data: topItems } = await supabase
    .from('sale_items')
    .select('product_id, quantity')
    .order('quantity', { ascending: false })
    .limit(50)

  if (!topItems || topItems.length === 0) return getStoreProducts()

  // Aggregate
  const totals: Record<string, number> = {}
  for (const item of topItems) {
    if (!item.product_id) continue
    totals[item.product_id] = (totals[item.product_id] ?? 0) + item.quantity
  }
  const topIds = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit * 2)
    .map(([id]) => id)

  const { data } = await supabase
    .from('products')
    .select('id,name,description,online_description,category,selling_price,image_url,online_sort_order')
    .eq('is_available_online', true)
    .eq('is_active', true)
    .in('id', topIds)
    .limit(limit)

  return (data ?? []) as StoreProduct[]
}

export async function submitOrder(
  input: CheckoutInput
): Promise<{ success?: boolean; error?: string; orderNumber?: string }> {
  const supabase = await createClient()

  // Generate order number via RPC
  const { data: orderNum, error: numErr } = await supabase
    .rpc('generate_order_number')
  if (numErr || !orderNum) return { error: 'Gagal membuat nomor order' }

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      order_number:     orderNum as string,
      customer_name:    input.customer_name,
      customer_phone:   input.customer_phone,
      customer_email:   input.customer_email ?? null,
      order_type:       input.order_type.toUpperCase() as 'PICKUP' | 'DELIVERY',
      pickup_date:      input.pickup_date ?? null,
      pickup_time:      input.pickup_time ?? null,
      delivery_address: input.delivery_address ?? null,
      notes:            input.notes ?? null,
      subtotal:         input.subtotal,
      discount_amount:  0,
      total_amount:     input.total_amount,
      status:           'pending',
      payment_status:   'UNPAID',
      payment_proof_url: input.payment_proof_url ?? null,
      source:           'portal',
    })
    .select()
    .single()

  if (orderErr) return { error: orderErr.message }

  // Insert order items
  const items = input.items.map((item) => ({
    order_id:     order.id,
    product_id:   item.product_id,
    product_name: item.product_name,
    quantity:     item.quantity,
    unit_price:   item.unit_price,
    subtotal:     item.subtotal,
    notes:        item.notes ?? null,
  }))

  const { error: itemsErr } = await supabase.from('order_items').insert(items)
  if (itemsErr) {
    // Rollback order
    await supabase.from('orders').delete().eq('id', order.id)
    return { error: itemsErr.message }
  }

  return { success: true, orderNumber: orderNum as string }
}

export async function trackOrder(orderNumber: string, phone: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('orders')
    .select('order_number,customer_name,customer_phone,status,payment_status,order_type,pickup_date,pickup_time,total_amount,created_at,order_items!order_items_order_id_fkey(product_name,quantity,unit_price,subtotal)')
    .eq('order_number', orderNumber.toUpperCase())
    .eq('customer_phone', phone)
    .maybeSingle()
  return data
}

export async function uploadPaymentProof(file: File): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient()
  const ext = file.name.split('.').pop()
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { data, error } = await supabase.storage
    .from('payment-proofs')
    .upload(filename, file, { contentType: file.type, upsert: false })

  if (error) return { error: error.message }

  const { data: { publicUrl } } = supabase.storage
    .from('payment-proofs')
    .getPublicUrl(data.path)

  return { url: publicUrl }
}
