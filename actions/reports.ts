'use server'

import { createClient } from '@/lib/supabase/server'
import {
  format,
  startOfMonth,
  eachDayOfInterval,
  eachMonthOfInterval,
} from 'date-fns'
import { requireRole } from '@/lib/auth'

// Convert a UTC ISO timestamp to its Asia/Jakarta (WIB) calendar day/month key.
// created_at is schema-nullable (no NULL rows currently in DB); accept null -> '' to stay safe.
function wibDayKey(iso: string | null): string {
  if (!iso) return ''
  return format(new Date(new Date(iso).getTime() + 7 * 3600 * 1000), 'yyyy-MM-dd')
}
function wibMonthKey(iso: string | null): string {
  if (!iso) return ''
  return format(new Date(new Date(iso).getTime() + 7 * 3600 * 1000), 'yyyy-MM')
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DayData {
  date: string
  label: string
  revenue: number
  transactions: number
}

export interface PaymentBreakdown {
  method: string
  count: number
  total: number
}

export interface TopProduct {
  name: string
  qty: number
  revenue: number
}

export interface SalesReportData {
  totalRevenue: number
  totalTransactions: number
  totalDiscount: number
  avgOrder: number
  byPayment: PaymentBreakdown[]
  dailyData: DayData[]
  topProducts: TopProduct[]
}

export interface ProductionByProduct {
  name: string
  produced: number
  defect: number
}

export interface StatusCount {
  status: string
  count: number
}

export interface ProductionReportData {
  totalBatches: number
  completedBatches: number
  totalPlanned: number
  totalProduced: number
  totalDefect: number
  successRate: number
  defectRate: number
  byProduct: ProductionByProduct[]
  statusBreakdown: StatusCount[]
  batches: Array<{
    id: string
    batch_number: string
    status: string
    scheduled_date: string | null
    quantity_planned: number
    quantity_produced: number
    quantity_defect: number
    products: { name: string } | null
  }>
}

export interface ExpenseBreakdown {
  category: string
  amount: number
}

export interface MonthlyTrend {
  month: string
  revenue: number
  expenses: number
  profit: number
}

export interface FinancialReportData {
  revenue: number
  totalDiscount: number
  totalCogs: number
  totalExpenses: number
  grossProfit: number
  netProfit: number
  profitMargin: number
  expenseBreakdown: ExpenseBreakdown[]
  monthlyTrend: MonthlyTrend[]
  transactionCount: number
}

export interface DashboardStats {
  todayRevenue: number
  todayTransactions: number
  monthRevenue: number
  lowStockCount: number
  activeBatchCount: number
  last7Data: Array<{ date: string; revenue: number }>
}

// ─── Sales report ─────────────────────────────────────────────────────────────

export async function getSalesReport(
  dateFrom: string,
  dateTo: string
): Promise<SalesReportData | null> {
  const auth = await requireRole(['owner'])
  if (auth.error) return null
  const { supabase } = auth

  const startUtc = new Date(`${dateFrom}T00:00:00+07:00`)
  const endUtc = new Date(`${dateTo}T23:59:59+07:00`)

  const { data: sales } = await supabase
    .from('sales')
    .select(
      'id,total,discount_amount,payment_method,created_at,sale_items(product_name,quantity,unit_price,subtotal)'
    )
    .eq('status', 'completed')
    .gte('created_at', startUtc.toISOString())
    .lte('created_at', endUtc.toISOString())
    .order('created_at', { ascending: true })
    .limit(2000)

  if (!sales) return null

  const totalRevenue = sales.reduce((s, t) => s + t.total, 0)
  const totalTransactions = sales.length
  const totalDiscount = sales.reduce((s, t) => s + (t.discount_amount ?? 0), 0)
  const avgOrder = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

  const byPayment: PaymentBreakdown[] = (
    ['cash', 'qris', 'transfer', 'card'] as const
  ).map((method) => ({
    method,
    count: sales.filter((s) => s.payment_method === method).length,
    total: sales
      .filter((s) => s.payment_method === method)
      .reduce((acc, t) => acc + t.total, 0),
  })).filter((p) => p.count > 0)

  const days = eachDayOfInterval({
    start: new Date(dateFrom),
    end: new Date(dateTo),
  })
  const dailyData: DayData[] = days.map((day) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    const daySales = sales.filter((s) => {
      // sales.created_at is schema-nullable (no NULL rows currently in DB); guard for safety.
      if (!s.created_at) return false
      const wib = new Date(new Date(s.created_at).getTime() + 7 * 3600 * 1000)
      return format(wib, 'yyyy-MM-dd') === dayStr
    })
    return {
      date: dayStr,
      label: format(day, 'dd/MM'),
      revenue: daySales.reduce((s, t) => s + t.total, 0),
      transactions: daySales.length,
    }
  })

  const productMap: Record<string, TopProduct> = {}
  for (const sale of sales) {
    const items = sale.sale_items as Array<{
      product_name: string
      quantity: number
      subtotal: number
    }> | null
    for (const item of items ?? []) {
      if (!productMap[item.product_name]) {
        productMap[item.product_name] = { name: item.product_name, qty: 0, revenue: 0 }
      }
      productMap[item.product_name].qty += item.quantity
      productMap[item.product_name].revenue += item.subtotal
    }
  }
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  return { totalRevenue, totalTransactions, totalDiscount, avgOrder, byPayment, dailyData, topProducts }
}

