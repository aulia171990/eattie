'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { TablesInsert, TablesUpdate } from '@/types/database'
import type { RecipeWithRelations, ActionState } from '@/types'

export async function getRecipes(): Promise<RecipeWithRelations[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('recipes')
    .select(
      'id,product_id,yield_quantity,instructions,prep_time_minutes,bake_time_minutes,bake_temperature,created_at,updated_at,products(id,name,name_en,description,category,selling_price,cost_price,image_url,is_active,created_at,updated_at),recipe_ingredients(id,recipe_id,ingredient_id,quantity,unit,notes,ingredients:ingredient_id(id,name,base_unit,price_per_unit))'
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
      'id,product_id,yield_quantity,instructions,prep_time_minutes,bake_time_minutes,bake_temperature,created_at,updated_at,products(id,name,name_en,description,category,selling_price,cost_price,image_url,is_active,created_at,updated_at),recipe_ingredients(id,recipe_id,ingredient_id,quantity,unit,notes,ingredients:ingredient_id(id,name,base_unit,price_per_unit))'
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

  const product_id = raw.product_id as string
  if (!product_id) return { error: 'Pilih produk' }

  const recipeData = {
    product_id,
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

  const ingRows: TablesInsert<'recipe_ingredients'>[] = ingredients.map((i) => ({
    recipe_id: finalRecipeId,
    ingredient_id: i.ingredient_id,
    quantity: i.quantity,
    unit: i.unit,
    notes: i.notes || null,
  }))
  const { error: ingErr } = await supabase.from('recipe_ingredients').insert(ingRows)
  if (ingErr) return { error: ingErr.message }

  // Recalculate and update product cost_price
  const totalCost = ingredients.reduce((sum, _i) => sum + 0, 0) // placeholder
  await supabase
    .from('products')
    .update({ cost_price: totalCost, updated_at: new Date().toISOString() })
    .eq('id', product_id)

  revalidatePath('/dashboard/recipes')
  redirect('/dashboard/recipes')
}

export async function deleteRecipe(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('recipes').delete().eq('id', id)
  revalidatePath('/dashboard/recipes')
}
