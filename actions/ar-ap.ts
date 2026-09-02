'use server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'

// ponytail: generated types don't know AR/AP tables yet. Remove `as any` after `supabase gen types`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Q = any
function sb(s: Q): Q { return s }

export interface ARItem {
  id: string
  invoice_number: string
  customer_name: string
  customer_phone: string | null
  amount: number
  paid_amount: number
  due_date: string
  status: string
  source: string
  source_id: string | null
  aging_days: number
}

export interface APItem {
  id: string
  invoice_number: string
  supplier_name: string
  supplier_id: string | null
  amount: number
  paid_amount: number
  due_date: string
  status: string
  source: string
  source_id: string | null
  aging_days: number
}

export interface PaymentRecord {
  id: string
  ar_ap_type: 'receivable' | 'payable'
  ar_ap_id: string
  amount: number
  payment_date: string
  payment_method: string | null
  notes: string | null
  recorded_by: string | null
  created_at: string
}

export interface AgingBucket {
  bucket: string
  count: number
  amount: number
}

export interface AgingReport {
  receivable: AgingBucket[]
  payable: AgingBucket[]
  totalReceivable: number
  totalPayable: number
  netPosition: number
}

/**
 * Get Accounts Receivable list with aging
 */
export async function getAccountsReceivable(): Promise<ARItem[]> {
  const auth = await requireRole(['owner'])
  if (auth.error) return []
  const { supabase } = auth

  const { data, error } = await sb(supabase)
    .from('accounts_receivable')
    .select('*')
    .order('due_date', { ascending: true })

  if (error || !data) return []

  const rows = data as Array<Record<string, unknown>>
  return rows.map((r: Record<string, unknown>) => ({
    ...r,
    amount: Number(r.amount),
    paid_amount: Number(r.paid_amount),
    aging_days: Math.max(0, Math.floor((Date.now() - new Date(r.due_date as string).getTime()) / 86400000)),
  })) as ARItem[]
}

/**
 * Get Accounts Payable list with aging
 */
export async function getAccountsPayable(): Promise<APItem[]> {
  const auth = await requireRole(['owner'])
  if (auth.error) return []
  const { supabase } = auth

  const { data, error } = await sb(supabase)
    .from('accounts_payable')
    .select('*, suppliers(name)')
    .order('due_date', { ascending: true })

  if (error || !data) return []

  const rows = data as Array<Record<string, unknown>>
  return rows.map((r: Record<string, unknown>) => ({
    ...r,
    amount: Number(r.amount),
    paid_amount: Number(r.paid_amount),
    aging_days: Math.max(0, Math.floor((Date.now() - new Date(r.due_date as string).getTime()) / 86400000)),
    supplier_name: (r.suppliers as { name?: string })?.name || r.supplier_name,
  })) as APItem[]
}

/**
 * Record payment for AR or AP
 */
export async function recordPayment(
  arApType: 'receivable' | 'payable',
  arApId: string,
  amount: number,
  paymentDate: string,
  paymentMethod: string,
  notes?: string
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireRole(['owner'])
  if (auth.error) return { error: auth.error }
  const { supabase, user } = auth

  // Validate payment doesn't exceed remaining balance
  const table = arApType === 'receivable' ? 'accounts_receivable' : 'accounts_payable'
  const { data: record } = await sb(supabase).from(table).select('amount, paid_amount').eq('id', arApId).single()
  if (!record) return { error: 'Invoice tidak ditemukan' }

  const remaining = Number(record.amount) - Number(record.paid_amount)
  if (amount > remaining + 0.01) return { error: `Pembayaran melebihi sisa: ${remaining}` }

  // Insert payment record
  const { error: payErr } = await sb(supabase).from('payment_records').insert({
    ar_ap_type: arApType,
    ar_ap_id: arApId,
    amount,
    payment_date: paymentDate,
    payment_method: paymentMethod,
    notes: notes ?? null,
    recorded_by: user.id,
  })
  if (payErr) return { error: payErr.message }

  // Update paid_amount and status
  const newPaid = Number(record.paid_amount) + amount
  const newStatus = newPaid >= Number(record.amount) ? 'paid' : 'partial'
  const { error: updErr } = await sb(supabase).from(table).update({
    paid_amount: newPaid,
    status: newStatus,
    updated_at: new Date().toISOString(),
  }).eq('id', arApId)
  if (updErr) return { error: updErr.message }

  // Create journal entry for the payment
  // AR payment: Dr Cash (1000/1100), Cr AR (1200)
  // AP payment: Dr AP (2000), Cr Cash (1000/1100)
  // Note: This requires chart_of_accounts entries for 1200 (Accounts Receivable)
  // We'll just log a note for now - full double-entry in Phase 7

  return { success: true }
}

/**
 * Aging report — group by aging buckets
 */
