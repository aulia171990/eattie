'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'

export interface ProductVariantRow {
  id: string
  product_id: string
  name: string
  price: number
  sort_order: number
  is_active: boolean
}

export interface ProductAddonRow {
  id: string
  product_id: string
  name: string
  price: number
  sort_order: number
  is_active: boolean
}

export async function getProductVariants(productId: string): Promise<ProductVariantRow[]> {
  const auth = await requireRole(['owner'])
  if (auth.error) return []
  const { supabase } = auth

  const { data } = await supabase
    .from('product_variants')
    .select('id, product_id, name, price, sort_order, is_active')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true })

  return data ?? []
}

export async function getProductAddons(productId: string): Promise<ProductAddonRow[]> {
  const auth = await requireRole(['owner'])
  if (auth.error) return []
  const { supabase } = auth

  const { data } = await supabase
    .from('product_addons')
    .select('id, product_id, name, price, sort_order, is_active')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true })

  return data ?? []
}

type ActionState = { error?: string; success?: boolean }

export async function createVariant(
  productId: string,
  _prev: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const auth = await requireRole(['owner'])
  if (auth.error) return { error: auth.error }
  const { supabase } = auth

  const name = (formData.get('name') as string)?.trim()
  const price = Number(formData.get('price'))
  const sortOrder = Number(formData.get('sort_order') ?? 0)

  if (!name) return { error: 'Nama varian wajib diisi' }
  if (!Number.isFinite(price) || price < 0) return { error: 'Harga tidak valid' }

  const { error } = await supabase.from('product_variants').insert({
    product_id: productId,
    name,
    price,
    sort_order: sortOrder,
    is_active: true,
  })

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/products/${productId}/edit`)
  return { success: true }
}

export async function updateVariant(
  variantId: string,
  productId: string,
  _prev: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const auth = await requireRole(['owner'])
  if (auth.error) return { error: auth.error }
  const { supabase } = auth

  const name = (formData.get('name') as string)?.trim()
  const price = Number(formData.get('price'))
  const sortOrder = Number(formData.get('sort_order') ?? 0)
  const isActive = formData.get('is_active') === 'true'

  if (!name) return { error: 'Nama varian wajib diisi' }
  if (!Number.isFinite(price) || price < 0) return { error: 'Harga tidak valid' }

  const { error } = await supabase
    .from('product_variants')
    .update({ name, price, sort_order: sortOrder, is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', variantId)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/products/${productId}/edit`)
  return { success: true }
}

export async function deleteVariant(variantId: string, productId: string): Promise<ActionState> {
  const auth = await requireRole(['owner'])
  if (auth.error) return { error: auth.error }
  const { supabase } = auth

  const { count: orderCount } = await supabase
    .from('order_items')
    .select('id', { count: 'exact', head: true })
    .eq('variant_id', variantId)

  if ((orderCount ?? 0) > 0) {
    return { error: 'Varian ini sudah pernah terjual — nonaktifkan saja, jangan dihapus (supaya histori transaksi tidak rusak)' }
  }

  const { error } = await supabase.from('product_variants').delete().eq('id', variantId)
  if (error) return { error: error.message }

  revalidatePath(`/dashboard/products/${productId}/edit`)
  return { success: true }
}

export async function createAddon(
  productId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const auth = await requireRole(['owner'])
  if (auth.error) return { error: auth.error }
  const { supabase } = auth

  const name = (formData.get('name') as string)?.trim()
  const price = Number(formData.get('price'))
  const sortOrder = Number(formData.get('sort_order') ?? 0)

  if (!name) return { error: 'Nama add-on wajib diisi' }
  if (!Number.isFinite(price) || price < 0) return { error: 'Harga tidak valid' }

  const { error } = await supabase.from('product_addons').insert({
    product_id: productId,
    name,
    price,
    sort_order: sortOrder,
    is_active: true,
  })

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/products/${productId}/edit`)
  return { success: true }
}

export async function updateAddon(
  addonId: string,
  productId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const auth = await requireRole(['owner'])
  if (auth.error) return { error: auth.error }
  const { supabase } = auth

  const name = (formData.get('name') as string)?.trim()
  const price = Number(formData.get('price'))
  const sortOrder = Number(formData.get('sort_order') ?? 0)
  const isActive = formData.get('is_active') === 'true'

  if (!name) return { error: 'Nama add-on wajib diisi' }
  if (!Number.isFinite(price) || price < 0) return { error: 'Harga tidak valid' }

  const { error } = await supabase
    .from('product_addons')
    .update({ name, price, sort_order: sortOrder, is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', addonId)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/products/${productId}/edit`)
  return { success: true }
}

export async function deleteAddon(addonId: string, productId: string): Promise<ActionState> {
  const auth = await requireRole(['owner'])
  if (auth.error) return { error: auth.error }
  const { supabase } = auth

  const { count: orderCount } = await supabase
    .from('order_items')
    .select('id', { count: 'exact', head: true })
    .contains('addon_ids', [addonId])

  if ((orderCount ?? 0) > 0) {
    return { error: 'Add-on ini sudah pernah terjual — nonaktifkan saja, jangan dihapus' }
  }

  const { error } = await supabase.from('product_addons').delete().eq('id', addonId)
  if (error) return { error: error.message }

  revalidatePath(`/dashboard/products/${productId}/edit`)
  return { success: true }
}