// ─── Production report ────────────────────────────────────────────────────────

export async function getProductionReport(
  dateFrom: string,
  dateTo: string
): Promise<ProductionReportData | null> {
  const auth = await requireRole(['owner'])
  if (auth.error) return null
  const { supabase } = auth

  const { data: batches } = await supabase
    .from('production_batches')
    .select(
      'id,batch_number,status,scheduled_date,quantity_planned,quantity_produced,quantity_defect,products:product_id(name)'
    )
    .gte('scheduled_date', dateFrom)
    .lte('scheduled_date', dateTo)
    .order('scheduled_date', { ascending: true })

  if (!batches) return null

  const typedBatches = batches as unknown as Array<{
    id: string
    batch_number: string
    status: string
    scheduled_date: string | null
    quantity_planned: number
    quantity_produced: number
    quantity_defect: number
    products: { name: string } | null
  }>

  const completed = typedBatches.filter((b) => b.status === 'completed')
  const totalPlanned = typedBatches.reduce((s, b) => s + b.quantity_planned, 0)
  const totalProduced = completed.reduce((s, b) => s + b.quantity_produced, 0)
  const totalDefect = completed.reduce((s, b) => s + b.quantity_defect, 0)
  const successRate = totalPlanned > 0 ? (totalProduced / totalPlanned) * 100 : 0
  const defectRate =
    totalProduced + totalDefect > 0
      ? (totalDefect / (totalProduced + totalDefect)) * 100
      : 0

  const productMap: Record<string, ProductionByProduct> = {}
  for (const b of completed) {
    const name = b.products?.name ?? 'Unknown'
    if (!productMap[name]) productMap[name] = { name, produced: 0, defect: 0 }
    productMap[name].produced += b.quantity_produced
    productMap[name].defect += b.quantity_defect
  }

  const statusBreakdown: StatusCount[] = (
    ['planned', 'in_progress', 'completed', 'cancelled'] as const
  ).map((status) => ({
    status,
    count: typedBatches.filter((b) => b.status === status).length,
  }))

  return {
    totalBatches: typedBatches.length,
    completedBatches: completed.length,
    totalPlanned,
    totalProduced,
    totalDefect,
    successRate,
    defectRate,
    byProduct: Object.values(productMap).sort((a, b) => b.produced - a.produced),
    statusBreakdown,
    batches: typedBatches,
  }
}

// ─── Financial report ─────────────────────────────────────────────────────────

