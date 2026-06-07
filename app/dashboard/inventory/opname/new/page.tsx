import { createOpname } from '@/actions/stock-opname'

async function createOpnameFromForm(formData: FormData) {
  'use server'

  await createOpname(null, formData)
}
import { PageHeader } from '@/components/shared/page-header'

export default function NewOpnamePage() {
  return (
    <div className="p-6 max-w-lg">
      <PageHeader title="Buat Stock Opname" breadcrumbs={[{ label: 'Inventory', href: '/dashboard/inventory' }, { label: 'Opname', href: '/dashboard/inventory/opname' }, { label: 'Buat' }]} />
      <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'hsl(36, 20%, 88%)' }}>
        <p className="text-sm mb-4" style={{ color: 'hsl(25, 15%, 50%)' }}>Sistem akan membuat sesi opname baru dengan semua bahan baku aktif.</p>
        <form action={createOpnameFromForm}>
          <button type="submit" className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white" style={{ background: 'hsl(32, 95%, 44%)' }}>Mulai Stock Opname</button>
        </form>
      </div>
    </div>
  )
}
