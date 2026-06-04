import { getSupplier, updateSupplier } from '@/actions/suppliers'
import { SupplierForm } from '@/components/forms/supplier-form'
import { PageHeader } from '@/components/shared/page-header'
import { notFound } from 'next/navigation'

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let supplier
  try { supplier = await getSupplier(id) }
  catch { notFound() }

  const boundAction = updateSupplier.bind(null, id)
  return (
    <div className="p-6">
      <PageHeader title={`Edit: ${supplier.name}`} breadcrumbs={[{ label: 'Inventory', href: '/dashboard/inventory' }, { label: 'Supplier', href: '/dashboard/inventory/suppliers' }, { label: 'Edit' }]} />
      <SupplierForm action={boundAction} supplier={supplier} cancelHref="/dashboard/inventory/suppliers" />
    </div>
  )
}
