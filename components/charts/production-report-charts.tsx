'use client'

import { ProductionChart } from './report-charts'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ProductionReportChartsProps {
  byProduct: { name: string; produced: number; defect: number }[]
  statusBreakdown: { status: string; count: number }[]
}

const STATUS_COLORS: Record<string, string> = {
  planned: 'hsl(210, 60%, 55%)',
  in_progress: 'hsl(32, 95%, 50%)',
  completed: 'hsl(142, 60%, 45%)',
  cancelled: 'hsl(0, 60%, 55%)',
}
const STATUS_LABELS: Record<string, string> = {
  planned: 'Direncanakan', in_progress: 'Berlangsung', completed: 'Selesai', cancelled: 'Dibatalkan'
}

export function ProductionReportCharts({ byProduct, statusBreakdown }: ProductionReportChartsProps) {
  const pieData = statusBreakdown.filter(s => s.count > 0).map(s => ({
    name: STATUS_LABELS[s.status] ?? s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] ?? 'hsl(210, 10%, 55%)',
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-xl border p-5" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
        <h2 className="font-semibold text-sm mb-4" style={{ color: 'hsl(25, 30%, 15%)' }}>Output per Produk</h2>
        <ProductionChart data={byProduct.slice(0, 8)} height={240} />
      </div>

      <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
        <h2 className="font-semibold text-sm mb-4" style={{ color: 'hsl(25, 30%, 15%)' }}>Status Batch</h2>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
              dataKey="value" nameKey="name" paddingAngle={3}>
              {pieData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid hsl(36, 20%, 88%)', fontSize: 12 }} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
