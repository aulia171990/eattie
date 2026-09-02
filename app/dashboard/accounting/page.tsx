import { PageHeader } from '@/components/shared/page-header'
import { LedgerDashboard } from '@/components/accounting/ledger-dashboard'

export const metadata = {
  title: 'Buku Besar - Dashboard',
}

export default function AccountingPage() {
  return (
    <div className="p-6">
      <PageHeader
        title="Buku Besar"
        description="Neraca saldo, jurnal, dan perkiraan akuntansi"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Akuntansi' },
        ]}
      />
      <LedgerDashboard />
    </div>
  )
}
