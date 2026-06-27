import Link from 'next/link'

export function StoreFooter() {
  return (
    <footer style={{ background: 'hsl(25, 30%, 10%)', color: 'hsl(36, 15%, 65%)' }}>
      <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '2.5rem 1rem 1.5rem' }}>

        {/* Top grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pb-6 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}>

          {/* Brand */}
          <div className="col-span-2 lg:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                style={{ background: 'hsl(32, 90%, 44%)' }}>
                🍞
              </div>
              <span style={{
                fontFamily: '"Playfair Display", serif',
                fontWeight: 700,
                fontSize: '1.05rem',
                color: 'white',
              }}>
                Eattie
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', lineHeight: 1.7 }}>
              Roti & kue segar buatan tangan.<br />
              Dipesan, dibuat, diantar dengan cinta.
            </p>
          </div>

          {/* Produk */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: 'hsl(36, 30%, 70%)' }}>Produk</p>
            {['Semua Katalog', 'Paling Laris', 'Kue Custom', 'Hampers'].map(l => (
              <Link key={l} href="/store#katalog"
                className="block text-xs mb-2 hover:opacity-80 transition-opacity"
                style={{ color: 'hsl(36, 15%, 60%)', textDecoration: 'none' }}>
                {l}
              </Link>
            ))}
          </div>

          {/* Layanan */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: 'hsl(36, 30%, 70%)' }}>Layanan</p>
            {[
              { label: 'Lacak Pesanan', href: '/store/track' },
              { label: 'Cara Pesan', href: '/store' },
              { label: 'Hubungi Kami', href: '/store' },
            ].map(({ label, href }) => (
              <Link key={label} href={href}
                className="block text-xs mb-2 hover:opacity-80 transition-opacity"
                style={{ color: 'hsl(36, 15%, 60%)', textDecoration: 'none' }}>
                {label}
              </Link>
            ))}
          </div>

          {/* Pembayaran */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: 'hsl(36, 30%, 70%)' }}>Metode Bayar</p>
            <div className="space-y-1.5">
              {[
                { icon: '💳', label: 'QRIS' },
                { icon: '🏦', label: 'Transfer Bank' },
                { icon: '💰', label: 'Bayar di Toko' },
              ].map(p => (
                <div key={p.label} className="flex items-center gap-2 text-xs"
                  style={{ color: 'hsl(36, 15%, 60%)' }}>
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4">
          <p style={{ fontSize: '0.7rem', color: 'hsl(36, 10%, 45%)' }}>
            © {new Date().getFullYear()} Eattie Bakery. Semua hak dilindungi.
          </p>
          <div className="flex items-center gap-3">
            {['Instagram', 'WhatsApp'].map(s => (
              <a key={s} href="#"
                className="text-xs hover:opacity-80 transition-opacity"
                style={{ color: 'hsl(36, 15%, 50%)', textDecoration: 'none' }}>
                {s}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
