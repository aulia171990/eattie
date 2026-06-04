import Link from 'next/link'
import { getSuppliers } from '@/actions/suppliers'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Plus, Phone, Mail, User } from 'lucide-react'

export default async function SuppliersPage() {
  const suppliers = await getSuppliers()

  return (
    <div className="p-6">
      <PageHeader
        title="Supplier"
        description="Kelola daftar pemasok bahan baku"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Inventory', href: '/dashboard/inventory' }, { label: 'Supplier' }]}
        action={
          <Link href="/dashboard/inventory/suppliers/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'hsl(32, 95%, 44%)' }}>
            <Plus size={16} /> Tambah Supplier
          </Link>
        }
      />
      {suppliers.length === 0 ? (
        <EmptyState icon="🏪" title="Belum ada supplier" actionLabel="Tambah Supplier" actionHref="/dashboard/inventory/suppliers/new" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map(s => (
            <div key={s.id} className="bg-white rounded-xl border p-5 hover:shadow-sm transition-all" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: 'hsl(25, 30%, 15%)' }}>{s.name}</h3>
                  {!s.is_active && <span className="text-xs" style={{ color: 'hsl(0, 70%, 50%)' }}>Tidak Aktif</span>}
                </div>
                <Link href={`/dashboard/inventory/suppliers/${s.id}/edit`}
                  className="text-xs px-2 py-1 rounded-md hover:bg-gray-100"
                  style={{ color: 'hsl(32, 95%, 44%)' }}>Edit</Link>
              </div>
              <div className="space-y-1.5">
                {s.contact_person && <div className="flex items-center gap-2 text-xs" style={{ color: 'hsl(25, 15%, 50%)' }}><User size={12} />{s.contact_person}</div>}
                {s.phone && <div className="flex items-center gap-2 text-xs" style={{ color: 'hsl(25, 15%, 50%)' }}><Phone size={12} />{s.phone}</div>}
                {s.email && <div className="flex items-center gap-2 text-xs" style={{ color: 'hsl(25, 15%, 50%)' }}><Mail size={12} />{s.email}</div>}
              </div>
              {s.notes && <p className="text-xs mt-3 pt-3 border-t" style={{ borderColor: 'hsl(36, 20%, 92%)', color: 'hsl(25, 15%, 55%)' }}>{s.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
