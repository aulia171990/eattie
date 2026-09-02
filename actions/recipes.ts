'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { TablesInsert, TablesUpdate } from '@/types/database'
import type { RecipeWithRelations, ActionState } from '@/types'
import { toIngredientBaseUnit } from '@/lib/units'

export async function getRecipes(): Promise<RecipeWithRelations[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('recipes')
    .select(
      'id,product_id,variant_id,yield_quantity,instructions,prep_time_minutes,bake_time_minutes,bake_temperature,created_at,updated_at,products(id,name,name_en,description,category,selling_price,cost_price,image_url,is_active,created_at,updated_at),variants:variant_id(id,name),recipe_ingredients(id,recipe_id,ingredient_id,quantity,unit,notes,ingredients:ingredient_id(id,name,base_unit,price_per_unit))'
    )
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as RecipeWithRelations[]
}

export async function getRecipe(id: string): Promise<RecipeWithRelations> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('recipes')
    .select(
      'id,product_id,variant_id,yield_quantity,instructions,prep_time_minutes,bake_time_minutes,bake_temperature,created_at,updated_at,products(id,name,name_en,description,category,selling_price,cost_price,image_url,is_active,created_at,updated_at),variants:variant_id(id,name),recipe_ingredients(id,recipe_id,ingredient_id,quantity,unit,notes,ingredients:ingredient_id(id,name,base_unit,price_per_unit))'
    )
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data as unknown as RecipeWithRelations
}

interface RecipeIngredientInput {
  ingredient_id: string
  quantity: number
  unit: string
  notes?: string
}

// Fetch base_unit of every ingredient referenced in this recipe so we can
// convert recipe quantities into each ingredient's base_unit before saving.
async function fetchBaseUnits(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[]
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map()
  const { data } = await supabase
    .from('ingredients')
    .select('id, base_unit')
    .in('id', ids)
  const map = new Map<string, string>()
  for (const row of (data ?? []) as { id: string; base_unit: string }[]) {
    map.set(row.id, row.base_unit)
  }
  return map
}

