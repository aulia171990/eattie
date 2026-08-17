'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { TablesInsert, TablesUpdate } from '@/types/database'
import type { Product, ActionState } from '@/types'
import type { ProductCategory } from '@/types/product-config'

export async function getProducts(activeOnly = false): Promise<Product[]> {
  const supabase = await createClient()
  let query = supabase.from('products').select('*').order('name')
  if (activeOnly) query = query.eq('is_active', true)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function getProduct(id: string): Promise<Product> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function createProduct(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const raw = Object.fromEntries(formData.entries())

  const payload: TablesInsert<'products'> = {
    name: raw.name as string,
    name_en: (raw.name_en as string) || null,
    description: (raw.description as string) || null,
    category: (raw.category as string) || null,
    selling_price: parseFloat(raw.selling_price as string) || 0,
    cost_price: parseFloat(raw.cost_price as string) || 0,
    image_url: (raw.image_url as string) || null,
    is_active: raw.is_active !== 'false',
    is_available_online: raw.is_available_online === 'on' || raw.is_available_online === 'true',
    online_description: (raw.online_description as string) || null,
  }

  if (!payload.name) return { error: 'Nama produk wajib diisi' }

  const { error } = await supabase.from('products').insert(payload)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/products')
  redirect('/dashboard/products')
}

export async function updateProduct(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const raw = Object.fromEntries(formData.entries())

  // Fetch existing values to preserve image_url and is_active if not sent by form
  const { data: existing } = await supabase
    .from('products')
    .select('image_url, is_active')
    .eq('id', id)
    .single()

  // is_active: preserve existing value when the form doesn't send this field.
  // The product form has no is_active checkbox, so raw.is_active is always undefined
  // during image/detail updates — without this fix every save deactivates the product.
  const isActive = raw.is_active !== undefined
    ? raw.is_active === 'true'
    : (existing?.is_active ?? true)

  const payload: TablesUpdate<'products'> = {
    name: raw.name as string,
    name_en: (raw.name_en as string) || null,
    description: (raw.description as string) || null,
    category: (raw.category as string) || null,
    selling_price: parseFloat(raw.selling_price as string) || 0,
    cost_price: parseFloat(raw.cost_price as string) || 0,
    // Keep existing image if form doesn't provide a new one
    image_url: (raw.image_url as string) || existing?.image_url || null,
    is_active: isActive,
    is_available_online: raw.is_available_online === 'on' || raw.is_available_online === 'true',
    online_description: (raw.online_description as string) || null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('products').update(payload).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/products')
  redirect('/dashboard/products')
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('products')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
  revalidatePath('/dashboard/products')
}

export async function toggleProductActive(id: string, isActive: boolean): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/products')
  return {}
}

// ============================================================
// Configurator: option groups, variants, add-ons
// ============================================================

export interface OptionGroupWithValues {
  id: string
  name: string
  values: { id: string; value: string }[]
}

import type { ProductVariant } from '@/types/product-config'

export interface VariantWithOptionIds {
  id: string
  name: string
  price: number
  option_value_ids: string[]
}

export async function getAllProductVariants(): Promise<ProductVariant[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('product_variants')
    .select('id, product_id, name, price, sort_order, is_active, image_url, created_at, updated_at')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as ProductVariant[]
}

export async function getProductCategories(): Promise<ProductCategory[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('product_categories')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return data as ProductCategory[]
}

export async function getProductOptionGroups(productId: string): Promise<OptionGroupWithValues[]> {
  const supabase = await createClient()
  const { data: groups, error } = await supabase
    .from('product_option_groups')
    .select('id, name')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)

  const groupIds = (groups ?? []).map(g => g.id)
  if (groupIds.length === 0) return []

  const { data: values, error: valuesError } = await supabase
    .from('product_option_values')
    .select('id, group_id, value')
    .in('group_id', groupIds)
    .order('sort_order', { ascending: true })
  if (valuesError) throw new Error(valuesError.message)

  return (groups ?? []).map(g => ({
    ...g,
    values: (values ?? []).filter(v => v.group_id === g.id).map(v => ({ id: v.id, value: v.value })),
  }))
}