export async function getFinancialReport(
  dateFrom: string,
  dateTo: string
): Promise<FinancialReportData | null> {
  const auth = await requireRole(['owner'])
  if (auth.error) return null
  const { supabase } = auth

  const startUtc = new Date(`${dateFrom}T00:00:00+07:00`).toISOString()
  const endUtc = new Date(`${dateTo}T23:59:59+07:00`).toISOString()

  const { data: sales } = await supabase
    .from('sales')
    .select('total, discount_amount, created_at, cogs')
    .eq('status', 'completed')
    .gte('created_at', startUtc)
    .lte('created_at', endUtc)

  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, category, expense_date')
    .gte('expense_date', dateFrom)
    .lte('expense_date', dateTo)

  const revenue = (sales ?? []).reduce((s, t) => s + t.total, 0)
  const totalDiscount = (sales ?? []).reduce((s, t) => s + (t.discount_amount ?? 0), 0)
  const totalCogs = (sales ?? []).reduce((s, t) => s + (t.cogs ?? 0), 0)
  const grossProfit = revenue - totalCogs
  const totalExpenses = (expenses ?? []).reduce((s, e) => s + e.amount, 0)
  const netProfit = grossProfit - totalExpenses
  const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0

  const expByCat: Record<string, number> = {}
  for (const e of expenses ?? []) {
    expByCat[e.category] = (expByCat[e.category] ?? 0) + e.amount
  }
  const expenseBreakdown: ExpenseBreakdown[] = Object.entries(expByCat)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  const months = eachMonthOfInterval({
    start: new Date(dateFrom),
    end: new Date(dateTo),
  })
  const monthlyTrend: MonthlyTrend[] = months.map((month) => {
    const mStr = format(month, 'yyyy-MM')
    const mRevenue = (sales ?? [])
      .filter((s) => wibMonthKey(s.created_at) === mStr)
      .reduce((s, t) => s + t.total, 0)
    const mCogs = (sales ?? [])
      .filter((s) => wibMonthKey(s.created_at) === mStr)
      .reduce((s, t) => s + (t.cogs ?? 0), 0)
    const mExpenses = (expenses ?? [])
      .filter((e) => e.expense_date.startsWith(mStr))
      .reduce((s, e) => s + e.amount, 0)
    return {
      month: format(month, 'MMM yy'),
      revenue: mRevenue,
      expenses: mExpenses,
      profit: mRevenue - mCogs - mExpenses,
    }
  })

  return {
    revenue,
    totalDiscount,
    totalCogs,
    totalExpenses,
    grossProfit,
    netProfit,
    profitMargin,
    expenseBreakdown,
    monthlyTrend,
    transactionCount: sales?.length ?? 0,
  }
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const auth = await requireRole(['owner'])
  if (auth.error) return { todayRevenue: 0, todayTransactions: 0, monthRevenue: 0, lowStockCount: 0, activeBatchCount: 0, last7Data: [] }
  const { supabase } = auth
  
  const todayWib = format(new Date(new Date().getTime() + 7 * 3600 * 1000), 'yyyy-MM-dd')
  const monthStartWib = format(
    startOfMonth(new Date(new Date().getTime() + 7 * 3600 * 1000)),
    'yyyy-MM-dd'
  )
  const last7Wib = format(
    new Date(new Date().getTime() + 7 * 3600 * 1000 - 6 * 86400 * 1000),
    'yyyy-MM-dd'
  )

  const todayStartUtc = new Date(`${todayWib}T00:00:00+07:00`).toISOString()
  const monthStartUtc = new Date(`${monthStartWib}T00:00:00+07:00`).toISOString()
  const last7StartUtc = new Date(`${last7Wib}T00:00:00+07:00`).toISOString()

  const [
    { data: todaySales },
    { data: monthSales },
    { data: last7Sales },
    { data: lowStockRows },
    { count: activeBatchCount },
  ] = await Promise.all([
    supabase
      .from('sales')
      .select('total')
      .eq('status', 'completed')
      .gte('created_at', todayStartUtc),
    supabase
      .from('sales')
      .select('total')
      .eq('status', 'completed')
      .gte('created_at', monthStartUtc),
    supabase
      .from('sales')
      .select('total,created_at')
      .eq('status', 'completed')
      .gte('created_at', last7StartUtc)
      .order('created_at'),
    supabase
      .from('ingredients')
      .select('id, current_stock, min_stock')
      .eq('is_active', true),
    supabase
      .from('production_batches')
      .select('id', { count: 'exact', head: true })
      .in('status', ['planned', 'in_progress']),
  ])

  const days = eachDayOfInterval({
    start: new Date(last7Wib + 'T00:00:00+07:00'),
    end: new Date(new Date().getTime() + 7 * 3600 * 1000),
  })
  const last7Data = days.map((day) => {
    const d = format(day, 'yyyy-MM-dd')
    const rev = (last7Sales ?? [])
      .filter((s) => wibDayKey(s.created_at) === d)
      .reduce((s, t) => s + t.total, 0)
    return { date: format(day, 'dd/MM'), revenue: rev }
  })

  return {
    todayRevenue: (todaySales ?? []).reduce((s, t) => s + t.total, 0),
    todayTransactions: todaySales?.length ?? 0,
    monthRevenue: (monthSales ?? []).reduce((s, t) => s + t.total, 0),
    lowStockCount: (lowStockRows ?? []).filter(
      (r) => Number(r.current_stock) <= Number(r.min_stock ?? 0)
    ).length,
    activeBatchCount: activeBatchCount ?? 0,
    last7Data,
  }
}

// ─── P&L / Balance Sheet / Cash Flow (double-entry based) ─────────────────────

export interface PLLine {
  account_code: string
  account_name: string
  total: number
}

export interface PLReport {
  period: { from: string; to: string }
  revenue: PLLine[]
  totalRevenue: number
  cogs: PLLine[]
  totalCogs: number
  grossProfit: number
  opex: PLLine[]
  totalOpex: number
  netProfit: number
}

