'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { TablesInsert, TablesUpdate } from '@/types/database'
import type { StockPurchaseWithRelations, ActionState } from '@/types'
import { requireRole } from '@/lib/auth'

export async function getPurchases(): Promise<StockPurchaseWithRelations[]> {
  const auth = await requireRole(['owner'])
  if (auth.error) return []
  const { supabase } = auth
  
  const { data, error } = await supabase
    .from('stock_purchases')
    .select(
      'id,purchase_number,supplier_id,purchase_date,received_date,subtotal,tax_amount,discount_amount,total_amount,payment_status,payment_due_date,notes,invoice_number,status,approved_by,approved_at,created_by,created_at,updated_at,suppliers:supplier_id(name),stock_purchase_items(id,purchase_id,ingredient_id,quantity_ordered,quantity_received,unit,unit_price,discount_percent,subtotal,expiry_date,batch_code,created_at,ingredients:ingredient_id(name,base_unit))'
    )
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as StockPurchaseWithRelations[]
}

export async function getPurchase(id: string): Promise<StockPurchaseWithRelations> {
  const auth = await requireRole(['owner'])
  if (auth.error) throw new Error('Tidak memiliki akses')
  const { supabase } = auth
  
  const { data, error } = await supabase
    .from('stock_purchases')
    .select(
      'id,purchase_number,supplier_id,purchase_date,received_date,subtotal,tax_amount,discount_amount,total_amount,payment_status,payment_due_date,notes,invoice_number,status,approved_by,approved_at,created_by,created_at,updated_at,suppliers:supplier_id(name),stock_purchase_items(id,purchase_id,ingredient_id,quantity_ordered,quantity_received,unit,unit_price,discount_percent,subtotal,expiry_date,batch_code,created_at,ingredients:ingredient_id(name,base_unit))'
    )
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data as unknown as StockPurchaseWithRelations
}

interface PurchaseItemInput {
  ingredient_id: string
  quantity_ordered: number
  unit: string
  unit_price: number
  discount_percent: number
  expiry_date?: string
  batch_code?: string
}

export async function createPurchase(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const auth = await requireRole(['owner'])
  if (auth.error) return { error: auth.error }
  const { supabase, user } = auth

  const raw = Object.fromEntries(formData.entries())

  let items: PurchaseItemInput[] = []
  try {
    items = JSON.parse(raw.items_json as string) as PurchaseItemInput[]
  } catch {
    return { error: 'Data item tidak valid' }
  }
  if (items.length === 0) return { error: 'Tambahkan minimal 1 item' }

  const { data: purchaseNumber, error: pnErr } = await (supabase.rpc as any)('next_doc_number', {
    p_prefix: 'PO',
    p_table: 'stock_purchases',
    p_column: 'purchase_number',
  })
  if (pnErr || !purchaseNumber) return { error: 'Gagal membuat nomor PO' }

  const subtotal = items.reduce((sum, i) => {
    const disc = 1 - (i.discount_percent ?? 0) / 100
    return sum + i.quantity_ordered * i.unit_price * disc
  }, 0)

  const poPayload = {
    purchase_number: purchaseNumber,
    supplier_id: (raw.supplier_id as string) || null,
    purchase_date: raw.purchase_date as string,
    payment_due_date: (raw.payment_due_date as string) || null,
    notes: (raw.notes as string) || null,
    invoice_number: (raw.invoice_number as string) || null,
    status: raw.status === 'draft' ? 'draft' : 'ordered',
    subtotal,
    total_amount: subtotal,
    created_by: user.id,
  } as TablesInsert<'stock_purchases'>

  const { data: po, error: poErr } = await supabase
    .from('stock_purchases')
    .insert(poPayload)
    .select()
    .single()
  if (poErr) return { error: poErr.message }

  const itemRows: TablesInsert<'stock_purchase_items'>[] = items.map((item) => ({
    purchase_id: po.id,
    ingredient_id: item.ingredient_id,
    quantity_ordered: item.quantity_ordered,
    quantity_received: 0,
    unit: item.unit,
    unit_price: item.unit_price,
    discount_percent: item.discount_percent ?? 0,
    subtotal:
      item.quantity_ordered *
      item.unit_price *
      (1 - (item.discount_percent ?? 0) / 100),
    expiry_date: item.expiry_date || null,
    batch_code: item.batch_code || null,
  }))

  const { error: itemErr } = await supabase
    .from('stock_purchase_items')
    .insert(itemRows)
  if (itemErr) return { error: itemErr.message }

  revalidatePath('/dashboard/inventory/purchases')
  redirect('/dashboard/inventory/purchases')
}

