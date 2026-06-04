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
      'id,batch_number,product_id,recipe_id,quantity_planned,quantity_produced,quantity_defect,status,scheduled_date,started_at,completed_at,notes,created_by,created_at,updated_at,products:product_id(name,category,selling_price),profiles:created_by(full_name)'
    )
    .order('scheduled_date', { ascending: false })

  if (filters?.status && filters.status !== 'all') {
    query = query.eq(
      'status',
      filters.status as TablesInsert<'production_batches'>['status']
    )
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
      'id,batch_number,product_id,recipe_id,quantity_planned,quantity_produced,quantity_defect,status,scheduled_date,started_at,completed_at,notes,created_by,created_at,updated_at,products:product_id(name,category,selling_price),profiles:created_by(full_name)'
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

  const today = format(new Date(), 'yyyyMMdd')
  const { count } = await supabase
    .from('production_batches')
    .select('id', { count: 'exact', head: true })
    .like('batch_number', `PRD-${today}%`)

  const batchNumber = `PRD-${today}-${String((count ?? 0) + 1).padStart(3, '0')}`

  const payload: TablesInsert<'production_batches'> = {
    batch_number: batchNumber,
    product_id,
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

export async function updateBatchStatus(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()

  const status = formData.get('status') as TablesUpdate<'production_batches'>['status']
  const notes = (formData.get('notes') as string) || null

  const payload: TablesUpdate<'production_batches'> = {
    status,
    notes,
    updated_at: new Date().toISOString(),
  }

  if (formData.get('quantity_produced')) {
    payload.quantity_produced = parseInt(formData.get('quantity_produced') as string, 10)
  }
  if (formData.get('quantity_defect')) {
    payload.quantity_defect = parseInt(formData.get('quantity_defect') as string, 10)
  }
  if (status === 'in_progress') payload.started_at = new Date().toISOString()
  if (status === 'completed') payload.completed_at = new Date().toISOString()

  const { error } = await supabase
    .from('production_batches')
    .update(payload)
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
