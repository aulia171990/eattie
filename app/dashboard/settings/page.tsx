import { PageHeader } from '@/components/shared/page-header'
import Link from 'next/link'

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-2xl">
      <PageHeader title="Pengaturan" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Pengaturan' }]} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { href: '/dashboard/settings/store', icon: '🏪', title: 'Pengaturan Toko', desc: 'Nama toko, logo, tema warna, dan kontak' },
          { href: '/dashboard/settings/profile', icon: '👤', title: 'Profil Saya', desc: 'Ubah nama, foto, dan password' },
          { href: '/dashboard/settings/users', icon: '👥', title: 'Manajemen Pengguna', desc: 'Kelola akun kasir dan baker' },
        ].map(item => (
          <Link key={item.href} href={item.href} className="bg-white rounded-xl border p-5 hover:shadow-sm transition-all" style={{ borderColor: 'hsl(var(--border))' }}>
            <div className="text-3xl mb-3">{item.icon}</div>
            <h3 className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>{item.title}</h3>
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-muted))' }}>{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
