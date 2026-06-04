'use client'

import { RevenueChart, TransactionChart, PaymentPieChart } from './report-charts'

interface SalesReportChartsProps {
  dailyData: { label?: string; date?: string; revenue: number; transactions: number }[]
  byPayment: { method: string; total: number; count: number }[]
}

export function SalesReportCharts({ dailyData, byPayment }: SalesReportChartsProps) {
  const chartData = dailyData.map(d => ({ ...d, label: d.label ?? d.date }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Revenue trend */}
      <div className="lg:col-span-2 bg-white rounded-xl border p-5" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
        <h2 className="font-semibold text-sm mb-4" style={{ color: 'hsl(25, 30%, 15%)' }}>
          Tren Pendapatan
        </h2>
        <RevenueChart data={chartData} height={220} />
      </div>

      {/* Payment pie */}
      <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
        <h2 className="font-semibold text-sm mb-4" style={{ color: 'hsl(25, 30%, 15%)' }}>
          Metode Bayar
        </h2>
        {byPayment.length > 0
          ? <PaymentPieChart data={byPayment} height={200} />
          : <div className="flex items-center justify-center h-48 text-sm" style={{ color: 'hsl(25, 15%, 55%)' }}>Tidak ada data</div>
        }
      </div>

      {/* Transaction count */}
      <div className="lg:col-span-3 bg-white rounded-xl border p-5" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
        <h2 className="font-semibold text-sm mb-4" style={{ color: 'hsl(25, 30%, 15%)' }}>
          Jumlah Transaksi per Hari
        </h2>
        <TransactionChart data={chartData} height={160} />
      </div>
    </div>
  )
}
