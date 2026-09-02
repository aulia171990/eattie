import { getOrdersFlat } from '@/actions/orders'
import { PageHeader } from '@/components/shared/page-header'
import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { OrdersKanban } from '@/components/orders/orders-kanban'

export default async function OrdersPage() {
  const orders = await getOrdersFlat()

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <PageHeader
        title="Pesanan Online"
        description="Order masuk dari portal customer"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Pesanan Online' },
        ]}
        action={
          <Link href="/store" target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-gray-50"
            style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-secondary))' }}>
            <ShoppingBag size={14} />
            Buka Portal
          </Link>
        }
      />
      <OrdersKanban orders={orders} />
    </div>
  )
}
