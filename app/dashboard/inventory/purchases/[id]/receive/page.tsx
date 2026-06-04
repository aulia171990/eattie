import { getPurchase, receivePurchase } from '@/actions/stock-purchases'
import { PageHeader } from '@/components/shared/page-header'
import { ReceiveStockForm } from '@/components/forms/receive-stock-form'
import { notFound } from 'next/navigation'

export default async function ReceiveStockPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let po
  try {
    po = await getPurchase(id)
  } catch {
    notFound()
  }

  if (po.status !== 'ordered') notFound()

  const boundAction = receivePurchase.bind(null, id)

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader
        title="Terima Stok"
        description={`PO: ${po.purchase_number}`}
        breadcrumbs={[
          { label: 'Inventory', href: '/dashboard/inventory' },
          { label: 'Pembelian', href: '/dashboard/inventory/purchases' },
          { label: po.purchase_number, href: `/dashboard/inventory/purchases/${id}` },
          { label: 'Terima' },
        ]}
      />
      <ReceiveStockForm
        action={boundAction}
        items={po.stock_purchase_items}
        cancelHref={`/dashboard/inventory/purchases/${id}`}
      />
    </div>
  )
}
