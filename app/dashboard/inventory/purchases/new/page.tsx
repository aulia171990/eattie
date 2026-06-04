import { getSuppliers } from '@/actions/suppliers'
import { getIngredients } from '@/actions/ingredients'
import { createPurchase } from '@/actions/stock-purchases'
import { PageHeader } from '@/components/shared/page-header'
import { PurchaseForm } from '@/components/forms/purchase-form'

export default async function NewPurchasePage() {
  const [suppliers, ingredients] = await Promise.all([
    getSuppliers(true),
    getIngredients({ isActive: true }),
  ])

  const ingOptions = ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    base_unit: i.base_unit,
    price_per_unit: i.price_per_unit,
    code: i.code,
  }))

  return (
    <div className="p-6">
      <PageHeader
        title="Buat Purchase Order"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory', href: '/dashboard/inventory' },
          { label: 'Pembelian', href: '/dashboard/inventory/purchases' },
          { label: 'Buat PO' },
        ]}
      />
      <PurchaseForm
        action={createPurchase}
        suppliers={suppliers}
        ingredients={ingOptions}
        cancelHref="/dashboard/inventory/purchases"
      />
    </div>
  )
}
