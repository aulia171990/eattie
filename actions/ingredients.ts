'use server'

import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
const { error } = await supabase.from('ingredients').insert(payload)
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { TablesInsert, TablesUpdate } from '@/types/database'
import type {
  IngredientCategory,
  IngredientFilters,
  IngredientWithRelations,
  StockMovementWithRelations,
  Supplier,
  ActionState,
} from '@/types'

export async function getCategories(): Promise<IngredientCategory[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ingredient_categories')
    .select('id, name, name_en, description, created_at')
    .order('name')
  if (error) throw new Error(error.message)
  return data
}

export async function getIngredients(
  filters?: IngredientFilters
): Promise<IngredientWithRelations[]> {
  const supabase = await createClient()

  let query = supabase
    .from('ingredients')
    .select(
      'id,code,name,name_en,category_id,base_unit,purchase_unit,conversion_rate,current_stock,min_stock,max_stock,reorder_point,price_per_unit,last_purchase_price,average_price,shelf_life_days,storage_location,preferred_supplier_id,is_active,created_at,updated_at,ingredient_categories(id,name,name_en,description,created_at),suppliers:preferred_supplier_id(id,name,contact_person,phone,email,address,notes,is_active,created_at,updated_at)'
    )
    .order('name')

  if (filters?.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive)
  }
  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId)
  }
  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`
    )
  }
  if (filters?.lowStock) {
    // filter done client-side to avoid raw() compat issues
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as unknown as IngredientWithRelations[]
  if (filters?.lowStock) {
    return rows.filter((r) => r.current_stock <= r.min_stock)
  }
  return rows
}

export async function getIngredient(id: string): Promise<IngredientWithRelations> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ingredients')
    .select(
      'id,code,name,name_en,category_id,base_unit,purchase_unit,conversion_rate,current_stock,min_stock,max_stock,reorder_point,price_per_unit,last_purchase_price,average_price,shelf_life_days,storage_location,preferred_supplier_id,is_active,created_at,updated_at,ingredient_categories(id,name,name_en,description,created_at),suppliers:preferred_supplier_id(id,name,contact_person,phone,email,address,notes,is_active,created_at,updated_at)'
    )
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data as unknown as IngredientWithRelations
}

function parseIngredientForm(
  raw: Record<string, FormDataEntryValue>
): Omit<TablesInsert<'ingredients'>, 'id'> {
  return {
    name: raw.name as string,
    name_en: (raw.name_en as string) || null,
    category_id: (raw.category_id as string) || null,
    base_unit: raw.base_unit as string,
    purchase_unit: (raw.purchase_unit as string) || null,
    conversion_rate: parseFloat(raw.conversion_rate as string) || 1,
    current_stock: parseFloat(raw.current_stock as string) || 0,
    min_stock: parseFloat(raw.min_stock as string) || 0,
    max_stock: raw.max_stock ? parseFloat(raw.max_stock as string) : null,
    reorder_point: raw.reorder_point
      ? parseFloat(raw.reorder_point as string)
      : null,
    price_per_unit: parseFloat(raw.price_per_unit as string) || 0,
    shelf_life_days: raw.shelf_life_days
      ? parseInt(raw.shelf_life_days as string, 10)
      : null,
    storage_location: (raw.storage_location as string) || null,
    preferred_supplier_id: (raw.preferred_supplier_id as string) || null,
    is_active: true,
  }
}

export async function createIngredient(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const raw = Object.fromEntries(formData.entries())

  let code = (raw.code as string) || null
  if (!code) {
    const { count } = await supabase
      .from('ingredients')
      .select('id', { count: 'exact', head: true })
    code = `BHN-${String((count ?? 0) + 1).padStart(3, '0')}`
  }

  const payload: TablesInsert<'ingredients'> = { ...parseIngredientForm(raw), code }
  const { error } = await supabase.from('ingredients').insert(payload)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/inventory')
  redirect('/dashboard/inventory')
}

export async function updateIngredient(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const raw = Object.fromEntries(formData.entries())

  const payload: TablesUpdate<'ingredients'> = {
    ...parseIngredientForm(raw),
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase
    .from('ingredients')
    .update(payload)
    .eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/inventory')
  revalidatePath(`/dashboard/inventory/${id}`)
  redirect(`/dashboard/inventory/${id}`)
}

export async function deleteIngredient(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('ingredients')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
  revalidatePath('/dashboard/inventory')
}

export async function adjustStock(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi' }

  const ingredient_id = formData.get('ingredient_id') as string
  const movement_type = formData.get(
    'movement_type'
  ) as TablesInsert<'stock_movements'>['movement_type']
  const quantity = parseFloat(formData.get('quantity') as string)
  const reason = formData.get('reason') as string
  const notes = (formData.get('notes') as string) || null

  if (!ingredient_id) return { error: 'Pilih bahan baku' }
  if (!quantity || quantity <= 0) return { error: 'Jumlah harus > 0' }
  if (!reason) return { error: 'Alasan wajib diisi' }

  const { data: ing, error: fetchErr } = await supabase
    .from('ingredients')
    .select('current_stock, base_unit')
    .eq('id', ingredient_id)
    .single()
  if (fetchErr || !ing) return { error: 'Bahan tidak ditemukan' }

  const isIn = movement_type === 'adjustment_in'
  const stockBefore = ing.current_stock
  const stockAfter = isIn
    ? stockBefore + quantity
    : Math.max(0, stockBefore - quantity)

  const movPayload: TablesInsert<'stock_movements'> = {
    ingredient_id,
    movement_type,
    quantity: isIn ? quantity : -quantity,
    unit: ing.base_unit,
    stock_before: stockBefore,
    stock_after: stockAfter,
    reference_type: 'adjustment',
    reason,
    notes,
    created_by: user.id,
  }
  const { error: movErr } = await supabase
    .from('stock_movements')
    .insert(movPayload)
  if (movErr) return { error: movErr.message }

  const { error: upErr } = await supabase
    .from('ingredients')
    .update({ current_stock: stockAfter, updated_at: new Date().toISOString() })
    .eq('id', ingredient_id)
  if (upErr) return { error: upErr.message }

  revalidatePath('/dashboard/inventory')
  return { success: true }
}

export async function getStockMovements(
  ingredientId?: string,
  limit = 50
): Promise<StockMovementWithRelations[]> {
  const supabase = await createClient()

  let query = supabase
    .from('stock_movements')
    .select(
      'id,ingredient_id,movement_type,quantity,unit,stock_before,stock_after,reference_type,reference_id,batch_code,expiry_date,reason,notes,created_by,created_at,ingredients(name,base_unit),profiles:created_by(full_name)'
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (ingredientId) query = query.eq('ingredient_id', ingredientId)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as StockMovementWithRelations[]
}