export interface BSLine {
  account_code: string
  account_name: string
  balance: number
}

export interface BSReport {
  asOfDate: string
  assets: BSLine[]
  totalAssets: number
  liabilities: BSLine[]
  totalLiabilities: number
  equity: BSLine[]
  totalEquity: number
  isBalanced: boolean
}

export interface CFLine {
  label: string
  amount: number
}

export interface CFReport {
  period: { from: string; to: string }
  operating: CFLine[]
  operatingTotal: number
  investing: CFLine[]
  investingTotal: number
  financing: CFLine[]
  financingTotal: number
  netCashFlow: number
}

// ponytail: generated types don't know accounting tables. Remove `as any` after `supabase gen types`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Q = any
function sb(s: Q): Q { return s }

export async function getPLReport(fromDate: string, toDate: string): Promise<PLReport> {
  const auth = await requireRole(['owner'])
  if (auth.error) return { period: { from: fromDate, to: toDate }, revenue: [], totalRevenue: 0, cogs: [], totalCogs: 0, grossProfit: 0, opex: [], totalOpex: 0, netProfit: 0 }
  const { supabase } = auth

  const { data: lines } = await sb(supabase)
    .from('journal_lines')
    .select('debit, credit, chart_of_accounts!inner(code, name, type), journal_entries!inner(entry_date)')
    .gte('journal_entries.entry_date', fromDate)
    .lte('journal_entries.entry_date', toDate)

  if (!lines || lines.length === 0) {
    return { period: { from: fromDate, to: toDate }, revenue: [], totalRevenue: 0, cogs: [], totalCogs: 0, grossProfit: 0, opex: [], totalOpex: 0, netProfit: 0 }
  }

  const byAccount = new Map<string, { code: string; name: string; type: string; debit: number; credit: number }>()
  for (const l of lines) {
    const acct = l.chart_of_accounts as { code: string; name: string; type: string }
    const key = acct.code
    const existing = byAccount.get(key)
    if (existing) {
      existing.debit += Number(l.debit)
      existing.credit += Number(l.credit)
    } else {
      byAccount.set(key, { code: acct.code, name: acct.name, type: acct.type, debit: Number(l.debit), credit: Number(l.credit) })
    }
  }

  const revenue: PLLine[] = []
  const cogs: PLLine[] = []
  const opex: PLLine[] = []

  for (const a of byAccount.values()) {
    if (a.type === 'revenue') {
      revenue.push({ account_code: a.code, account_name: a.name, total: a.credit - a.debit })
    } else if (a.code === '5000' || a.code === '5100') {
      cogs.push({ account_code: a.code, account_name: a.name, total: a.debit - a.credit })
    } else if (a.type === 'expense') {
      opex.push({ account_code: a.code, account_name: a.name, total: a.debit - a.credit })
    }
  }

  const totalRevenue = revenue.reduce((s, l) => s + l.total, 0)
  const totalCogs = cogs.reduce((s, l) => s + l.total, 0)
  const totalOpex = opex.reduce((s, l) => s + l.total, 0)

  return {
    period: { from: fromDate, to: toDate },
    revenue: revenue.sort((a, b) => a.account_code.localeCompare(b.account_code)),
    totalRevenue,
    cogs: cogs.sort((a, b) => a.account_code.localeCompare(b.account_code)),
    totalCogs,
    grossProfit: totalRevenue - totalCogs,
    opex: opex.sort((a, b) => a.account_code.localeCompare(b.account_code)),
    totalOpex,
    netProfit: totalRevenue - totalCogs - totalOpex,
  }
}

