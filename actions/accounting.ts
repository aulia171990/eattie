'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionState } from '@/types'
import { requireRole } from '@/lib/auth'

export interface AccountSummary {
  id: string
  code: string
  name: string
  type: string
  total_debit: number
  total_credit: number
  balance: number
}

export interface JournalEntryWithLines {
  id: string
  entry_number: string
  entry_date: string
  description: string
  source: string
  source_id: string | null
  total_debit: number
  total_credit: number
  created_by: string | null
  created_at: string
  journal_lines: {
    id: string
    account_id: string
    debit: number
    credit: number
    description: string | null
    chart_of_accounts: { code: string; name: string } | null
  }[]
}

export interface FiscalPeriod {
  id: string
  name: string
  period_type: 'monthly' | 'quarterly' | 'yearly'
  start_date: string
  end_date: string
  is_closed: boolean
  closed_by: string | null
  closed_at: string | null
  created_at: string
}

export interface ModulePermission {
  user_id: string
  module: string
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

// ponytail: Supabase generated types don't include new accounting tables yet.
// After `supabase gen types typescript`, these `as any` casts can be removed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyQuery = any

function sb(supabase: AnyQuery): AnyQuery {
  return supabase
}

/**
 * Trial Balance — sum of all journal lines per account
 */
export async function getTrialBalance(asOfDate?: string): Promise<AccountSummary[]> {
  const auth = await requireRole(['owner'])
  if (auth.error) return []
  const { supabase } = auth

  let rawLines: { account_id: string; debit: number; credit: number; chart_of_accounts: { id: string; code: string; name: string; type: string } }[] = []

  if (asOfDate) {
    const { data: lines } = await sb(supabase)
      .from('journal_lines')
      .select('account_id, debit, credit, chart_of_accounts!inner(id, code, name, type), journal_entries!inner(entry_date)')
      .lte('journal_entries.entry_date', asOfDate)

    rawLines = (lines ?? []) as typeof rawLines
  } else {
    const { data: lines } = await sb(supabase)
      .from('journal_lines')
      .select('account_id, debit, credit, chart_of_accounts!inner(id, code, name, type)')

    rawLines = (lines ?? []) as typeof rawLines
  }

  const agg = new Map<string, { id: string; code: string; name: string; type: string; debit: number; credit: number }>()
  for (const l of rawLines) {
    const acct = l.chart_of_accounts
    const existing = agg.get(acct.id)
    if (existing) {
      existing.debit += Number(l.debit)
      existing.credit += Number(l.credit)
    } else {
      agg.set(acct.id, { id: acct.id, code: acct.code, name: acct.name, type: acct.type, debit: Number(l.debit), credit: Number(l.credit) })
    }
  }

  return [...agg.values()]
    .map(a => ({
      id: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      total_debit: a.debit,
      total_credit: a.credit,
      balance: a.type === 'asset' || a.type === 'expense'
        ? a.debit - a.credit
        : a.credit - a.debit
    }))
    .sort((a, b) => a.code.localeCompare(b.code))
}

/**
 * Journal entries list
 */
export async function getJournalEntries(limit = 100): Promise<JournalEntryWithLines[]> {
  const auth = await requireRole(['owner'])
  if (auth.error) return []
  const { supabase } = auth

  const { data, error } = await sb(supabase)
    .from('journal_entries')
    .select('id, entry_number, entry_date, description, source, source_id, total_debit, total_credit, created_by, created_at, journal_lines(id, account_id, debit, credit, description, chart_of_accounts(code, name))')
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data as unknown as JournalEntryWithLines[]
}

/**
 * Get chart of accounts
 */
export async function getChartOfAccounts() {
  const auth = await requireRole(['owner'])
  if (auth.error) return []
  const { supabase } = auth

  const { data, error } = await sb(supabase)
    .from('chart_of_accounts')
    .select('*')
    .eq('is_active', true)
    .order('code', { ascending: true })

  if (error) return []
  return data ?? []
}

/**
 * Get balance for a single account
 */
export async function getAccountBalance(accountId: string): Promise<{ debit: number; credit: number; balance: number }> {
  const auth = await requireRole(['owner'])
  if (auth.error) return { debit: 0, credit: 0, balance: 0 }
  const { supabase } = auth

  const { data: account } = await sb(supabase)
    .from('chart_of_accounts')
    .select('type')
    .eq('id', accountId)
    .single()

  const { data: lines } = await sb(supabase)
    .from('journal_lines')
    .select('debit, credit')
    .eq('account_id', accountId)

  if (!lines) return { debit: 0, credit: 0, balance: 0 }

  const totalDebit = lines.reduce((s: number, l: { debit: number; credit: number }) => s + Number(l.debit), 0)
  const totalCredit = lines.reduce((s: number, l: { debit: number; credit: number }) => s + Number(l.credit), 0)
  const isDebitType = (account as { type: string } | null)?.type === 'asset' || (account as { type: string } | null)?.type === 'expense'

  return {
    debit: totalDebit,
    credit: totalCredit,
    balance: isDebitType ? totalDebit - totalCredit : totalCredit - totalDebit,
  }
}

/**
 * Manual journal entry (adjustments)
 */
export async function createJournalEntry(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const auth = await requireRole(['owner'])
  if (auth.error) return { error: auth.error }
  const { supabase, user } = auth

  const raw = Object.fromEntries(formData.entries())
  if (!raw.description) return { error: 'Deskripsi wajib diisi' }
  if (!raw.entry_date) return { error: 'Tanggal wajib diisi' }

  let lines: { account_id: string; debit: number; credit: number; description?: string }[]
  try {
    lines = JSON.parse(raw.lines_json as string)
  } catch {
    return { error: 'Data jurnal tidak valid' }
  }

  if (lines.length < 2) return { error: 'Minimal 2 baris jurnal (debit + credit)' }

  const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0)

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return { error: `Debit (${totalDebit}) ≠ Credit (${totalCredit})` }
  }

  // Generate entry number
  const today = new Date().toISOString().split('T')[0]
  const { count } = await sb(supabase)
    .from('journal_entries')
    .select('*', { count: 'exact', head: true })
    .eq('entry_date', today)

  const entryNumber = `JE-${today.replace(/-/g, '')}-${String((count ?? 0) + 1).padStart(3, '0')}`

  const { data: entry, error: entryErr } = await sb(supabase)
    .from('journal_entries')
    .insert({
      entry_number: entryNumber,
      entry_date: raw.entry_date as string,
      description: raw.description as string,
      source: 'adjustment',
      total_debit: totalDebit,
      total_credit: totalCredit,
      created_by: user.id,
    })
    .select()
    .single()

  if (entryErr) return { error: entryErr.message }

  const lineRows = lines.map(l => ({
    entry_id: (entry as { id: string }).id,
    account_id: l.account_id,
    debit: l.debit || 0,
    credit: l.credit || 0,
    description: l.description || null,
  }))

  const { error: lineErr } = await sb(supabase).from('journal_lines').insert(lineRows)
  if (lineErr) return { error: lineErr.message }

  return { success: true }
}

