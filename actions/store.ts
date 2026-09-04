'use server'

import { createClient } from '@/lib/supabase/server'
import { sendNewOrderPushNotification } from '@/lib/push/send-new-order-push'
import type { ProductVariant, ProductAddon, StoreProductDetail } from '@/types/product-config'
import type { ProductGallery } from '@/types/product-config'

export interface StoreProduct {
  id: string
  name: string
  description: string | null
  online_description: string | null
  category: string | null
  selling_price: number
  image_url: string | null
  online_sort_order: number
  has_variants?: boolean
  rating?: number
  delivery_time?: string | null
}

export interface CheckoutItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
  notes?: string
  variant?: { variant_id: string; variant_name: string | null; variant_price: number | null }
  addon_ids?: string[]
  addons?: { addon_id: string; name: string; price: number }[]
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
    .select('id,name,description,online_description,category,selling_price,image_url,online_sort_order,variants:product_variants(id)')
    .eq('is_available_online', true)
    .eq('is_active', true)
    .order('online_sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map((p: any) => ({ ...p, has_variants: (p.variants ?? []).length > 0 }))
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

export async function getProductDetail(productId: string): Promise<StoreProductDetail | null> {
  const supabase = await createClient()

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, description, online_description, category, selling_price, image_url, online_sort_order')
    .eq('id', productId)
    .single()

  if (productError || !product) return null

  const { data: gallery, error: galleryError } = await supabase
    .from('product_gallery')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true })

  if (galleryError) throw new Error(galleryError.message)

  const { data: variants, error: variantsError } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (variantsError) throw new Error(variantsError.message)

  const { data: addons, error: addonsError } = await supabase
    .from('product_addons')
    .select('*')
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (addonsError) throw new Error(addonsError.message)

  // min_price: lowest active variant price; fall back to product base price when
  // no variants exist. Guard against Infinity so the store never shows "Infinity".
  const variantMin = variants.length > 0
    ? Math.min(...variants.map((v) => v.price))
    : Infinity
  const min_price = Number.isFinite(variantMin) ? variantMin : (product.selling_price ?? 0)

  return {
    ...product,
    variants: variants as unknown as ProductVariant[],
    addons: addons as unknown as ProductAddon[],
    gallery: gallery as unknown as ProductGallery[],
    min_price,
  } as StoreProductDetail
}

export async function getProductVariants(productId: string): Promise<ProductVariant[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as ProductVariant[]
}

export async function getProductAddons(productId: string): Promise<ProductAddon[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('product_addons')
    .select('*')
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as ProductAddon[]
}

