'use server'

import { createClient } from '@/lib/supabase/server'
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
    // Audit #4: escape LIKE wildcards so a search containing % or _ doesn't
    // break the query or act as a wildcard.
    const escaped = filters.search.replace(/[%_]/g, '\\$&')
    query = query.or(
      `name.ilike.%${escaped}%,code.ilike.%${escaped}%`
    )
  }
  if (filters?.lowStock) {
    // filter done client-side to avoid raw() compat issues
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as unknown as IngredientWithRelations[]
  if (filters?.lowStock) {
    // ingredients.min_stock is nullable in schema (though currently no NULL rows in DB);
    // guard with ?? 0 to keep the low-stock filter safe for future NULL inserts.
    return rows.filter((r) => r.current_stock <= (r.min_stock ?? 0))
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
    // Audit #3.13: only default to 1 when the value is not a number. A literal
    // 0 must be preserved (not silently coerced to 1) so bad data is caught.
    conversion_rate: (() => {
      const v = parseFloat(raw.conversion_rate as string)
      return Number.isNaN(v) ? 1 : v
    })(),
    // NOTE: current_stock is intentionally NOT read from the form. Stock for
    // raw ingredients must only change via purchases (process_purchase) or
    // stock opname — never directly edited here. The DB column is NOT NULL
    // DEFAULT 0 (migration 000033), so new rows start at 0.
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi' }
  const raw = Object.fromEntries(formData.entries())

  let code = (raw.code as string) || null
  if (!code) {
    // Atomic sequence (audit #1.6) — avoids duplicate BHN-NNN under concurrency.
    // Uses the same per-day lock style but BHN has no date prefix, so we pass a
    // stable prefix and rely on the advisory lock for uniqueness across inserts.
    const { data: genCode, error: codeErr } = await (supabase.rpc as any)(
      'next_doc_number',
      { p_prefix: 'BHN', p_table: 'ingredients', p_column: 'code' }
    )
    if (codeErr || !genCode) return { error: 'Gagal membuat kode bahan' }
    code = genCode as string
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi' }
  const raw = Object.fromEntries(formData.entries())

  const parsed = parseIngredientForm(raw)
  const payload: TablesUpdate<'ingredients'> = {
    ...parsed,
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase
    .from('ingredients')
    .update(payload)
    .eq('id', id)
  if (error) return { error: error.message }

  // current_stock is NOT updated from the form (see parseIngredientForm).
  // Stock for raw ingredients may only change via purchases (process_purchase)
  // or stock opname. Editing the ingredient must never move stock directly.

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
