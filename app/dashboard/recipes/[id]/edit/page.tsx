import { getRecipe } from '@/actions/recipes'
import { getProducts } from '@/actions/products'
import { getIngredients } from '@/actions/ingredients'
import { upsertRecipe } from '@/actions/recipes'
import { RecipeForm } from '@/components/forms/recipe-form'
import { PageHeader } from '@/components/shared/page-header'
import { notFound } from 'next/navigation'

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let recipe
  try {
    recipe = await getRecipe(id)
  } catch {
    notFound()
  }

  const [products, ingredients] = await Promise.all([
    getProducts(true),
    getIngredients({ isActive: true }),
  ])

  const ingOptions = ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    base_unit: i.base_unit,
    price_per_unit: i.price_per_unit,
  }))

  return (
    <div className="p-6">
      <PageHeader
        title={`Edit Resep: ${recipe.products?.name ?? ''}`}
        breadcrumbs={[
          { label: 'Resep', href: '/dashboard/recipes' },
          { label: 'Edit' },
        ]}
      />
      <RecipeForm
        action={upsertRecipe}
        products={products}
        ingredients={ingOptions}
        recipe={recipe}
        cancelHref="/dashboard/recipes"
      />
    </div>
  )
}
