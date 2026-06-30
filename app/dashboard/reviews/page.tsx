import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { formatDateTime } from '@/lib/utils'
import { Star } from 'lucide-react'

async function getReviews() {
  const supabase = await createClient()
  const { data: reviews } = await supabase
    .from('product_reviews')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (!reviews || reviews.length === 0) return []

  // Fetch product names separately to avoid FK type issues
  const productIds = [...new Set(reviews.map(r => r.product_id))]
  const { data: products } = await supabase
    .from('products')
    .select('id, name')
    .in('id', productIds)

  const productMap = Object.fromEntries((products ?? []).map(p => [p.id, p.name]))

  return reviews.map(r => ({ ...r, product_name: productMap[r.product_id] ?? 'Produk' }))
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={12}
          fill={s <= rating ? 'hsl(var(--primary))' : 'none'}
          style={{ color: s <= rating ? 'hsl(var(--primary))' : 'hsl(36, 20%, 80%)' }} />
      ))}
    </div>
  )
}

export default async function ReviewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'owner') redirect('/dashboard')

  const reviews = await getReviews()

  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0

  const byStar = [5,4,3,2,1].map(s => ({
    star: s,
    count: reviews.filter(r => r.rating === s).length,
    pct: reviews.length > 0
      ? Math.round((reviews.filter(r => r.rating === s).length / reviews.length) * 100)
      : 0,
  }))

  return (
    <div className="p-4 lg:p-6 max-w-3xl space-y-5">
      <PageHeader
        title="Ulasan Pelanggan"
        description="Feedback dari customer yang sudah order"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Ulasan' },
        ]}
      />

      {/* Summary */}
      <div className="bg-white rounded-2xl border p-5 flex gap-6 flex-wrap"
        style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="text-center space-y-1">
          <p className="text-4xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
            {avgRating.toFixed(1)}
          </p>
          <div className="flex justify-center">
            <StarRating rating={Math.round(avgRating)} />
          </div>
          <p className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
            {reviews.length} ulasan
          </p>
        </div>
        <div className="flex-1 min-w-40 space-y-1.5">
          {byStar.map(({ star, count, pct }) => (
            <div key={star} className="flex items-center gap-2">
              <span className="text-xs w-4 text-right" style={{ color: 'hsl(var(--text-muted))' }}>{star}</span>
              <Star size={10} fill="hsl(36, 90%, 50%)" style={{ color: 'hsl(var(--primary))' }} />
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(var(--border))' }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'hsl(var(--primary))' }} />
              </div>
              <span className="text-xs w-6" style={{ color: 'hsl(var(--text-muted))' }}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <p className="text-3xl">💬</p>
          <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>Belum ada ulasan</p>
          <p className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
            Ulasan akan muncul setelah customer mengisi form di halaman lacak pesanan.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border p-4 space-y-2"
              style={{ borderColor: 'hsl(var(--border))' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: 'hsl(var(--primary-subtle))', color: 'hsl(var(--primary))' }}>
                    {r.customer_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                      {r.customer_name}
                    </p>
                    <p className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
                      {r.customer_phone}
                    </p>
                  </div>
                </div>
                <p className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
                  {formatDateTime(r.created_at)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <StarRating rating={r.rating} />
                <span className="text-xs font-medium" style={{ color: 'hsl(var(--primary))' }}>
                  {(r as { product_name?: string }).product_name}
                </span>
              </div>

              {r.comment && (
                <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--text-secondary))' }}>
                  {r.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
