import { getIngredient, getCategories, updateIngredient } from '@/actions/ingredients'
import { getSuppliers } from '@/actions/suppliers'
import { IngredientForm } from '@/components/forms/ingredient-form'
import { PageHeader } from '@/components/shared/page-header'
import { notFound } from 'next/navigation'

export default async function EditIngredientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let ingredient
  try {
    ingredient = await getIngredient(id)
  } catch {
    notFound()
  }

  const [categories, suppliers] = await Promise.all([
    getCategories(),
    getSuppliers(),
  ])

  const boundAction = updateIngredient.bind(null, id)

  return (
    <div className="p-6">
      <PageHeader
        title={`Edit: ${ingredient.name}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory', href: '/dashboard/inventory' },
          { label: ingredient.name, href: `/dashboard/inventory/${id}` },
          { label: 'Edit' },
        ]}
      />
      <IngredientForm
        action={boundAction}
        ingredient={ingredient}
        categories={categories}
        suppliers={suppliers}
        cancelHref={`/dashboard/inventory/${id}`}
      />
    </div>
  )
}