export async function submitOrder(
  input: CheckoutInput
): Promise<{ success?: boolean; error?: string; orderNumber?: string; totalAmount?: number }> {
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

  // Fetch all variants (active) and addons (active) for these products in one batch
  const { data: variants, error: variantsErr } = await supabase
    .from('product_variants')
    .select('id, product_id, name, price, is_active')
    .in('product_id', productIds)
    .eq('is_active', true)

  if (variantsErr) return { error: 'Gagal memverifikasi varian produk' }

  const { data: addons, error: addonsErr } = await supabase
    .from('product_addons')
    .select('id, product_id, name, price, is_active')
    .in('product_id', productIds)
    .eq('is_active', true)

  if (addonsErr) return { error: 'Gagal memverifikasi add-on produk' }

  const variantMap = new Map((variants ?? []).map(v => [v.id, v]))
  const addonMap = new Map((addons ?? []).map(a => [a.id, a]))

  // ── STOCK PRE-CHECK (mirrors POS process_sale() validation) ──────────
  // Online orders must also refuse to be placed when stock is insufficient,
  // exactly like the POS cashier flow. Aggregate required qty per stock bucket
  // (variant_id OR product_id) so multiple cart lines for the same product/
  // variant are checked together, then validate against the live stock.
  const needByVariant = new Map<string, number>()
  const needByProduct = new Map<string, number>()
  for (const item of input.items) {
    const vid = item.variant?.variant_id && item.variant.variant_id !== 'default'
      ? item.variant.variant_id
      : null
    if (vid) {
      needByVariant.set(vid, (needByVariant.get(vid) ?? 0) + item.quantity)
    } else {
      needByProduct.set(item.product_id, (needByProduct.get(item.product_id) ?? 0) + item.quantity)
    }
  }

  if (needByVariant.size > 0) {
    const { data: vstock, error: vstockErr } = await supabase
      .from('product_variants')
      .select('id, product_id, name, stock')
      .in('id', [...needByVariant.keys()])
    if (vstockErr) return { error: 'Gagal memeriksa stok varian' }
    for (const v of (vstock ?? [])) {
      const need = needByVariant.get(v.id) ?? 0
      if (v.stock == null || v.stock < need) {
        return { error: `Stok varian "${v.name}" tidak cukup: dibutuhkan ${need}, tersedia ${v.stock ?? 0}` }
      }
    }
  }

  if (needByProduct.size > 0) {
    const { data: pstock, error: pstockErr } = await supabase
      .from('products')
      .select('id, name, current_stock')
      .in('id', [...needByProduct.keys()])
    if (pstockErr) return { error: 'Gagal memeriksa stok produk' }
    for (const p of (pstock ?? [])) {
      const need = needByProduct.get(p.id) ?? 0
      if (p.current_stock == null || p.current_stock < need) {
        return { error: `Stok "${p.name}" tidak cukup: dibutuhkan ${need}, tersedia ${p.current_stock ?? 0}` }
      }
    }
  }

  let verifiedSubtotal = 0
  const verifiedItems: {
    product_id: string
    product_name: string
    quantity: number
    unit_price: number
    subtotal: number
    notes?: string | null
    variant_id?: string | null
    variant_name?: string | null
    variant_price?: number | null
    addon_ids?: string[]
    addons?: { name: string; price: number }[]
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

    const itemVariant = item.variant ?? { variant_id: 'default', variant_name: null, variant_price: null }
    const hasCustomVariant = itemVariant.variant_id && itemVariant.variant_id !== 'default'
    const hasAddons = item.addons && item.addons.length > 0

    let basePrice = product.selling_price
    let variantId: string | null = null
    let variantName: string | null = null
    let variantPrice: number | null = null
    let selectedAddons: { name: string; price: number }[] = []

    if (hasCustomVariant) {
      const variant = variantMap.get(itemVariant.variant_id!)
      if (!variant || !variant.is_active) {
        return { error: `Varian tidak ditemukan atau tidak aktif: ${itemVariant.variant_name}` }
      }
      variantId = variant.id
      variantName = variant.name
      variantPrice = variant.price
      basePrice = variant.price
    }

    if (hasAddons) {
      for (const addon of item.addons!) {
        const addonRec = addonMap.get(addon.addon_id)
        // Audit #3.9: ensure the addon belongs to THIS product — a tampered
        // addon_id from another product must be rejected, not silently ignored.
        if (!addonRec || !addonRec.is_active || addonRec.product_id !== product.id) {
          return { error: `Add-on tidak valid untuk ${product.name}` }
        }
        selectedAddons.push({ name: addonRec.name, price: addonRec.price })
      }
    }

    const addonsSum = selectedAddons.reduce((s, a) => s + a.price, 0)
    const unitPrice = basePrice + addonsSum
    const subtotal = unitPrice * item.quantity

    verifiedSubtotal += subtotal
    verifiedItems.push({
      product_id:   product.id,
      product_name: product.name,
      quantity:     item.quantity,
      unit_price:   unitPrice,
      subtotal:     subtotal,
      notes:        item.notes ?? null,
      variant_id:   variantId ?? null,
      variant_name: variantName ?? null,
      variant_price: variantPrice ?? null,
      addon_ids:    hasAddons ? item.addon_ids : undefined,
      addons:       hasAddons ? selectedAddons : undefined,
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
  const items = verifiedItems.map(({ addon_ids, ...item }) => ({
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
    totalAmount: verifiedTotal,
  })

  return { success: true, orderNumber: orderNum as string, totalAmount: verifiedTotal }
}

export async function trackOrder(orderNumber: string, phone: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('track_order', {
    p_order_number: orderNumber.toUpperCase(),
    p_phone: phone,
  })
  if (error) return null
  return data as {
    id: string
    order_number: string
    status: string
    payment_status: string
    order_type: string
    pickup_date: string | null
    pickup_time: string | null
    total_amount: number
    customer_name: string
    created_at: string
    order_items: {
      product_id: string
      product_name: string
      quantity: number
      unit_price: number
      subtotal: number
    }[]
  } | null
}

export async function uploadPaymentProof(file: File): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient()
  // Reject non-images and oversized files to prevent storage abuse.
  if (!file.type.startsWith('image/')) {
    return { error: 'File bukti bayar harus berupa gambar' }
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: 'Ukuran file maksimal 5 MB' }
  }
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