export async function getAgingReport(): Promise<AgingReport> {
  const auth = await requireRole(['owner'])
  if (auth.error) return { receivable: [], payable: [], totalReceivable: 0, totalPayable: 0, netPosition: 0 }
  const { supabase } = auth

  const [arRes, apRes] = await Promise.all([
    sb(supabase).from('accounts_receivable').select('amount, paid_amount, due_date, status'),
    sb(supabase).from('accounts_payable').select('amount, paid_amount, due_date, status'),
  ])

  const arItems = (arRes.data ?? []) as { amount: number; paid_amount: number; due_date: string; status: string }[]
  const apItems = (apRes.data ?? []) as { amount: number; paid_amount: number; due_date: string; status: string }[]

  const now = new Date()
  const buckets = [
    { label: 'Current (0-30)', min: 0, max: 30 },
    { label: '31-60 Days', min: 31, max: 60 },
    { label: '61-90 Days', min: 61, max: 90 },
    { label: '91-120 Days', min: 91, max: 120 },
    { label: 'Over 120 Days', min: 121, max: 9999 },
  ]

  function compute(items: typeof arItems) {
    return buckets.map(b => {
      const bucketItems = items.filter(i => {
        const days = Math.floor((now.getTime() - new Date(i.due_date).getTime()) / 86400000)
        return days >= b.min && days <= b.max
      })
      const amount = bucketItems.reduce((s, i) => s + Number(i.amount) - Number(i.paid_amount), 0)
      return { bucket: b.label, count: bucketItems.length, amount }
    })
  }

  const receivable = compute(arItems)
  const payable = compute(apItems)
  const totalReceivable = receivable.reduce((s, b) => s + b.amount, 0)
  const totalPayable = payable.reduce((s, b) => s + b.amount, 0)

  return { receivable, payable, totalReceivable, totalPayable, netPosition: totalReceivable - totalPayable }
}

/**
 * Create AR from completed sale
 */
export async function createARFromSale(saleId: string): Promise<{ error?: string; id?: string }> {
  const auth = await requireRole(['owner'])
  if (auth.error) return { error: auth.error }
  const { supabase } = auth

  const { data: sale } = await sb(supabase).from('sales').select('*').eq('id', saleId).single()
  if (!sale) return { error: 'Sale tidak ditemukan' }
  if (sale.status !== 'completed') return { error: 'Sale belum completed' }

  const { data: existing } = await sb(supabase).from('accounts_receivable').select('id').eq('source', 'sale').eq('source_id', saleId).single()
  if (existing) return { error: 'AR sudah dibuat untuk sale ini' }

  const { data, error } = await sb(supabase).from('accounts_receivable').insert({
    invoice_number: sale.invoice_number,
    customer_name: sale.customer_name || 'Walk-in',
    amount: sale.total,
    paid_amount: 0,
    due_date: new Date().toISOString().split('T')[0], // immediate due
    status: 'unpaid',
    source: 'sale',
    source_id: saleId,
    created_by: sale.cashier_id,
  }).select('id').single()

  if (error) return { error: error.message }
  return { id: data.id }
}

/**
 * Create AP from received purchase
 */
export async function createAPFromPurchase(purchaseId: string): Promise<{ error?: string; id?: string }> {
  const auth = await requireRole(['owner'])
  if (auth.error) return { error: auth.error }
  const { supabase } = auth

  const { data: po } = await sb(supabase).from('stock_purchases').select('*, suppliers(name)').eq('id', purchaseId).single()
  if (!po) return { error: 'Purchase tidak ditemukan' }
  if (!po.approved_by) return { error: 'Purchase belum di-approve/receive' }

  const { data: existing } = await sb(supabase).from('accounts_payable').select('id').eq('source', 'purchase').eq('source_id', purchaseId).single()
  if (existing) return { error: 'AP sudah dibuat untuk purchase ini' }

  const dueDate = new Date(po.purchase_date)
  dueDate.setDate(dueDate.getDate() + 30) // default 30 days

  const { data, error } = await sb(supabase).from('accounts_payable').insert({
    invoice_number: po.invoice_number || po.purchase_number,
    supplier_name: po.suppliers?.name || 'Unknown',
    supplier_id: po.supplier_id,
    amount: po.total_amount,
    paid_amount: 0,
    due_date: dueDate.toISOString().split('T')[0],
    status: 'unpaid',
    source: 'purchase',
    source_id: purchaseId,
    created_by: po.approved_by,
  }).select('id').single()

  if (error) return { error: error.message }
  return { id: data.id }
}

/**
 * Get payment history for an AR/AP
 */
export async function getPaymentHistory(arApType: 'receivable' | 'payable', arApId: string): Promise<PaymentRecord[]> {
  const auth = await requireRole(['owner'])
  if (auth.error) return []
  const { supabase } = auth

  const { data, error } = await sb(supabase)
    .from('payment_records')
    .select('*')
    .eq('ar_ap_type', arApType)
    .eq('ar_ap_id', arApId)
    .order('payment_date', { ascending: false })

  if (error || !data) return []
  return data as PaymentRecord[]
}