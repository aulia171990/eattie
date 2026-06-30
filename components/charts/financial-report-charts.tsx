'use client'

import { PnlChart } from './report-charts'

interface FinancialReportChartsProps {
  monthlyTrend: { month: string; revenue: number; expenses: number; profit: number }[]
}

export function FinancialReportCharts({ monthlyTrend }: FinancialReportChartsProps) {
  return (
    <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'hsl(var(--border))' }}>
      <h2 className="font-semibold text-sm mb-4" style={{ color: 'hsl(var(--foreground))' }}>
        Tren Bulanan — Pendapatan vs Pengeluaran
      </h2>
      <PnlChart data={monthlyTrend} height={260} />
    </div>
  )
}
