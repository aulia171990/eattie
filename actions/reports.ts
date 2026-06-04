'use server'

import { createClient } from '@/lib/supabase/server'
import {
  format,
  subDays,
  startOfMonth,
  eachDayOfInterval,
  eachMonthOfInterval,
  startOfYear,
} from 'date-fns'

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
  const supabase = await createClient()

  const { data: sales } = await supabase
    .from('sales')
    .select(
      'id,total,discount_amount,payment_method,created_at,sale_items(product_name,quantity,unit_price,subtotal)'
    )
    .eq('status', 'completed')
    .gte('created_at', `${dateFrom}T00:00:00`)
    .lte('created_at', `${dateTo}T23:59:59`)
    .order('created_at', { ascending: true })

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
    const daySales = sales.filter((s) => s.created_at.startsWith(dayStr))
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
  const supabase = await createClient()

  const { data: batches } = await supabase
    .from('production_batches')
    .select(
      'id,batch_number,status,scheduled_date,quantity_planned,quantity_produced,quantity_defect,products:product_id(name)'
    )
    .gte('scheduled_date', dateFrom)
    .lte('scheduled_date', dateTo)
    .order('scheduled_date', { ascending: true })

  if (!batches) return null

  type BatchRow = (typeof batches)[number] & {
    products: { name: string } | null
  }
  const typedBatches = batches as unknown as BatchRow[]

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
  const supabase = await createClient()

  const { data: sales } = await supabase
    .from('sales')
    .select('total, discount_amount, created_at')
    .eq('status', 'completed')
    .gte('created_at', `${dateFrom}T00:00:00`)
    .lte('created_at', `${dateTo}T23:59:59`)

  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, category, expense_date')
    .gte('expense_date', dateFrom)
    .lte('expense_date', dateTo)

  const revenue = (sales ?? []).reduce((s, t) => s + t.total, 0)
  const totalDiscount = (sales ?? []).reduce((s, t) => s + (t.discount_amount ?? 0), 0)
  const totalExpenses = (expenses ?? []).reduce((s, e) => s + e.amount, 0)
  const netProfit = revenue - totalExpenses
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
      .filter((s) => s.created_at.startsWith(mStr))
      .reduce((s, t) => s + t.total, 0)
    const mExpenses = (expenses ?? [])
      .filter((e) => e.expense_date.startsWith(mStr))
      .reduce((s, e) => s + e.amount, 0)
    return {
      month: format(month, 'MMM yy'),
      revenue: mRevenue,
      expenses: mExpenses,
      profit: mRevenue - mExpenses,
    }
  })

  return {
    revenue,
    totalDiscount,
    totalExpenses,
    grossProfit: revenue,
    netProfit,
    profitMargin,
    expenseBreakdown,
    monthlyTrend,
    transactionCount: sales?.length ?? 0,
  }
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const last7 = format(subDays(new Date(), 6), 'yyyy-MM-dd')

  const [
    { data: todaySales },
    { data: monthSales },
    { data: last7Sales },
    { count: lowStockCount },
    { count: activeBatchCount },
  ] = await Promise.all([
    supabase
      .from('sales')
      .select('total')
      .eq('status', 'completed')
      .gte('created_at', `${today}T00:00:00`),
    supabase
      .from('sales')
      .select('total')
      .eq('status', 'completed')
      .gte('created_at', `${monthStart}T00:00:00`),
    supabase
      .from('sales')
      .select('total,created_at')
      .eq('status', 'completed')
      .gte('created_at', `${last7}T00:00:00`)
      .order('created_at'),
    supabase
      .from('ingredients')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .lte('current_stock', 0),
    supabase
      .from('production_batches')
      .select('id', { count: 'exact', head: true })
      .in('status', ['planned', 'in_progress']),
  ])

  const days = eachDayOfInterval({
    start: new Date(last7),
    end: new Date(),
  })
  const last7Data = days.map((day) => {
    const d = format(day, 'yyyy-MM-dd')
    const rev = (last7Sales ?? [])
      .filter((s) => s.created_at.startsWith(d))
      .reduce((s, t) => s + t.total, 0)
    return { date: format(day, 'dd/MM'), revenue: rev }
  })

  return {
    todayRevenue: (todaySales ?? []).reduce((s, t) => s + t.total, 0),
    todayTransactions: todaySales?.length ?? 0,
    monthRevenue: (monthSales ?? []).reduce((s, t) => s + t.total, 0),
    lowStockCount: lowStockCount ?? 0,
    activeBatchCount: activeBatchCount ?? 0,
    last7Data,
  }
}
