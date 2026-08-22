import { getProducts, getAllProductVariants } from '@/actions/products'
import { getIngredients } from '@/actions/ingredients'
import { upsertRecipe, getRecipe } from '@/actions/recipes'
import { RecipeForm } from '@/components/forms/recipe-form'
import { PageHeader } from '@/components/shared/page-header'

interface SearchParams {
  duplicate?: string
  variant?: string
}

export default async function NewRecipePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams

  const [products, variants, ingredients] = await Promise.all([
    getProducts(true),
    getAllProductVariants(),
    getIngredients({ isActive: true }),
  ])

  const ingOptions = ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    base_unit: i.base_unit,
    price_per_unit: i.price_per_unit,
  }))

  // Load source recipe for duplication (prefill only — submitted as a NEW recipe)
  let duplicateFrom
  if (sp.duplicate) {
    try {
      duplicateFrom = await getRecipe(sp.duplicate)
    } catch {
      duplicateFrom = undefined
    }
  }

  return (
    <div className="p-6">
      <PageHeader
        title={duplicateFrom ? 'Duplikat Resep' : 'Tambah Resep'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Resep', href: '/dashboard/recipes' },
          { label: duplicateFrom ? 'Duplikat' : 'Tambah' },
        ]}
      />
      <RecipeForm
        action={upsertRecipe}
        products={products}
        variants={variants}
        ingredients={ingOptions}
        duplicateFrom={duplicateFrom}
        defaultVariantId={sp.variant}
        cancelHref="/dashboard/recipes"
      />
    </div>
  )
}
