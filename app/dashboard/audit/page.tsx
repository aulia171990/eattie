import { PageHeader } from '@/components/shared/page-header'
import { AuditTrail } from '@/components/audit/audit-trail'

export const metadata = {
  title: 'Audit Log - Dashboard',
}

export default function AuditPage() {
  return (
    <div className="p-6">
      <PageHeader
        title="Audit Log"
        description="Jejak perubahan data sistem"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Audit Log' }]}
      />
      <AuditTrail />
    </div>
  )
}