/**
 * Fiscal Periods
 */
export async function getFiscalPeriods(): Promise<FiscalPeriod[]> {
  const auth = await requireRole(['owner'])
  if (auth.error) return []
  const { supabase } = auth

  const { data, error } = await sb(supabase)
    .from('fiscal_periods')
    .select('*')
    .order('start_date', { ascending: false })

  if (error) return []
  return (data ?? []) as FiscalPeriod[]
}

export async function createFiscalPeriod(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const auth = await requireRole(['owner'])
  if (auth.error) return { error: auth.error }
  const { supabase, user } = auth

  const raw = Object.fromEntries(formData.entries())
  if (!raw.name) return { error: 'Nama periode wajib diisi' }
  if (!raw.period_type) return { error: 'Tipe periode wajib diisi' }
  if (!raw.start_date) return { error: 'Tanggal mulai wajib diisi' }
  if (!raw.end_date) return { error: 'Tanggal akhir wajib diisi' }

  const { error } = await sb(supabase).from('fiscal_periods').insert({
    name: raw.name as string,
    period_type: raw.period_type as 'monthly' | 'quarterly' | 'yearly',
    start_date: raw.start_date as string,
    end_date: raw.end_date as string,
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function closeFiscalPeriod(
  periodId: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  const auth = await requireRole(['owner'])
  if (auth.error) return { error: auth.error }
  const { supabase, user } = auth

  // Check if period is already closed
  const { data: period } = await sb(supabase).from('fiscal_periods').select('is_closed').eq('id', periodId).single()
  if (period?.is_closed) return { error: 'Periode sudah ditutup' }

  // Check if there are any unposted entries in this period
  const { data: entries } = await sb(supabase)
    .from('journal_entries')
    .select('id')
    .gte('entry_date', period.start_date)
    .lte('entry_date', period.end_date)
    .eq('is_posted', false)
    .limit(1)

  if (entries && entries.length > 0) {
    return { error: 'Masih ada jurnal yang belum diposting di periode ini' }
  }

  const { error } = await sb(supabase).from('fiscal_periods').update({
    is_closed: true,
    closed_by: user.id,
    closed_at: new Date().toISOString(),
  }).eq('id', periodId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function reopenFiscalPeriod(
  periodId: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  const auth = await requireRole(['owner'])
  if (auth.error) return { error: auth.error }
  const { supabase } = auth

  const { error } = await sb(supabase).from('fiscal_periods').update({
    is_closed: false,
    closed_by: null,
    closed_at: null,
  }).eq('id', periodId)

  if (error) return { error: error.message }
  return { success: true }
}

/**
 * Check if a date falls within a closed fiscal period
 */
export async function isDateInClosedPeriod(entryDate: string): Promise<boolean> {
  const supabase = await createClient()

  const { data } = await sb(supabase)
    .from('fiscal_periods')
    .select('is_closed')
    .eq('is_closed', true)
    .lte('start_date', entryDate)
    .gte('end_date', entryDate)
    .limit(1)

  return (data ?? []).length > 0
}

/**
 * Module Permissions
 */
export async function getModulePermissions(userId: string): Promise<ModulePermission[]> {
  const auth = await requireRole(['owner'])
  if (auth.error) return []
  const { supabase } = auth

  const { data, error } = await sb(supabase)
    .from('module_permissions')
    .select('*')
    .eq('user_id', userId)

  if (error) return []
  return (data ?? []) as ModulePermission[]
}

export async function upsertModulePermission(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const auth = await requireRole(['owner'])
  if (auth.error) return { error: auth.error }
  const { supabase } = auth

  const raw = Object.fromEntries(formData.entries())
  if (!raw.user_id) return { error: 'User ID wajib diisi' }
  if (!raw.module) return { error: 'Module wajib diisi' }

  const { error } = await sb(supabase).from('module_permissions').upsert({
    user_id: raw.user_id as string,
    module: raw.module as string,
    can_view: raw.can_view === 'true',
    can_create: raw.can_create === 'true',
    can_edit: raw.can_edit === 'true',
    can_delete: raw.can_delete === 'true',
  }, { onConflict: 'user_id,module' })

  if (error) return { error: error.message }
  return { success: true }
}

export async function checkModuleAccess(userId: string, module: string, action: 'view' | 'create' | 'edit' | 'delete' = 'view'): Promise<boolean> {
  const supabase = await createClient()
  const { data, error } = await sb(supabase).rpc('has_module_access', {
    p_module: module,
    p_action: action,
  })

  if (error) return false
  return (data as boolean) ?? false
}