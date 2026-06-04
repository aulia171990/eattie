'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { TablesInsert, TablesUpdate } from '@/types/database'
import type { Expense, ActionState } from '@/types'

export async function getExpenses(): Promise<
  Array<Expense & { profiles: { full_name: string } | null }>
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('expenses')
    .select('id,category,description,amount,expense_date,receipt_url,created_by,created_at,profiles:created_by(full_name)')
    .order('expense_date', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as Array<Expense & { profiles: { full_name: string } | null }>
}

export async function getExpense(id: string): Promise<Expense> {
  const supabase = await createClient()
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi' }

  const raw = Object.fromEntries(formData.entries())
  if (!raw.description) return { error: 'Deskripsi wajib diisi' }
  if (!raw.amount) return { error: 'Jumlah wajib diisi' }
  if (!raw.expense_date) return { error: 'Tanggal wajib diisi' }

  const payload: TablesInsert<'expenses'> = {
    category: (raw.category as string) || 'other',
    description: raw.description as string,
    amount: parseFloat(raw.amount as string),
    expense_date: raw.expense_date as string,
    receipt_url: (raw.receipt_url as string) || null,
    created_by: user.id,
  }

  const { error } = await supabase.from('expenses').insert(payload)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/expenses')
  redirect('/dashboard/expenses')
}

export async function updateExpense(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const raw = Object.fromEntries(formData.entries())

  const payload: TablesUpdate<'expenses'> = {
    category: (raw.category as string) || 'other',
    description: raw.description as string,
    amount: parseFloat(raw.amount as string),
    expense_date: raw.expense_date as string,
    receipt_url: (raw.receipt_url as string) || null,
  }

  const { error } = await supabase.from('expenses').update(payload).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/expenses')
  redirect('/dashboard/expenses')
}
