import { getBestsellerProducts, getStoreProducts, getFeaturedReviews } from '@/actions/store'
import { StoreLanding } from '@/components/store/store-landing'

export const revalidate = 60 // revalidate every 60s

export default async function StorePage() {
  const [bestsellers, allProducts, reviews] = await Promise.all([
    getBestsellerProducts(6),
    getStoreProducts(),
    getFeaturedReviews(3),
  ])

  return (
    <StoreLanding
      bestsellers={bestsellers}
      allProducts={allProducts}
      reviews={reviews}
    />
  )
}
