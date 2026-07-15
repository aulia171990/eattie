'use server'

import { createClient } from '@/lib/supabase/server'
import { sendNewOrderPushNotification } from '@/lib/push/send-new-order-push'

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

export interface FeaturedReview {
  id: string
  customer_name: string
  rating: number
  comment: string | null
  created_at: string
}

/**
 * Public storefront testimonials, curated by an admin via is_featured.
 * Uses the anon/public client path — RLS only exposes is_featured = true.
 * Returns [] when none are curated or the table is unreachable.
 */
export async function getFeaturedReviews(limit = 3): Promise<FeaturedReview[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('product_reviews')
    .select('id, customer_name, rating, comment, created_at')
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data as FeaturedReview[]
}

export async function getBestsellerProducts(limit = 6): Promise<StoreProduct[]> {
  const supabase = await createClient()

  // Cutoff: 30 days ago (wider window to capture more data)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Fetch order_items joined to recent non-cancelled orders
  // Note: filter on joined table uses neq with uppercase enum
  const { data: recentItems } = await supabase
    .from('order_items')
    .select('product_id, quantity, orders!order_items_order_id_fkey(created_at, status)')
    .limit(1000)

  // Aggregate total quantity per product_id (filter in JS for reliability)
  const totals: Record<string, number> = {}
  for (const item of recentItems ?? []) {
    if (!item.product_id) continue
    const order = Array.isArray(item.orders) ? item.orders[0] : item.orders
    if (!order) continue
    // Skip cancelled orders (check both uppercase and lowercase)
    const status = (order.status ?? '').toUpperCase()
    if (status === 'CANCELLED') continue
    // Skip orders older than cutoff
    if (order.created_at && order.created_at < since) continue
    totals[item.product_id] = (totals[item.product_id] ?? 0) + item.quantity
  }

  const topIds = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit * 2)
    .map(([id]) => id)

  // Fallback: no sales data — show active online products instead
  if (topIds.length === 0) return getStoreProducts()

  const { data } = await supabase
    .from('products')
    .select('id,name,description,online_description,category,selling_price,image_url,online_sort_order')
    .eq('is_available_online', true)
    .eq('is_active', true)
    .in('id', topIds)
    .limit(limit)

  if (!data || data.length === 0) return getStoreProducts()

  // Re-sort by sales rank (.in() doesn't preserve order)
  const ranked = [...data].sort((a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0))
  return ranked as StoreProduct[]
}

export async function submitOrder(
  input: CheckoutInput
): Promise<{ success?: boolean; error?: string; orderNumber?: string }> {
  const supabase = await createClient()

  if (!input.items || input.items.length === 0) {
    return { error: 'Keranjang kosong' }
  }

  // ── SECURITY: never trust client-supplied prices ──────────────
  // Re-fetch each product's real price from the database and
  // recompute subtotal/total server-side. Ignore whatever price
  // the client sent — it can be tampered with via devtools/direct
  // API calls.
  const productIds = input.items.map(i => i.product_id)
  const { data: products, error: productsErr } = await supabase
    .from('products')
    .select('id, name, selling_price, is_available_online, is_active')
    .in('id', productIds)

  if (productsErr) return { error: 'Gagal memverifikasi produk' }

  const productMap = new Map((products ?? []).map(p => [p.id, p]))

  let verifiedSubtotal = 0
  const verifiedItems: {
    product_id: string
    product_name: string
    quantity: number
    unit_price: number
    subtotal: number
    notes: string | null
  }[] = []

  for (const item of input.items) {
    const product = productMap.get(item.product_id)

    if (!product) {
      return { error: `Produk tidak ditemukan: ${item.product_name}` }
    }
    if (!product.is_active || !product.is_available_online) {
      return { error: `Produk sedang tidak tersedia: ${product.name}` }
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return { error: `Jumlah tidak valid untuk: ${product.name}` }
    }

    const realUnitPrice = product.selling_price
    const realSubtotal = realUnitPrice * item.quantity

    verifiedSubtotal += realSubtotal
    verifiedItems.push({
      product_id:   product.id,
      product_name: product.name,
      quantity:     item.quantity,
      unit_price:   realUnitPrice,
      subtotal:     realSubtotal,
      notes:        item.notes ?? null,
    })
  }

  const verifiedTotal = verifiedSubtotal // adjust here if discounts/fees are added later

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
      subtotal:         verifiedSubtotal,
      discount_amount:  0,
      total_amount:     verifiedTotal,
      status:           'NEW',
      payment_status:   'UNPAID',
      payment_proof_url: input.payment_proof_url ?? null,
      source:           'portal',
    })
    .select()
    .single()

  if (orderErr) return { error: orderErr.message }

  // Insert order items — using server-verified prices, not client input
  const items = verifiedItems.map((item) => ({
    order_id: order.id,
    ...item,
  }))

  const { error: itemsErr } = await supabase.from('order_items').insert(items)
  if (itemsErr) {
    // Rollback order
    await supabase.from('orders').delete().eq('id', order.id)
    return { error: itemsErr.message }
  }

  void sendNewOrderPushNotification({
    orderId: order.id,
    orderNumber: orderNum as string,
    customerName: input.customer_name,
    totalAmount: input.total_amount,
  })

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
