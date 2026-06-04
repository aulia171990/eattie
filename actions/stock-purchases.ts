'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import type { TablesInsert, TablesUpdate } from '@/types/database'
import type { StockPurchaseWithRelations, ActionState } from '@/types'

export async function getPurchases(): Promise<StockPurchaseWithRelations[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stock_purchases')
    .select(
      'id,purchase_number,supplier_id,purchase_date,received_date,subtotal,tax_amount,discount_amount,total_amount,payment_status,payment_due_date,notes,invoice_number,status,created_by,created_at,updated_at,suppliers:supplier_id(name),stock_purchase_items(id,purchase_id,ingredient_id,quantity_ordered,quantity_received,unit,unit_price,discount_percent,subtotal,expiry_date,batch_code,created_at,ingredients:ingredient_id(name,base_unit))'
    )
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as StockPurchaseWithRelations[]
}

export async function getPurchase(id: string): Promise<StockPurchaseWithRelations> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stock_purchases')
    .select(
      'id,purchase_number,supplier_id,purchase_date,received_date,subtotal,tax_amount,discount_amount,total_amount,payment_status,payment_due_date,notes,invoice_number,status,created_by,created_at,updated_at,suppliers:supplier_id(name),stock_purchase_items(id,purchase_id,ingredient_id,quantity_ordered,quantity_received,unit,unit_price,discount_percent,subtotal,expiry_date,batch_code,created_at,ingredients:ingredient_id(name,base_unit))'
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi' }

  const raw = Object.fromEntries(formData.entries())

  let items: PurchaseItemInput[] = []
  try {
    items = JSON.parse(raw.items_json as string) as PurchaseItemInput[]
  } catch {
    return { error: 'Data item tidak valid' }
  }
  if (items.length === 0) return { error: 'Tambahkan minimal 1 item' }

  const today = format(new Date(), 'yyyyMMdd')
  const { count } = await supabase
    .from('stock_purchases')
    .select('id', { count: 'exact', head: true })
    .like('purchase_number', `PO-${today}%`)
  const purchaseNumber = `PO-${today}-${String((count ?? 0) + 1).padStart(3, '0')}`

  const subtotal = items.reduce((sum, i) => {
    const disc = 1 - (i.discount_percent ?? 0) / 100
    return sum + i.quantity_ordered * i.unit_price * disc
  }, 0)

  const poPayload: TablesInsert<'stock_purchases'> = {
    purchase_number: purchaseNumber,
    supplier_id: (raw.supplier_id as string) || null,
    purchase_date: raw.purchase_date as string,
    payment_due_date: (raw.payment_due_date as string) || null,
    notes: (raw.notes as string) || null,
    invoice_number: (raw.invoice_number as string) || null,
    status: (raw.status as TablesInsert<'stock_purchases'>['status']) ?? 'ordered',
    subtotal,
    total_amount: subtotal,
    created_by: user.id,
  }

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi' }

  let receivedItems: ReceivedItemInput[] = []
  try {
    receivedItems = JSON.parse(formData.get('received_json') as string) as ReceivedItemInput[]
  } catch {
    return { error: 'Data tidak valid' }
  }

  for (const item of receivedItems) {
    // update item qty
    await supabase
      .from('stock_purchase_items')
      .update({ quantity_received: item.quantity_received })
      .eq('id', item.item_id)

    if (item.quantity_received <= 0) continue

    // get current stock
    const { data: ing } = await supabase
      .from('ingredients')
      .select('current_stock, base_unit')
      .eq('id', item.ingredient_id)
      .single()
    if (!ing) continue

    const stockBefore = ing.current_stock
    const stockAfter = stockBefore + item.quantity_received

    // record movement
    const movPayload: TablesInsert<'stock_movements'> = {
      ingredient_id: item.ingredient_id,
      movement_type: 'purchase_in',
      quantity: item.quantity_received,
      unit: item.unit,
      stock_before: stockBefore,
      stock_after: stockAfter,
      reference_type: 'purchase',
      reference_id: purchaseId,
      expiry_date: item.expiry_date || null,
      created_by: user.id,
    }
    await supabase.from('stock_movements').insert(movPayload)

    // update stock + last purchase price
    const ingUpdate: TablesUpdate<'ingredients'> = {
      current_stock: stockAfter,
      last_purchase_price: item.unit_price,
      updated_at: new Date().toISOString(),
    }
    await supabase.from('ingredients').update(ingUpdate).eq('id', item.ingredient_id)
  }

  const poUpdate: TablesUpdate<'stock_purchases'> = {
    status: 'received',
    received_date: new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString(),
  }
  await supabase.from('stock_purchases').update(poUpdate).eq('id', purchaseId)

  revalidatePath('/dashboard/inventory/purchases')
  redirect('/dashboard/inventory/purchases')
}
