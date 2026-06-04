'use client'

import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

// ─── Revenue Area Chart ──────────────────────────────────────────
interface RevenueChartProps {
  data: { label?: string; date?: string; month?: string; revenue: number }[]
  height?: number
}

export function RevenueChart({ data, height = 220 }: RevenueChartProps) {
  const key = data[0]?.label ? 'label' : data[0]?.month ? 'month' : 'date'
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(32, 95%, 44%)" stopOpacity={0.15} />
            <stop offset="95%" stopColor="hsl(32, 95%, 44%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(36, 20%, 92%)" vertical={false} />
        <XAxis dataKey={key} tick={{ fontSize: 11, fill: 'hsl(25, 15%, 55%)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'hsl(25, 15%, 55%)' }} axisLine={false} tickLine={false}
          tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)} />
        <Tooltip
          formatter={(v: number) => [formatCurrency(v), 'Revenue']}
          contentStyle={{ borderRadius: '10px', border: '1px solid hsl(36, 20%, 88%)', fontSize: 12 }}
        />
        <Area type="monotone" dataKey="revenue" stroke="hsl(32, 95%, 44%)" strokeWidth={2}
          fill="url(#revenueGrad)" dot={false} activeDot={{ r: 4, fill: 'hsl(32, 95%, 44%)' }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Transaction Bar Chart ───────────────────────────────────────
interface TxnChartProps {
  data: { label?: string; date?: string; transactions: number }[]
  height?: number
}

export function TransactionChart({ data, height = 180 }: TxnChartProps) {
  const key = data[0]?.label ? 'label' : 'date'
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barSize={12}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(36, 20%, 92%)" vertical={false} />
        <XAxis dataKey={key} tick={{ fontSize: 11, fill: 'hsl(25, 15%, 55%)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'hsl(25, 15%, 55%)' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid hsl(36, 20%, 88%)', fontSize: 12 }} />
        <Bar dataKey="transactions" name="Transaksi" fill="hsl(210, 70%, 55%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── P&L Bar Chart (revenue vs expenses) ────────────────────────
interface PnlChartProps {
  data: { month: string; revenue: number; expenses: number; profit: number }[]
  height?: number
}

export function PnlChart({ data, height = 240 }: PnlChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barGap={4} barSize={14}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(36, 20%, 92%)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(25, 15%, 55%)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'hsl(25, 15%, 55%)' }} axisLine={false} tickLine={false}
          tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)} />
        <Tooltip formatter={(v: number) => formatCurrency(v)}
          contentStyle={{ borderRadius: '10px', border: '1px solid hsl(36, 20%, 88%)', fontSize: 12 }} />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="revenue" name="Pendapatan" fill="hsl(32, 95%, 50%)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expenses" name="Pengeluaran" fill="hsl(0, 70%, 60%)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="profit" name="Laba Bersih" fill="hsl(142, 60%, 45%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Payment Method Pie ──────────────────────────────────────────
const PIE_COLORS = [
  'hsl(142, 60%, 45%)',
  'hsl(210, 70%, 55%)',
  'hsl(262, 60%, 55%)',
  'hsl(32, 95%, 50%)',
]

interface PaymentPieProps {
  data: { method: string; total: number; count: number }[]
  height?: number
}

const methodLabels: Record<string, string> = {
  cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer', card: 'Kartu'
}

export function PaymentPieChart({ data, height = 200 }: PaymentPieProps) {
  const chartData = data.map(d => ({ ...d, name: methodLabels[d.method] ?? d.method }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
          dataKey="total" nameKey="name" paddingAngle={3}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => formatCurrency(v)}
          contentStyle={{ borderRadius: '10px', border: '1px solid hsl(36, 20%, 88%)', fontSize: 12 }} />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ─── Production Bar ──────────────────────────────────────────────
interface ProductionChartProps {
  data: { name: string; produced: number; defect: number }[]
  height?: number
}

export function ProductionChart({ data, height = 220 }: ProductionChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 40, left: 0, bottom: 0 }} barSize={14}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(36, 20%, 92%)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(25, 15%, 55%)' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(25, 15%, 55%)' }} axisLine={false} tickLine={false} width={90} />
        <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid hsl(36, 20%, 88%)', fontSize: 12 }} />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="produced" name="Berhasil" fill="hsl(142, 60%, 45%)" radius={[0, 4, 4, 0]} stackId="a" />
        <Bar dataKey="defect" name="Defect" fill="hsl(0, 70%, 60%)" radius={[0, 4, 4, 0]} stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  )
}
