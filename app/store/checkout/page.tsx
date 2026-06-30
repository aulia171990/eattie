import StoreCheckout from '@/components/store/store-checkout'
import { Suspense } from 'react'

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm" style={{ color: 'hsl(var(--text-muted))' }}>Memuat...</div>}>
      <StoreCheckout />
    </Suspense>
  )
}
