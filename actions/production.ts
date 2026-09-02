'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import type { TablesInsert, TablesUpdate } from '@/types/database'
import type { ProductionBatchWithRelations, ActionState } from '@/types'

export async function getProductionBatches(filters?: {
  status?: string
  dateFrom?: string
  dateTo?: string
}): Promise<ProductionBatchWithRelations[]> {
  const supabase = await createClient()

  let query = supabase
    .from('production_batches')
    .select(
      'id,batch_number,product_id,variant_id,recipe_id,quantity_planned,quantity_produced,quantity_defect,status,scheduled_date,started_at,completed_at,notes,created_by,created_at,updated_at,cost_per_unit,total_cost,products:product_id(name,category,selling_price),variants:variant_id(id,name),profiles:created_by(full_name)'
    )
    .order('scheduled_date', { ascending: false })

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status as NonNullable<TablesInsert<'production_batches'>['status']>)
  }
  if (filters?.dateFrom) query = query.gte('scheduled_date', filters.dateFrom)
  if (filters?.dateTo) query = query.lte('scheduled_date', filters.dateTo)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as ProductionBatchWithRelations[]
}

export async function getProductionBatch(id: string): Promise<ProductionBatchWithRelations> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('production_batches')
    .select(
      'id,batch_number,product_id,variant_id,recipe_id,quantity_planned,quantity_produced,quantity_defect,status,scheduled_date,started_at,completed_at,notes,created_by,created_at,updated_at,cost_per_unit,total_cost,products:product_id(name,category,selling_price),variants:variant_id(id,name),profiles:created_by(full_name)'
    )
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data as unknown as ProductionBatchWithRelations
}

export async function createProductionBatch(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi' }

  const product_id = formData.get('product_id') as string
  const variant_id = (formData.get('variant_id') as string) || null
  const quantity_planned = parseInt(formData.get('quantity_planned') as string, 10)
  const scheduled_date = (formData.get('scheduled_date') as string) || null
  const notes = (formData.get('notes') as string) || null

  if (!product_id) return { error: 'Pilih produk' }
  if (!quantity_planned || quantity_planned < 1) return { error: 'Jumlah harus > 0' }

  // Audit #2.11: ensure the selected variant actually belongs to this product.
  // Without this, a tampered variant_id could resolve another product's recipe
  // or produce stock under the wrong variant.
  if (variant_id) {
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

  // Lookup recipe via RPC (SECURITY DEFINER) — baker tidak boleh akses recipes langsung.
  // 2-level resolution: variant-specific recipe first, fallback to product's generic recipe.
  const { data: recipeData } = await supabase
    .rpc('get_recipe_id_for_product', { p_product_id: product_id, p_variant_id: variant_id })

  if (!recipeData) return { error: 'Produk ini belum memiliki resep. Hubungi owner untuk menambahkan resep.' }

  // Atomic per-day sequence (audit #1.6): advisory-locked generator prevents
  // two concurrent batches from getting the same PRD-YYYYMMDD-NNN number.
  const { data: batchNumber, error: bnErr } = await (supabase.rpc as any)('next_doc_number', {
    p_prefix: 'PRD',
    p_table: 'production_batches',
    p_column: 'batch_number',
  })
  if (bnErr || !batchNumber) return { error: 'Gagal membuat nomor batch' }

  const payload: TablesInsert<'production_batches'> = {
    batch_number: batchNumber,
    product_id,
    variant_id: variant_id || null,
    recipe_id: recipeData as string,
    quantity_planned,
    scheduled_date,
    notes,
    status: 'planned',
    created_by: user.id,
  }

  const { error } = await supabase.from('production_batches').insert(payload)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/production')
  redirect('/dashboard/production')
}

/**
 * REFACTORED: updateBatchStatus uses complete_production_batch() RPC
 * when transitioning to 'completed'. This ensures:
 * - Ingredient stock is atomically deducted
 * - Product stock is atomically added
 * - Inventory movements are recorded
 * - Cost accounting is computed
 * - Race conditions are prevented via FOR UPDATE locks
 */
export async function updateBatchStatus(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()

  const status = formData.get('status') as string
  const notes = (formData.get('notes') as string) || null
  const quantityProduced = formData.get('quantity_produced')
    ? parseInt(formData.get('quantity_produced') as string, 10)
    : null
  const quantityDefect = formData.get('quantity_defect')
    ? parseInt(formData.get('quantity_defect') as string, 10)
    : 0

  // If completing: delegate everything to the RPC
  if (status === 'completed') {
    if (!quantityProduced || quantityProduced < 0) {
      return { error: 'Masukkan jumlah produksi yang valid' }
    }

    const { data, error: rpcErr } = await supabase.rpc('complete_production_batch', {
      p_batch_id: id,
      p_quantity_produced: quantityProduced,
      p_quantity_defect: quantityDefect ?? 0,
    })

    if (rpcErr) return { error: `Gagal menyelesaikan produksi: ${rpcErr.message}` }

    const result = data as unknown as { success?: boolean; error?: string }
    if (!result?.success) {
      return { error: result?.error ?? 'Gagal menyelesaikan produksi' }
    }

    // Update notes if provided
    if (notes) {
      await supabase
        .from('production_batches')
        .update({ notes, updated_at: new Date().toISOString() })
        .eq('id', id)
    }

    revalidatePath('/dashboard/production')
    revalidatePath(`/dashboard/production/${id}`)
    revalidatePath('/dashboard/inventory')
    return { success: true }
  }

  // For non-completed status transitions: delegate to RPC for validation
  const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)('update_production_batch_status', {
    p_batch_id: id,
    p_new_status: status,
  })

  if (rpcErr) return { error: `Gagal mengupdate status: ${rpcErr.message}` }

  const rpcResult = rpcData as unknown as { success?: boolean; error?: string }
  if (!rpcResult?.success) {
    return { error: rpcResult?.error ?? 'Gagal mengupdate status produksi' }
  }

  // Update notes if provided (RPC doesn't handle notes for non-completed transitions)
  if (notes) {
    await supabase
      .from('production_batches')
      .update({ notes, updated_at: new Date().toISOString() })
      .eq('id', id)
  }

  revalidatePath('/dashboard/production')
  revalidatePath(`/dashboard/production/${id}`)
  return { success: true }
}

export async function deleteBatch(id: string): Promise<void> {
  const supabase = await createClient()

  // Use RPC for validated cancellation
  const { error } = await (supabase.rpc as any)('update_production_batch_status', {
    p_batch_id: id,
    p_new_status: 'cancelled',
  })
  if (error) throw new Error(`Gagal membatalkan batch: ${error.message}`)

  revalidatePath('/dashboard/production')
}
