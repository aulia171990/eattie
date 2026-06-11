'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { TablesInsert, TablesUpdate } from '@/types/database'
import type { Product, ActionState } from '@/types'

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

  // is_active: form sends hidden value="false" always, plus checkbox value="true" if checked
  // When checked: formData has both "false" and "true" -> last value wins -> "true"
  // When unchecked: formData only has "false"
  // Object.fromEntries picks LAST value for duplicate keys
  const isActive = raw.is_active === 'true'

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