export async function saveOptionGroup(
  productId: string,
  input: { name: string; values: { value: string; sort_order: number }[] }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: group, error: groupErr } = await supabase
    .from('product_option_groups')
    .insert({ product_id: productId, name: input.name })
    .select('id')
    .single()
  if (groupErr) return { error: groupErr.message }

  const rows = input.values.map(v => ({ group_id: group.id, value: v.value, sort_order: v.sort_order }))
  const { error: valuesErr } = await supabase.from('product_option_values').insert(rows)
  if (valuesErr) return { error: valuesErr.message }
  return {}
}

export async function removeOptionGroup(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('product_option_groups').delete().eq('id', id)
  return error ? { error: error.message } : {}
}

export async function getProductVariantsWithOptions(productId: string): Promise<VariantWithOptionIds[]> {
  const supabase = await createClient()
  const { data: variants, error } = await supabase
    .from('product_variants')
    .select('id, name, price')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)

  const variantIds = (variants ?? []).map(v => v.id)
  if (variantIds.length === 0) return []

  const { data: joins, error: joinErr } = await supabase
    .from('variant_option_values')
    .select('variant_id, option_value_id')
    .in('variant_id', variantIds)
  if (joinErr) throw new Error(joinErr.message)

  return (variants ?? []).map(v => ({
    ...v,
    option_value_ids: (joins ?? []).filter(j => j.variant_id === v.id).map(j => j.option_value_id),
  }))
}

export async function saveVariantWithOptions(
  productId: string,
  input: { name: string; price: number; option_value_ids: string[] }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: variant, error: variantErr } = await supabase
    .from('product_variants')
    .insert({ product_id: productId, name: input.name, price: input.price })
    .select('id')
    .single()
  if (variantErr) return { error: variantErr.message }

  if (input.option_value_ids.length > 0) {
    const rows = input.option_value_ids.map(option_value_id => ({ variant_id: variant.id, option_value_id }))
    const { error: joinErr } = await supabase.from('variant_option_values').insert(rows)
    if (joinErr) return { error: joinErr.message }
  }
  return {}
}

export async function removeVariantAction(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('product_variants').delete().eq('id', id)
  return error ? { error: error.message } : {}
}

export async function getProductAddonsAction(productId: string): Promise<{ name: string; price: number }[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('product_addons')
    .select('name, price')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function saveProductAddons(
  productId: string,
  addons: { name: string; price: number; sort_order: number }[]
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error: delErr } = await supabase.from('product_addons').delete().eq('product_id', productId)
  if (delErr) return { error: delErr.message }

  const rows = addons
    .filter(a => a.name.trim())
    .map(a => ({ product_id: productId, name: a.name.trim(), price: a.price, sort_order: a.sort_order }))
  if (rows.length === 0) return {}

  const { error: insErr } = await supabase.from('product_addons').insert(rows)
  if (insErr) return { error: insErr.message }
  return {}
}

// ============================================================
// Gallery: multiple images per product / variant
// ============================================================

export interface GalleryImage {
  id: string
  product_id: string
  variant_id: string | null
  image_url: string
  sort_order: number
}

export async function getProductGallery(productId: string): Promise<GalleryImage[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('product_gallery')
    .select('id, product_id, variant_id, image_url, sort_order')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as GalleryImage[]
}

export async function addGalleryImage(
  productId: string,
  input: { image_url: string; variant_id?: string | null }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('product_gallery')
    .select('sort_order')
    .eq('product_id', productId)
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextSort = (existing?.[0]?.sort_order ?? 0) + 1

  const { error } = await supabase.from('product_gallery').insert({
    product_id: productId,
    variant_id: input.variant_id ?? null,
    image_url: input.image_url,
    sort_order: nextSort,
  })
  return error ? { error: error.message } : {}
}

export async function removeGalleryImage(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('product_gallery').delete().eq('id', id)
  return error ? { error: error.message } : {}
}
