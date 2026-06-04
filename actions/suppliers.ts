'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { TablesInsert, TablesUpdate } from '@/types/database'
import type { Supplier, ActionState } from '@/types'

export async function getSuppliers(activeOnly = false): Promise<Supplier[]> {
  const supabase = await createClient()
  let query = supabase.from('suppliers').select('*').order('name')
  if (activeOnly) query = query.eq('is_active', true)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function getSupplier(id: string): Promise<Supplier> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function createSupplier(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const raw = Object.fromEntries(formData.entries())
  if (!raw.name) return { error: 'Nama supplier wajib diisi' }

  const payload: TablesInsert<'suppliers'> = {
    name: raw.name as string,
    contact_person: (raw.contact_person as string) || null,
    phone: (raw.phone as string) || null,
    email: (raw.email as string) || null,
    address: (raw.address as string) || null,
    notes: (raw.notes as string) || null,
    is_active: true,
  }
  const { error } = await supabase.from('suppliers').insert(payload)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/inventory/suppliers')
  redirect('/dashboard/inventory/suppliers')
}

export async function updateSupplier(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const raw = Object.fromEntries(formData.entries())
  if (!raw.name) return { error: 'Nama supplier wajib diisi' }

  const payload: TablesUpdate<'suppliers'> = {
    name: raw.name as string,
    contact_person: (raw.contact_person as string) || null,
    phone: (raw.phone as string) || null,
    email: (raw.email as string) || null,
    address: (raw.address as string) || null,
    notes: (raw.notes as string) || null,
    is_active: raw.is_active !== 'false',
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('suppliers').update(payload).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/inventory/suppliers')
  redirect('/dashboard/inventory/suppliers')
}

export async function deleteSupplier(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('suppliers').update({ is_active: false }).eq('id', id)
  revalidatePath('/dashboard/inventory/suppliers')
}
