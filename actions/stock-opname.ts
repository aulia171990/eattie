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

  for (const a of actuals) {
    const { data: item } = await supabase
      .from('stock_opname_items')
      .select('system_stock, unit')
      .eq('id', a.item_id)
      .single()
    if (!item) continue

    const diff = a.actual_stock - item.system_stock

    const itemUpdate: TablesUpdate<'stock_opname_items'> = {
      actual_stock: a.actual_stock,
      difference: diff,
      reason: a.reason ?? null,
    }
    await supabase.from('stock_opname_items').update(itemUpdate).eq('id', a.item_id)

    if (diff !== 0) {
      const movType: TablesInsert<'stock_movements'>['movement_type'] =
        diff > 0 ? 'adjustment_in' : 'adjustment_out'
      const movPayload: TablesInsert<'stock_movements'> = {
        ingredient_id: a.ingredient_id,
        movement_type: movType,
        quantity: diff,
        unit: item.unit,
        stock_before: item.system_stock,
        stock_after: a.actual_stock,
        reference_type: 'opname',
        reference_id: id,
        reason: a.reason ?? 'Stock opname adjustment',
        created_by: user.id,
      }
      await supabase.from('stock_movements').insert(movPayload)
      await supabase
        .from('ingredients')
        .update({ current_stock: a.actual_stock, updated_at: new Date().toISOString() })
        .eq('id', a.ingredient_id)
    }
  }

  const opnameUpdate: TablesUpdate<'stock_opnames'> = {
    status: 'completed',
    completed_at: new Date().toISOString(),
    approved_by: user.id,
  }
  await supabase.from('stock_opnames').update(opnameUpdate).eq('id', id)

  revalidatePath('/dashboard/inventory/opname')
  redirect('/dashboard/inventory/opname')
}
