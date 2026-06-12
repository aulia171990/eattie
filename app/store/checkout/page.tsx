import StoreCheckout from '@/components/store/store-checkout'
import { Suspense } from 'react'

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm" style={{ color: 'hsl(25,15%,55%)' }}>Memuat...</div>}>
      <StoreCheckout />
    </Suspense>
  )
}
