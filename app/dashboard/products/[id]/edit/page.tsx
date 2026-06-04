import { getProduct, updateProduct } from '@/actions/products'
import { ProductForm } from '@/components/forms/product-form'
import { PageHeader } from '@/components/shared/page-header'
import { notFound } from 'next/navigation'

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let product
  try { product = await getProduct(id) }
  catch { notFound() }

  const boundAction = updateProduct.bind(null, id)
  return (
    <div className="p-6">
      <PageHeader title={`Edit: ${product.name}`} breadcrumbs={[{ label: 'Produk', href: '/dashboard/products' }, { label: 'Edit' }]} />
      <ProductForm action={boundAction} product={product} cancelHref="/dashboard/products" />
    </div>
  )
}
