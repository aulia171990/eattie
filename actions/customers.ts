'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionState } from '@/types'

export type CustomerTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'

export interface Customer {
  id: string
  name: string
  phone: string
  email: string | null
  address: string | null
  notes: string | null
  tier: CustomerTier
  total_spending: number
  total_orders: number
  last_order_date: string | null
  is_manual: boolean
  created_at: string
  updated_at: string
}

export interface GetCustomersParams {
  search?: string
  tier?: CustomerTier | 'all'
  page?: number
  pageSize?: number
  sortBy?: 'total_spending' | 'last_order_date' | 'name'
}

export interface GetCustomersResult {
  data: Customer[]
  total: number
  page: number
  pageSize: number
}

async function requireOwner() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, isOwner: false }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return { supabase, user, isOwner: profile?.role === 'owner' }
}

export async function getCustomers(
  params: GetCustomersParams = {}
): Promise<GetCustomersResult> {
  const { supabase, isOwner } = await requireOwner()
  if (!isOwner) return { data: [], total: 0, page: 1, pageSize: 20 }

  const page     = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 20))
  const from     = (page - 1) * pageSize
  const to       = from + pageSize - 1
  const sortBy   = params.sortBy ?? 'total_spending'

  let query = supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .order(sortBy, { ascending: false, nullsFirst: false })
    .range(from, to)

  if (params.tier && params.tier !== 'all') {
    query = query.eq('tier', params.tier)
  }
  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,phone.ilike.%${params.search}%`)
  }

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  return {
    data: (data ?? []) as Customer[],
    total: count ?? 0,
    page,
    pageSize,
  }
}

export async function getCustomerStats() {
  const { supabase, isOwner } = await requireOwner()
  if (!isOwner) return { total: 0, byTier: {} as Record<CustomerTier, number>, totalRevenue: 0 }

  const { data } = await supabase
    .from('customers')
    .select('tier, total_spending')

  const byTier: Record<CustomerTier, number> = { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 }
  let totalRevenue = 0

  for (const c of data ?? []) {
    const tier = c.tier as CustomerTier
    if (tier in byTier) byTier[tier]++
    totalRevenue += c.total_spending ?? 0
  }

  return { total: data?.length ?? 0, byTier, totalRevenue }
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const { supabase, isOwner } = await requireOwner()
  if (!isOwner) return null

  const { data } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  return data as Customer | null
}

export interface CustomerOrderHistory {
  id: string
  order_number: string
  total_amount: number
  status: string
  created_at: string
}

export async function getCustomerOrderHistory(phone: string): Promise<CustomerOrderHistory[]> {
  const { supabase, isOwner } = await requireOwner()
  if (!isOwner) return []

  const { data } = await supabase
    .from('orders')
    .select('id,order_number,total_amount,status,created_at')
    .eq('customer_phone', phone)
    .order('created_at', { ascending: false })
    .limit(20)

  return (data ?? []) as CustomerOrderHistory[]
}

/**
 * Manually create a customer profile (owner adds someone who hasn't
 * ordered yet — e.g. a walk-in contact, or pre-registering a VIP).
 */
export async function createCustomer(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, isOwner } = await requireOwner()
  if (!isOwner) return { error: 'Hanya owner yang dapat menambah pelanggan' }

  const name  = formData.get('name') as string
  const phone = formData.get('phone') as string
  const email = (formData.get('email') as string) || null
  const address = (formData.get('address') as string) || null
  const notes = (formData.get('notes') as string) || null

  if (!name?.trim() || !phone?.trim()) {
    return { error: 'Nama dan nomor HP wajib diisi' }
  }

  const { error } = await supabase
    .from('customers')
    .insert({
      name: name.trim(),
      phone: phone.trim(),
      email,
      address,
      notes,
      is_manual: true,
      tier: 'BRONZE',
    })

  if (error) {
    if (error.code === '23505') return { error: 'Nomor HP ini sudah terdaftar' }
    return { error: error.message }
  }

  revalidatePath('/dashboard/customers')
  return { success: true }
}

export async function updateCustomer(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, isOwner } = await requireOwner()
  if (!isOwner) return { error: 'Hanya owner yang dapat mengubah data pelanggan' }

  const name = formData.get('name') as string
  const email = (formData.get('email') as string) || null
  const address = (formData.get('address') as string) || null
  const notes = (formData.get('notes') as string) || null

  const { error } = await supabase
    .from('customers')
    .update({ name, email, address, notes })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/customers')
  revalidatePath(`/dashboard/customers/${id}`)
  return { success: true }
}

export async function deleteCustomer(
  id: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  const { supabase, isOwner } = await requireOwner()
  if (!isOwner) return { error: 'Hanya owner yang dapat menghapus pelanggan' }

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/customers')
  return { success: true }
}
