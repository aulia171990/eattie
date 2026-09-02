import Link from 'next/link'
import { getRecipes } from '@/actions/recipes'
import { getAllProductVariants } from '@/actions/products'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { DuplicateRecipeButton } from '@/components/recipes/duplicate-recipe-button'
import { formatCurrency } from '@/lib/utils'
import { PRODUCT_CATEGORIES } from '@/lib/constants'
import { Plus, Clock, ChefHat, Thermometer } from 'lucide-react'

export default async function RecipesPage() {
  const [recipes, allVariants] = await Promise.all([
    getRecipes(),
    getAllProductVariants(),
  ])

  // Map of variant_ids that already have a recipe
  const recipeVariantIds = new Set(
    recipes
      .map((r) => r.variant_id)
      .filter((v): v is string => Boolean(v))
  )
  // Product ids that already have a generic (variant_id NULL) recipe
  const genericProductIds = new Set(
    recipes.filter((r) => !r.variant_id).map((r) => r.product_id)
  )

  // For each recipe, compute the list of variants of its product that don't have a recipe yet
  const availableVariantsForRecipe = (productId: string | null | undefined) => {
    if (!productId) return []
    // If a generic recipe already exists for this product, no variant slot is "open"
    if (genericProductIds.has(productId)) return []
    return allVariants
      .filter((v) => v.product_id === productId && !recipeVariantIds.has(v.id))
      .map((v) => ({ id: v.id, name: v.name }))
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Resep"
        description="Database resep dengan kalkulasi bahan dan biaya"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Resep' },
        ]}
        action={
          <Link
            href="/dashboard/recipes/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'hsl(var(--primary))' }}
          >
            <Plus size={16} /> Tambah Resep
          </Link>
        }
      />

      {recipes.length === 0 ? (
        <EmptyState
          icon="📖"
          title="Belum ada resep"
          description="Buat resep pertama untuk menghitung HPP produk secara otomatis"
          actionLabel="Tambah Resep"
          actionHref="/dashboard/recipes/new"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {recipes.map((recipe) => {
            const product = recipe.products
            const emoji =
              PRODUCT_CATEGORIES.find((c) => c.value === product?.category)?.emoji ?? '🥐'

            const calcCost = recipe.recipe_ingredients.reduce((sum, ri) => {
              // recipe_ingredients.quantity/unit are already in the ingredient's
              // base_unit (normalised on save), so price_per_unit (per base_unit)
              // multiplies directly — no extra conversion needed here.
              return sum + (ri.quantity ?? 0) * (ri.ingredients?.price_per_unit ?? 0)
            }, 0)
            const costPerUnit =
              (recipe.yield_quantity ?? 0) > 0 ? calcCost / (recipe.yield_quantity ?? 1) : 0

            return (
              <div
                key={recipe.id}
                className="bg-white rounded-xl border p-5 hover:shadow-sm transition-all"
                style={{ borderColor: 'hsl(var(--border))' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: 'hsl(var(--primary-subtle))' }}
                    >
                      {emoji}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>
                        {product?.name ?? 'Produk'}
                        {recipe.variants?.name && (
                          <span
                            className="inline-block ml-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium align-middle"
                            style={{
                              background: 'hsl(var(--primary-subtle))',
                              color: 'hsl(var(--primary-hover))',
                            }}
                          >
                            {recipe.variants.name}
                          </span>
                        )}
                      </h3>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
                        Hasil: {recipe.yield_quantity} pcs
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/recipes/${recipe.id}/edit`}
                    className="text-xs px-2 py-1 rounded-md hover:bg-gray-100"
                    style={{ color: 'hsl(var(--primary))' }}
                  >
                    Edit
                  </Link>
                  <DuplicateRecipeButton
                    sourceRecipeId={recipe.id}
                    sourceProductName={product?.name ?? 'Produk'}
                    availableVariants={availableVariantsForRecipe(product?.id)}
                  />
                </div>

                {/* Timing info */}
                <div className="flex gap-4 mb-4">
                  {recipe.prep_time_minutes != null && (
                    <div className="flex items-center gap-1 text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
                      <Clock size={12} /> {recipe.prep_time_minutes} min prep
                    </div>
                  )}
                  {recipe.bake_time_minutes != null && (
                    <div className="flex items-center gap-1 text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
                      <ChefHat size={12} /> {recipe.bake_time_minutes} min bake
                    </div>
                  )}
                  {recipe.bake_temperature != null && (
                    <div className="flex items-center gap-1 text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
                      <Thermometer size={12} /> {recipe.bake_temperature}°C
                    </div>
                  )}
                </div>

                {/* Ingredients list */}
                <div
                  className="border rounded-lg overflow-hidden mb-4"
                  style={{ borderColor: 'hsl(var(--border))' }}
                >
                  <div
                    className="px-3 py-2 text-xs font-semibold"
                    style={{
                      background: 'hsl(var(--surface-raised))',
                      color: 'hsl(var(--text-muted))',
                    }}
                  >
                    Bahan ({recipe.recipe_ingredients.length})
                  </div>
                  <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                    {recipe.recipe_ingredients.slice(0, 4).map((ri) => (
                      <div
                        key={ri.id}
                        className="flex items-center justify-between px-3 py-1.5"
                      >
                        <span className="text-xs" style={{ color: 'hsl(var(--text-secondary))' }}>
                          {ri.ingredients?.name ?? '—'}
                        </span>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
                          {ri.quantity} {ri.unit}
                        </span>
                      </div>
                    ))}
                    {recipe.recipe_ingredients.length > 4 && (
                      <div className="px-3 py-1.5 text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
                        +{recipe.recipe_ingredients.length - 4} bahan lainnya
                      </div>
                    )}
                  </div>
                </div>

                {/* Cost & margin */}
                <div
                  className="flex items-center justify-between pt-3 border-t"
                  style={{ borderColor: 'hsl(var(--border))' }}
                >
                  <div>
                    <p className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>HPP per pcs</p>
                    <p className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                      {formatCurrency(costPerUnit)}
                    </p>
                  </div>
                  {product?.selling_price != null && costPerUnit > 0 && (
                    <div className="text-right">
                      <p className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>Margin</p>
                      <p className="text-sm font-bold" style={{ color: 'hsl(var(--success))' }}>
                        {(
                          ((product.selling_price - costPerUnit) / product.selling_price) *
                          100
                        ).toFixed(0)}
                        %
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
