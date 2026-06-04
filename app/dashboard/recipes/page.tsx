import Link from 'next/link'
import { getRecipes } from '@/actions/recipes'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { formatCurrency } from '@/lib/utils'
import { PRODUCT_CATEGORIES } from '@/lib/constants'
import { Plus, Clock, ChefHat, Thermometer } from 'lucide-react'

export default async function RecipesPage() {
  const recipes = await getRecipes()

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
            style={{ background: 'hsl(32, 95%, 44%)' }}
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
              return sum + ri.quantity * (ri.ingredients?.price_per_unit ?? 0)
            }, 0)
            const costPerUnit =
              recipe.yield_quantity > 0 ? calcCost / recipe.yield_quantity : 0

            return (
              <div
                key={recipe.id}
                className="bg-white rounded-xl border p-5 hover:shadow-sm transition-all"
                style={{ borderColor: 'hsl(36, 20%, 88%)' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: 'hsl(36, 80%, 93%)' }}
                    >
                      {emoji}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: 'hsl(25, 30%, 15%)' }}>
                        {product?.name ?? 'Produk'}
                      </h3>
                      <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>
                        Hasil: {recipe.yield_quantity} pcs
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/recipes/${recipe.id}/edit`}
                    className="text-xs px-2 py-1 rounded-md hover:bg-gray-100"
                    style={{ color: 'hsl(32, 95%, 44%)' }}
                  >
                    Edit
                  </Link>
                </div>

                {/* Timing info */}
                <div className="flex gap-4 mb-4">
                  {recipe.prep_time_minutes != null && (
                    <div className="flex items-center gap-1 text-xs" style={{ color: 'hsl(25, 15%, 50%)' }}>
                      <Clock size={12} /> {recipe.prep_time_minutes} min prep
                    </div>
                  )}
                  {recipe.bake_time_minutes != null && (
                    <div className="flex items-center gap-1 text-xs" style={{ color: 'hsl(25, 15%, 50%)' }}>
                      <ChefHat size={12} /> {recipe.bake_time_minutes} min bake
                    </div>
                  )}
                  {recipe.bake_temperature != null && (
                    <div className="flex items-center gap-1 text-xs" style={{ color: 'hsl(25, 15%, 50%)' }}>
                      <Thermometer size={12} /> {recipe.bake_temperature}°C
                    </div>
                  )}
                </div>

                {/* Ingredients list */}
                <div
                  className="border rounded-lg overflow-hidden mb-4"
                  style={{ borderColor: 'hsl(36, 20%, 92%)' }}
                >
                  <div
                    className="px-3 py-2 text-xs font-semibold"
                    style={{
                      background: 'hsl(36, 20%, 97%)',
                      color: 'hsl(25, 15%, 45%)',
                    }}
                  >
                    Bahan ({recipe.recipe_ingredients.length})
                  </div>
                  <div className="divide-y" style={{ borderColor: 'hsl(36, 20%, 94%)' }}>
                    {recipe.recipe_ingredients.slice(0, 4).map((ri) => (
                      <div
                        key={ri.id}
                        className="flex items-center justify-between px-3 py-1.5"
                      >
                        <span className="text-xs" style={{ color: 'hsl(25, 30%, 20%)' }}>
                          {ri.ingredients?.name ?? '—'}
                        </span>
                        <span className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>
                          {ri.quantity} {ri.unit}
                        </span>
                      </div>
                    ))}
                    {recipe.recipe_ingredients.length > 4 && (
                      <div className="px-3 py-1.5 text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>
                        +{recipe.recipe_ingredients.length - 4} bahan lainnya
                      </div>
                    )}
                  </div>
                </div>

                {/* Cost & margin */}
                <div
                  className="flex items-center justify-between pt-3 border-t"
                  style={{ borderColor: 'hsl(36, 20%, 92%)' }}
                >
                  <div>
                    <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>HPP per pcs</p>
                    <p className="text-sm font-bold" style={{ color: 'hsl(25, 30%, 15%)' }}>
                      {formatCurrency(costPerUnit)}
                    </p>
                  </div>
                  {product?.selling_price != null && costPerUnit > 0 && (
                    <div className="text-right">
                      <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>Margin</p>
                      <p className="text-sm font-bold" style={{ color: 'hsl(142, 60%, 35%)' }}>
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