interface ReceivedItemInput {
  item_id: string
  ingredient_id: string
  quantity_received: number
  unit: string
  unit_price: number
  expiry_date?: string
}

export async function receivePurchase(
  purchaseId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const auth = await requireRole(['owner'])
  if (auth.error) return { error: auth.error }
  const { supabase, user } = auth

  let receivedItems: ReceivedItemInput[] = []
  try {
    receivedItems = JSON.parse(formData.get('received_json') as string) as ReceivedItemInput[]
  } catch {
    return { error: 'Data tidak valid' }
  }

  // Set approved_by on the purchase
  const { error: approveErr } = await supabase
    .from('stock_purchases')
    .update({
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    } as TablesUpdate<'stock_purchases'>)
    .eq('id', purchaseId)
  if (approveErr) return { error: `Gagal approve PO: ${approveErr.message}` }

  const priorReceived = new Map<string, number>()
  for (const item of receivedItems) {
    const { data: before } = await supabase
      .from('stock_purchase_items')
      .select('quantity_received')
      .eq('id', item.item_id)
      .maybeSingle()
    priorReceived.set(item.item_id, before?.quantity_received ?? 0)

    const { error } = await supabase
      .from('stock_purchase_items')
      .update({ quantity_received: item.quantity_received })
      .eq('id', item.item_id)
    if (error) return { error: `Gagal update item: ${error.message}` }
  }

  const { data, error: rpcErr } = await supabase
    .rpc('process_purchase', { p_purchase_id: purchaseId })

  if (rpcErr) {
    for (const item of receivedItems) {
      const prev = priorReceived.get(item.item_id) ?? 0
      await supabase
        .from('stock_purchase_items')
        .update({ quantity_received: prev })
        .eq('id', item.item_id)
    }
    // Rollback approval
    await supabase
      .from('stock_purchases')
      .update({ approved_by: null, approved_at: null } as TablesUpdate<'stock_purchases'>)
      .eq('id', purchaseId)
    return { error: `Gagal memproses penerimaan: ${rpcErr.message}` }
  }

  const result = data as unknown as { success?: boolean; error?: string }
  if (!result?.success) {
    for (const item of receivedItems) {
      const prev = priorReceived.get(item.item_id) ?? 0
      await supabase
        .from('stock_purchase_items')
        .update({ quantity_received: prev })
        .eq('id', item.item_id)
    }
    await supabase
      .from('stock_purchases')
      .update({ approved_by: null, approved_at: null } as TablesUpdate<'stock_purchases'>)
      .eq('id', purchaseId)
    return { error: result?.error ?? 'Gagal memproses penerimaan barang' }
  }

  revalidatePath('/dashboard/inventory/purchases')
  revalidatePath('/dashboard/inventory')
  redirect('/dashboard/inventory/purchases')
}

export async function approveReceive(
  purchaseId: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  const auth = await requireRole(['owner'])
  if (auth.error) return { error: auth.error }
  const { supabase, user } = auth

  const { error } = await supabase
    .from('stock_purchases')
    .update({
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    } as TablesUpdate<'stock_purchases'>)
    .eq('id', purchaseId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/inventory/purchases')
  return { success: true }
}
