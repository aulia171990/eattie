'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import type { TablesInsert, TablesUpdate } from '@/types/database'
import type { StockOpnameWithRelations, ActionState } from '@/types'

export async function getOpnames(): Promise<StockOpnameWithRelations[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stock_opnames')
    .select(
      'id,opname_number,opname_date,status,notes,completed_at,created_by,approved_by,created_at,profiles:created_by(full_name),stock_opname_items(id,opname_id,ingredient_id,system_stock,actual_stock,difference,unit,reason,created_at,ingredients(id,name,base_unit))'
    )
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as StockOpnameWithRelations[]
}

export async function getOpname(id: string): Promise<StockOpnameWithRelations> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stock_opnames')
    .select(
      'id,opname_number,opname_date,status,notes,completed_at,created_by,approved_by,created_at,profiles:created_by(full_name),stock_opname_items(id,opname_id,ingredient_id,system_stock,actual_stock,difference,unit,reason,created_at,ingredients(id,name,base_unit))'
    )
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data as unknown as StockOpnameWithRelations
}

export async function createOpname(
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi' }

  const today = format(new Date(), 'yyyyMMdd')
  const { count } = await supabase
    .from('stock_opnames')
    .select('id', { count: 'exact', head: true })
    .like('opname_number', `OPN-${today}%`)

  const opnameNumber = `OPN-${today}-${String((count ?? 0) + 1).padStart(3, '0')}`

  const { data: ingredients, error: ingErr } = await supabase
    .from('ingredients')
    .select('id, current_stock, base_unit')
    .eq('is_active', true)
  if (ingErr) return { error: ingErr.message }

  const opnamePayload: TablesInsert<'stock_opnames'> = {
    opname_number: opnameNumber,
    opname_date: new Date().toISOString().split('T')[0],
    status: 'in_progress',
    created_by: user.id,
  }

  const { data: opname, error: opnErr } = await supabase
    .from('stock_opnames')
    .insert(opnamePayload)
    .select()
    .single()
  if (opnErr) return { error: opnErr.message }

  if (ingredients && ingredients.length > 0) {
    const items: TablesInsert<'stock_opname_items'>[] = ingredients.map((ing) => ({
      opname_id: opname.id,
      ingredient_id: ing.id,
      system_stock: ing.current_stock,
      unit: ing.base_unit,
    }))
    const { error: itemErr } = await supabase.from('stock_opname_items').insert(items)
    if (itemErr) return { error: itemErr.message }
  }

  revalidatePath('/dashboard/inventory/opname')
  redirect(`/dashboard/inventory/opname/${opname.id}`)
}

interface SubmitActual {
  item_id: string
  ingredient_id: string
  actual_stock: number
  reason?: string
}

/**
 * REFACTORED: submitOpname saves actual counts, then delegates
 * all stock adjustments + movements to process_stock_opname() RPC.
 */
export async function submitOpname(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi' }

  let actuals: SubmitActual[] = []
  try {
    actuals = JSON.parse(formData.get('actuals_json') as string) as SubmitActual[]
  } catch {
    return { error: 'Data tidak valid' }
  }

  // Step 1: Save actual counts to opname_items (data entry, not stock manipulation)
  for (const a of actuals) {
    const { data: item } = await supabase
      .from('stock_opname_items')
      .select('system_stock, unit')
      .eq('id', a.item_id)
      .single()
    if (!item) continue

    const itemUpdate: TablesUpdate<'stock_opname_items'> = {
      actual_stock: a.actual_stock,
      difference: a.actual_stock - item.system_stock,
      reason: a.reason ?? null,
    }
    await supabase.from('stock_opname_items').update(itemUpdate).eq('id', a.item_id)
  }

  // Step 2: Update approved_by before calling RPC
  await supabase
    .from('stock_opnames')
    .update({ approved_by: user.id })
    .eq('id', id)

  // Step 3: Call RPC — atomically adjusts all stock + inserts movements
  const { data: rpcData, error: rpcErr } = await supabase.rpc('process_stock_opname', {
    p_opname_id: id,
  })

  if (rpcErr) return { error: `Gagal menyelesaikan opname: ${rpcErr.message}` }

  const result = rpcData as unknown as { success?: boolean; error?: string }
  if (!result?.success) {
    return { error: result?.error ?? 'Gagal menyelesaikan opname' }
  }

  revalidatePath('/dashboard/inventory/opname')
  revalidatePath('/dashboard/inventory')
  redirect('/dashboard/inventory/opname')
}