export async function getBalanceSheet(asOfDate: string): Promise<BSReport> {
  const auth = await requireRole(['owner'])
  if (auth.error) return { asOfDate, assets: [], totalAssets: 0, liabilities: [], totalLiabilities: 0, equity: [], totalEquity: 0, isBalanced: true }
  const { supabase } = auth

  const { data: lines } = await sb(supabase)
    .from('journal_lines')
    .select('debit, credit, chart_of_accounts!inner(code, name, type), journal_entries!inner(entry_date)')
    .lte('journal_entries.entry_date', asOfDate)

  if (!lines || lines.length === 0) {
    return { asOfDate, assets: [], totalAssets: 0, liabilities: [], totalLiabilities: 0, equity: [], totalEquity: 0, isBalanced: true }
  }

  const byAccount = new Map<string, { code: string; name: string; type: string; debit: number; credit: number }>()
  for (const l of lines) {
    const acct = l.chart_of_accounts as { code: string; name: string; type: string }
    const key = acct.code
    const existing = byAccount.get(key)
    if (existing) {
      existing.debit += Number(l.debit)
      existing.credit += Number(l.credit)
    } else {
      byAccount.set(key, { code: acct.code, name: acct.name, type: acct.type, debit: Number(l.debit), credit: Number(l.credit) })
    }
  }

  const assets: BSLine[] = []
  const liabilities: BSLine[] = []
  const equity: BSLine[] = []

  for (const a of byAccount.values()) {
    const balance = a.type === 'asset' || a.type === 'expense'
      ? a.debit - a.credit
      : a.credit - a.debit

    if (a.type === 'asset') {
      assets.push({ account_code: a.code, account_name: a.name, balance: Math.abs(balance) })
    } else if (a.type === 'liability') {
      liabilities.push({ account_code: a.code, account_name: a.name, balance: Math.abs(balance) })
    } else if (a.type === 'equity') {
      equity.push({ account_code: a.code, account_name: a.name, balance: Math.abs(balance) })
    }
  }

  const totalRevenue = [...byAccount.values()].filter(a => a.type === 'revenue').reduce((s, a) => s + (a.credit - a.debit), 0)
  const totalExpense = [...byAccount.values()].filter(a => a.type === 'expense').reduce((s, a) => s + (a.debit - a.credit), 0)
  const netProfit = totalRevenue - totalExpense

  if (netProfit !== 0) {
    equity.push({ account_code: '3200', account_name: 'Laba Bulan Berjalan', balance: Math.abs(netProfit) })
  }

  const totalAssets = assets.reduce((s, l) => s + l.balance, 0)
  const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0)
  const totalEquity = equity.reduce((s, l) => s + l.balance, 0)

  return {
    asOfDate,
    assets: assets.sort((a, b) => a.account_code.localeCompare(b.account_code)),
    totalAssets,
    liabilities: liabilities.sort((a, b) => a.account_code.localeCompare(b.account_code)),
    totalLiabilities,
    equity: equity.sort((a, b) => a.account_code.localeCompare(b.account_code)),
    totalEquity,
    isBalanced: Math.abs(totalAssets - totalLiabilities - totalEquity) < 0.01,
  }
}

export async function getCashFlowReport(fromDate: string, toDate: string): Promise<CFReport> {
  const auth = await requireRole(['owner'])
  if (auth.error) return { period: { from: fromDate, to: toDate }, operating: [], operatingTotal: 0, investing: [], investingTotal: 0, financing: [], financingTotal: 0, netCashFlow: 0 }
  const { supabase } = auth

  const pl = await getPLReport(fromDate, toDate)

  const operating: CFLine[] = [
    { label: 'Laba Bersih', amount: pl.netProfit },
  ]
  const operatingTotal = operating.reduce((s, l) => s + l.amount, 0)

  const { data: investLines } = await sb(supabase)
    .from('journal_lines')
    .select('debit, credit, chart_of_accounts!inner(code, type), journal_entries!inner(entry_date)')
    .gte('journal_entries.entry_date', fromDate)
    .lte('journal_entries.entry_date', toDate)
    .in('chart_of_accounts.code', ['1600', '5600'])

  const investingTotal = (investLines ?? []).reduce((s: number, l: { debit: number; credit: number; chart_of_accounts: { code: string; type: string } }) => {
    const acct = l.chart_of_accounts
    if (acct.type === 'expense') return s - Number(l.debit) + Number(l.credit)
    return s + Number(l.debit) - Number(l.credit)
  }, 0)

  const investing: CFLine[] = investingTotal !== 0 ? [{ label: 'Pembelian/Penjualan Peralatan', amount: investingTotal }] : []

  const { data: finLines } = await sb(supabase)
    .from('journal_lines')
    .select('debit, credit, chart_of_accounts!inner(code, type), journal_entries!inner(entry_date)')
    .gte('journal_entries.entry_date', fromDate)
    .lte('journal_entries.entry_date', toDate)
    .eq('chart_of_accounts.code', '3000')

  const financingTotal = (finLines ?? []).reduce((s: number, l: { debit: number; credit: number }) => {
    return s + Number(l.credit) - Number(l.debit)
  }, 0)

  const financing: CFLine[] = financingTotal !== 0 ? [{ label: 'Penyetoran Modal', amount: financingTotal }] : []

  return {
    period: { from: fromDate, to: toDate },
    operating,
    operatingTotal,
    investing,
    investingTotal,
    financing,
    financingTotal,
    netCashFlow: operatingTotal + investingTotal + financingTotal,
  }
}
