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

  const payload: TablesUpdate<'products'> = {
    name: raw.name as string,
    name_en: (raw.name_en as string) || null,
    description: (raw.description as string) || null,
    category: (raw.category as string) || null,
    selling_price: parseFloat(raw.selling_price as string) || 0,
    cost_price: parseFloat(raw.cost_price as string) || 0,
    image_url: (raw.image_url as string) || null,
    is_active: raw.is_active !== 'false',
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
