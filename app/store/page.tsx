import { getBestsellerProducts, getStoreProducts } from '@/actions/store'
import { StoreLanding } from '@/components/store/store-landing'

export const revalidate = 60 // revalidate every 60s

export default async function StorePage() {
  const [bestsellers, allProducts] = await Promise.all([
    getBestsellerProducts(6),
    getStoreProducts(),
  ])

  return <StoreLanding bestsellers={bestsellers} allProducts={allProducts} />
}
