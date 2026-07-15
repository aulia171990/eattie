'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import type { TablesInsert, TablesUpdate } from '@/types/database'
import type { SaleWithRelations, SaleFilters, ActionState } from '@/types'

export interface CartItemInput {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
  batch_id?: string
}

export interface CreateSaleInput {
  items: CartItemInput[]
  subtotal: number
  discount_amount: number
  discount_percent: number
  tax_amount: number
  total: number
  payment_method: 'cash' | 'card' | 'transfer' | 'qris'
  payment_amount: number
  change_amount: number
  customer_name?: string
  notes?: string
}

/**
 * REFACTORED: createSale now uses process_sale() RPC.
 * Flow:
 * 1. Insert sale record (status: 'pending', stock_deducted: false)
 * 2. Insert sale_items
 * 3. Call process_sale() RPC → validates stock, deducts stock, computes COGS, marks completed
 *
 * This prevents:
 * - Selling without stock (validated inside DB transaction)
 * - Double-submit (stock_deducted flag prevents re-processing)
 * - Race conditions (FOR UPDATE locks inside RPC)
 */
export async function createSale(
  input: CreateSaleInput
): Promise<{ error?: string; success?: boolean; invoiceNumber?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi' }

  if (!input.items || input.items.length === 0) {
    return { error: 'Keranjang kosong' }
  }

  // ── SECURITY: never trust client-supplied prices ──────────────
  // Re-fetch each product's real selling_price from the database and
  // recompute subtotal server-side. Ignore whatever price the client
  // sent (cart-context.tsx) — it can be tampered with via devtools.
  const productIds = input.items.map((i) => i.product_id)
  const { data: products, error: productsErr } = await supabase
    .from('products')
    .select('id, name, selling_price, is_active')
    .in('id', productIds)

  if (productsErr) return { error: 'Gagal memverifikasi produk' }

  const productMap = new Map((products ?? []).map((p) => [p.id, p]))

  let verifiedSubtotal = 0
  const verifiedItems: {
    product_id: string
    product_name: string
    quantity: number
    unit_price: number
    subtotal: number
    batch_id?: string
  }[] = []

  for (const item of input.items) {
    const product = productMap.get(item.product_id)
    if (!product) {
      return { error: `Produk tidak ditemukan: ${item.product_name}` }
    }
    if (!product.is_active) {
      return { error: `Produk sedang tidak tersedia: ${product.name}` }
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return { error: `Jumlah tidak valid untuk: ${product.name}` }
    }

    const realUnitPrice = product.selling_price
    const realSubtotal = realUnitPrice * item.quantity

    verifiedSubtotal += realSubtotal
    verifiedItems.push({
      product_id: product.id,
      product_name: product.name,
      quantity: item.quantity,
      unit_price: realUnitPrice,
      subtotal: realSubtotal,
      batch_id: item.batch_id || undefined,
    })
  }

  // Discount/tax are cashier policy (legit), but recompute total from
  // the verified subtotal so a tampered subtotal can't inflate the sale.
  const verifiedTotal = Math.max(
    0,
    verifiedSubtotal - (input.discount_amount ?? 0) + (input.tax_amount ?? 0)
  )
  // Recompute change so it's always consistent with the verified total.
  const verifiedChange = Math.max(0, (input.payment_amount ?? 0) - verifiedTotal)

  // Generate invoice number via DB function — race-condition safe
  const { data: invData, error: invErr } = await supabase
    .rpc('generate_invoice_number')
  if (invErr || !invData) return { error: 'Gagal membuat nomor invoice' }
  const invoiceNumber = invData as string

  // Step 1: Insert sale as 'pending' — RPC will mark it 'completed'
  const salePayload: TablesInsert<'sales'> = {
    invoice_number: invoiceNumber,
    subtotal: verifiedSubtotal,
    discount_amount: input.discount_amount,
    discount_percent: input.discount_percent,
    tax_amount: input.tax_amount,
    total: verifiedTotal,
    payment_method: input.payment_method,
    payment_amount: input.payment_amount,
    change_amount: verifiedChange,
    customer_name: input.customer_name || null,
    notes: input.notes || null,
    status: 'pending',    // RPC will set to 'completed'
    cashier_id: user.id,
  }

  const { data: sale, error: saleErr } = await supabase
    .from('sales')
    .insert(salePayload)
    .select()
    .single()
  if (saleErr) return { error: saleErr.message }

  // Step 2: Insert sale items — using server-verified prices, not client input
  const itemRows: TablesInsert<'sale_items'>[] = verifiedItems.map((item) => ({
    sale_id: sale.id,
    product_id: item.product_id,
    batch_id: item.batch_id || null,
    product_name: item.product_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    subtotal: item.subtotal,
  }))

  const { error: itemErr } = await supabase.from('sale_items').insert(itemRows)
  if (itemErr) {
    // Rollback: cancel the sale if items insert fails
    await supabase.from('sales').update({ status: 'cancelled' }).eq('id', sale.id)
    return { error: itemErr.message }
  }

  // Step 3: Call process_sale() RPC — validates + deducts stock atomically
  const { data: rpcData, error: rpcErr } = await supabase.rpc('process_sale', {
    p_sale_id: sale.id,
  })

  if (rpcErr) {
    // Rollback: cancel the sale so stock is not double-deducted on retry
    await supabase.from('sales').update({ status: 'cancelled' }).eq('id', sale.id)
    return { error: `Stok tidak mencukupi atau gagal diproses: ${rpcErr.message}` }
  }

  const result = rpcData as unknown as { success?: boolean; error?: string }
  if (!result?.success) {
    await supabase.from('sales').update({ status: 'cancelled' }).eq('id', sale.id)
    return { error: result?.error ?? 'Gagal memproses penjualan' }
  }

  revalidatePath('/dashboard/sales')
  revalidatePath('/dashboard')
  return { success: true, invoiceNumber }
}

