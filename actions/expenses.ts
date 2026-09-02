'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { TablesInsert, TablesUpdate } from '@/types/database'
import type { Expense, ActionState } from '@/types'
import { requireRole } from '@/lib/auth'

export type ExpenseWithProfile = Expense & { status: string; profiles: { full_name: string } | null }

export async function getExpenses(): Promise<ExpenseWithProfile[]> {
  const auth = await requireRole(['owner'])
  if (auth.error) return []
  const { supabase } = auth

  const { data, error } = await supabase
      .from('expenses')
      .select('id,category,description,amount,status,expense_date,receipt_url,created_by,created_at,profiles:created_by(full_name)')
      .order('expense_date', { ascending: false })
      .limit(100)
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as ExpenseWithProfile[]
}

export async function getExpense(id: string): Promise<Expense> {
  const auth = await requireRole(['owner'])
  if (auth.error) throw new Error('Tidak memiliki akses')
  const { supabase } = auth

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function createExpense(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const auth = await requireRole(['owner'])
  if (auth.error) return { error: auth.error }
  const { supabase, user } = auth

  const raw = Object.fromEntries(formData.entries())
  if (!raw.description) return { error: 'Deskripsi wajib diisi' }
  if (!raw.amount) return { error: 'Jumlah wajib diisi' }
  if (!raw.expense_date) return { error: 'Tanggal wajib diisi' }

  const amount = parseFloat(raw.amount as string)
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'Jumlah harus berupa angka lebih dari 0' }
  }

  const payload = {
    category: (raw.category as string) || 'other',
    description: raw.description as string,
    amount,
    expense_date: raw.expense_date as string,
    receipt_url: (raw.receipt_url as string) || null,
    created_by: user.id,
    status: 'pending',
  } as TablesInsert<'expenses'>

  const { error } = await supabase.from('expenses').insert(payload)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/expenses')
  return { success: true }
}

export async function updateExpense(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const auth = await requireRole(['owner'])
  if (auth.error) return { error: auth.error }
  const { supabase } = auth

  const raw = Object.fromEntries(formData.entries())

  const amount = parseFloat(raw.amount as string)
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'Jumlah harus berupa angka lebih dari 0' }
  }

  const payload: TablesUpdate<'expenses'> = {
    category: (raw.category as string) || 'other',
    description: raw.description as string,
    amount,
    expense_date: raw.expense_date as string,
    receipt_url: (raw.receipt_url as string) || null,
  }

  const { error } = await supabase.from('expenses').update(payload).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/expenses')
  return { success: true }
}

export async function approveExpense(
  id: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  const auth = await requireRole(['owner'])
  if (auth.error) return { error: auth.error }
  const { supabase, user } = auth

  const { error } = await supabase.from('expenses').update({
    status: 'approved',
    approved_by: user.id,
    approved_at: new Date().toISOString(),
  } as TablesUpdate<'expenses'>).eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/expenses')
  return { success: true }
}

export async function rejectExpense(
  id: string,
  reason: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  const auth = await requireRole(['owner'])
  if (auth.error) return { error: auth.error }
  const { supabase, user } = auth

  const { error } = await supabase.from('expenses').update({
    status: 'rejected',
    approved_by: user.id,
    approved_at: new Date().toISOString(),
    rejection_reason: reason,
  } as TablesUpdate<'expenses'>).eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/expenses')
  return { success: true }
}
