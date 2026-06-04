import { getCategories } from '@/actions/ingredients'
import { getSuppliers } from '@/actions/suppliers'
import { createIngredient } from '@/actions/ingredients'
import { IngredientForm } from '@/components/forms/ingredient-form'
import { PageHeader } from '@/components/shared/page-header'

export default async function NewIngredientPage() {
  const [categories, suppliers] = await Promise.all([getCategories(), getSuppliers(true)])
  return (
    <div className="p-6">
      <PageHeader
        title="Tambah Bahan Baku"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Inventory', href: '/dashboard/inventory' }, { label: 'Tambah Bahan' }]}
      />
      <IngredientForm action={createIngredient} categories={categories} suppliers={suppliers} cancelHref="/dashboard/inventory" />
    </div>
  )
}
