import { createProduct } from '@/actions/products'
import { ProductForm } from '@/components/forms/product-form'
import { PageHeader } from '@/components/shared/page-header'

export default function NewProductPage() {
  return (
    <div className="p-6">
      <PageHeader title="Tambah Produk" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Produk', href: '/dashboard/products' }, { label: 'Tambah' }]} />
      <ProductForm action={createProduct} cancelHref="/dashboard/products" />
    </div>
  )
}
