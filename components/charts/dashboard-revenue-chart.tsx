'use client'

import { RevenueChart } from './report-charts'

interface DashboardRevenueChartProps {
  data: { date: string; revenue: number }[]
}

export function DashboardRevenueChart({ data }: DashboardRevenueChartProps) {
  const chartData = data.map(d => ({ ...d, label: d.date }))
  return <RevenueChart data={chartData} height={160} />
}
