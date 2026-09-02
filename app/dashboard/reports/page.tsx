import Link from 'next/link'
import { PageHeader } from '@/components/shared/page-header'

export default function ReportsPage() {
  return (
    <div className="p-6 max-w-3xl">
      <PageHeader title="Laporan" description="Analisis bisnis dan laporan keuangan" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Laporan' }]} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: '/dashboard/reports/sales', icon: '📊', title: 'Laporan Penjualan', desc: 'Revenue harian, mingguan, bulanan' },
          { href: '/dashboard/reports/production', icon: '🏭', title: 'Laporan Produksi', desc: 'Output batch dan efisiensi' },
          { href: '/dashboard/reports/financial', icon: '💰', title: 'Laporan Keuangan', desc: 'P&L, pengeluaran, margin' },
        ].map(r => (
          <Link key={r.href} href={r.href} className="bg-white rounded-xl border p-5 hover:shadow-sm transition-all" style={{ borderColor: 'hsl(var(--border))' }}>
            <div className="text-3xl mb-3">{r.icon}</div>
            <h3 className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>{r.title}</h3>
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-muted))' }}>{r.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
