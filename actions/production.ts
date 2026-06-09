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
      'id,batch_number,product_id,recipe_id,quantity_planned,quantity_produced,quantity_defect,status,scheduled_date,started_at,completed_at,notes,created_by,created_at,updated_at,cost_per_unit,total_cost,products:product_id(name,category,selling_price),profiles:created_by(full_name)'
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
      'id,batch_number,product_id,recipe_id,quantity_planned,quantity_produced,quantity_defect,status,scheduled_date,started_at,completed_at,notes,created_by,created_at,updated_at,cost_per_unit,total_cost,products:product_id(name,category,selling_price),profiles:created_by(full_name)'
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
  const quantity_planned = parseInt(formData.get('quantity_planned') as string, 10)
  const scheduled_date = (formData.get('scheduled_date') as string) || null
  const notes = (formData.get('notes') as string) || null

  if (!product_id) return { error: 'Pilih produk' }
  if (!quantity_planned || quantity_planned < 1) return { error: 'Jumlah harus > 0' }

  // Lookup recipe via RPC (SECURITY DEFINER) — baker tidak boleh akses recipes langsung
  const { data: recipeData } = await supabase
    .rpc('get_recipe_id_for_product', { p_product_id: product_id })

  if (!recipeData) return { error: 'Produk ini belum memiliki resep. Hubungi owner untuk menambahkan resep.' }

  const today = format(new Date(), 'yyyyMMdd')
  const { data: lastBatchnumber } = await supabase
    .from('production_batches')
    .select('batch_number')
    .like('batch_number', `PRD-${today}%`)
    .order('batch_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  let nextSeqPRD = 1
  if (lastBatchnumber?.['batch_number']) {
    const parts = lastBatchnumber['batch_number'].split('-')
    const lastSeq = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(lastSeq)) nextSeqPRD = lastSeq + 1
  }
  const batchNumber = `PRD-${today}-${String(nextSeqPRD).padStart(3, '0')}`

  const payload: TablesInsert<'production_batches'> = {
    batch_number: batchNumber,
    product_id,
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

  // For non-completed status transitions (planned -> in_progress, cancel, etc.)
  type BatchUpdate = TablesUpdate<'production_batches'>
  const updatePayload: BatchUpdate = {
    status: status as BatchUpdate['status'],
    notes,
    updated_at: new Date().toISOString(),
    ...(status === 'in_progress' ? { started_at: new Date().toISOString() } : {}),
  }

  const { error } = await supabase
    .from('production_batches')
    .update(updatePayload)
    .eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/production')
  revalidatePath(`/dashboard/production/${id}`)
  return { success: true }
}

export async function deleteBatch(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('production_batches')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)
  revalidatePath('/dashboard/production')
}
