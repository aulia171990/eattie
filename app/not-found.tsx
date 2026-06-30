export default function NotFound() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-2xl font-semibold text-foreground">Halaman tidak ditemukan</h1>
        <p className="text-sm text-muted-foreground">
          Halaman yang Anda cari tidak tersedia atau sudah dipindahkan.
        </p>
        <a
          href="/dashboard"
          className="inline-flex rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ background: 'hsl(var(--primary))' }}
        >
          Kembali ke Dashboard
        </a>
      </div>
    </main>
  )
}
