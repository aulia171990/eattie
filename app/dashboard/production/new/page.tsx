import { getProducts } from '@/actions/products'
import { createProductionBatch } from '@/actions/production'
import { PageHeader } from '@/components/shared/page-header'
import { ProductionForm } from '@/components/forms/production-form'

export default async function NewProductionPage() {
  const products = await getProducts(true)
  return (
    <div className="p-6">
      <PageHeader title="Buat Batch Produksi" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Produksi', href: '/dashboard/production' }, { label: 'Buat Batch' }]} />
      <ProductionForm action={createProductionBatch} products={products} cancelHref="/dashboard/production" />
    </div>
  )
}