export async function upsertRecipe(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const raw = Object.fromEntries(formData.entries())

  let ingredients: RecipeIngredientInput[] = []
  try {
    ingredients = JSON.parse(raw.ingredients_json as string) as RecipeIngredientInput[]
  } catch {
    return { error: 'Data bahan tidak valid' }
  }
  if (ingredients.length === 0) return { error: 'Tambahkan minimal 1 bahan' }

  const variant_id = raw.variant_id as string
  const product_id = raw.product_id as string
  if (!product_id && !variant_id) return { error: 'Pilih produk atau varian' }

  // Audit #2.11: if a variant is supplied, ensure it belongs to the chosen
  // product so a recipe can't be bound to a variant of a different product.
  if (variant_id && product_id) {
    const { data: variant, error: vErr } = await supabase
      .from('product_variants')
      .select('id, product_id')
      .eq('id', variant_id)
      .single()
    if (vErr || !variant) return { error: 'Varian tidak ditemukan' }
    if (variant.product_id !== product_id) {
      return { error: 'Varian tidak cocok dengan produk yang dipilih' }
    }
  }

  const recipeData = {
    product_id: product_id || null,
    variant_id: variant_id || null,
    yield_quantity: parseInt(raw.yield_quantity as string, 10) || 1,
    instructions: (raw.instructions as string) || null,
    prep_time_minutes: raw.prep_time_minutes
      ? parseInt(raw.prep_time_minutes as string, 10)
      : null,
    bake_time_minutes: raw.bake_time_minutes
      ? parseInt(raw.bake_time_minutes as string, 10)
      : null,
    bake_temperature: raw.bake_temperature
      ? parseInt(raw.bake_temperature as string, 10)
      : null,
  }

  const recipeId = (raw.recipe_id as string) || null
  let finalRecipeId: string

  // ── VALIDATE BEFORE ANY MUTATION (audit #1.4) ──
  // Resolve each ingredient's base_unit so we can normalise recipe quantities,
  // and validate incompatibility (e.g. recipe says "g" but ingredient is "pcs")
  // up-front. Previously the conversion happened AFTER the recipe row / its
  // ingredients were already deleted, so a bad unit silently left a recipe with
  // zero ingredients (data loss). Now we fail fast before touching the DB.
  const baseUnitMap = await fetchBaseUnits(
    supabase,
    ingredients.map((i) => i.ingredient_id).filter(Boolean)
  )

  const ingRows: TablesInsert<'recipe_ingredients'>[] = []
  const conversionErrors: string[] = []
  for (const i of ingredients) {
    const baseUnit = baseUnitMap.get(i.ingredient_id) ?? i.unit
    const qtyBase = toIngredientBaseUnit(i.quantity, i.unit, baseUnit)
    if (qtyBase === null) {
      conversionErrors.push(
        `Satuan "${i.unit}" tidak cocok dengan satuan dasar bahan (${baseUnit})`
      )
      continue
    }
    ingRows.push({
      recipe_id: '', // placeholder, set after we have the id
      ingredient_id: i.ingredient_id,
      quantity: qtyBase,
      unit: baseUnit,
      notes: i.notes || null,
    })
  }
  if (conversionErrors.length > 0) {
    return { error: conversionErrors.join('; ') }
  }

  // ── NOW MUTATE (all rows validated) ──
  if (recipeId) {
    const upd: TablesUpdate<'recipes'> = {
      ...recipeData,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('recipes').update(upd).eq('id', recipeId)
    if (error) return { error: error.message }
    await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId)
    finalRecipeId = recipeId
  } else {
    const ins: TablesInsert<'recipes'> = recipeData
    const { data, error } = await supabase.from('recipes').insert(ins).select().single()
    if (error) return { error: error.message }
    finalRecipeId = data.id
  }

  // Stamp the validated ingredient rows with the real recipe id.
  for (const row of ingRows) row.recipe_id = finalRecipeId

  const { error: ingErr } = await supabase.from('recipe_ingredients').insert(ingRows)
  if (ingErr) return { error: ingErr.message }

  // Fetch ingredient prices for cost calculation (price_per_unit is per base_unit)
  const { data: ingredientsData } = await supabase
    .from('ingredients')
    .select('id, price_per_unit')
    .in('id', ingredients.map((i) => i.ingredient_id))
  const ingredientsMap = new Map(
    (ingredientsData ?? []).map((i) => [i.id, i.price_per_unit] as [string, number])
  )

  // Cost = sum over ingredients of (base_unit_quantity * price_per_unit).
  // Because we already converted to base_unit above, this is dimensionally correct.
  // Then divide by yield_quantity so cost_price reflects the cost PER UNIT of output,
  // not the cost of the whole batch (otherwise margin/HPP is overstated yield-fold).
  const batchCost = ingRows.reduce(
    // recipe_ingredients.ingredient_id is schema-nullable (no NULL rows currently in DB);
    // coerce to '' so Map.get stays a valid string key and falls back to 0 cost.
    (sum, row) => sum + (Number(row.quantity) * (ingredientsMap.get(row.ingredient_id ?? '') ?? 0)),
    0
  )
  const yieldQuantity = Math.max(1, recipeData.yield_quantity || 1)
  const totalCost = batchCost / yieldQuantity
  if (variant_id) {
    await supabase
      .from('product_variants')
      .update({ cost_price: totalCost, updated_at: new Date().toISOString() })
      .eq('id', variant_id)
  } else if (product_id) {
    await supabase
      .from('products')
      .update({ cost_price: totalCost, updated_at: new Date().toISOString() })
      .eq('id', product_id)
  }

  revalidatePath('/dashboard/recipes')
  redirect('/dashboard/recipes')
}

export async function deleteRecipe(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('recipes').delete().eq('id', id)
  revalidatePath('/dashboard/recipes')
}
