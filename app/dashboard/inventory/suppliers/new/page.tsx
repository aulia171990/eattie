import { createSupplier } from '@/actions/suppliers'
import { SupplierForm } from '@/components/forms/supplier-form'
import { PageHeader } from '@/components/shared/page-header'

export default function NewSupplierPage() {
  return (
    <div className="p-6">
      <PageHeader title="Tambah Supplier" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Inventory', href: '/dashboard/inventory' }, { label: 'Supplier', href: '/dashboard/inventory/suppliers' }, { label: 'Tambah' }]} />
      <SupplierForm action={createSupplier} cancelHref="/dashboard/inventory/suppliers" />
    </div>
  )
}
