import { getProducts } from '@/actions/products'
import { getIngredients } from '@/actions/ingredients'
import { upsertRecipe } from '@/actions/recipes'
import { RecipeForm } from '@/components/forms/recipe-form'
import { PageHeader } from '@/components/shared/page-header'

export default async function NewRecipePage() {
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
        title="Tambah Resep"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Resep', href: '/dashboard/recipes' },
          { label: 'Tambah' },
        ]}
      />
      <RecipeForm
        action={upsertRecipe}
        products={products}
        ingredients={ingOptions}
        cancelHref="/dashboard/recipes"
      />
    </div>
  )
}