export async function getSales(filters?: SaleFilters): Promise<SaleWithRelations[]> {
  const supabase = await createClient()

  let query = supabase
    .from('sales')
    .select(
      'id,invoice_number,subtotal,discount_amount,discount_percent,tax_amount,total,payment_method,payment_amount,change_amount,customer_name,notes,status,cashier_id,created_at,cogs,gross_profit,profiles:cashier_id(full_name),sale_items(id,sale_id,product_id,batch_id,product_name,quantity,unit_price,subtotal,created_at,products:product_id(name,category))'
    )
    .order('created_at', { ascending: false })
    .limit(100)

  if (filters?.search) {
    query = query.or(
      `invoice_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`
    )
  }
  if (filters?.dateFrom) query = query.gte('created_at', `${filters.dateFrom}T00:00:00`)
  if (filters?.dateTo) query = query.lte('created_at', `${filters.dateTo}T23:59:59`)
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status as NonNullable<TablesInsert<'sales'>['status']>)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as SaleWithRelations[]
}

export async function getSale(id: string): Promise<SaleWithRelations> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sales')
    .select(
      'id,invoice_number,subtotal,discount_amount,discount_percent,tax_amount,total,payment_method,payment_amount,change_amount,customer_name,notes,status,cashier_id,created_at,cogs,gross_profit,profiles:cashier_id(full_name),sale_items(id,sale_id,product_id,batch_id,product_name,quantity,unit_price,subtotal,created_at,products:product_id(name,category))'
    )
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data as unknown as SaleWithRelations
}

export async function voidSale(id: string, reason?: string): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi' }

  const { data, error } = await supabase.rpc('void_sale', {
    p_sale_id: id,
    p_user_id: user.id,
    ...(reason ? { p_reason: reason } : {}),
  })

  if (error) return { error: `Gagal membatalkan transaksi: ${error.message}` }

  const result = data as unknown as { success?: boolean; stock_reversed?: boolean }
  if (!result?.success) return { error: 'Gagal membatalkan transaksi' }

  revalidatePath('/dashboard/sales')
  revalidatePath('/dashboard/inventory')
  revalidatePath('/dashboard')
  return { success: true }
}
