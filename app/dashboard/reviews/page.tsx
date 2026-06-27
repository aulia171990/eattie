import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { formatDateTime } from '@/lib/utils'
import { Star } from 'lucide-react'

async function getReviews() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('product_reviews')
    .select('*, products(name)')
    .order('created_at', { ascending: false })
    .limit(100)
  return data ?? []
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={12}
          fill={s <= rating ? 'hsl(36, 90%, 50%)' : 'none'}
          style={{ color: s <= rating ? 'hsl(36, 90%, 50%)' : 'hsl(36, 20%, 80%)' }} />
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
        style={{ borderColor: 'hsl(36, 20%, 90%)' }}>
        <div className="text-center space-y-1">
          <p className="text-4xl font-bold" style={{ color: 'hsl(25, 30%, 12%)' }}>
            {avgRating.toFixed(1)}
          </p>
          <div className="flex justify-center">
            <StarRating rating={Math.round(avgRating)} />
          </div>
          <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>
            {reviews.length} ulasan
          </p>
        </div>
        <div className="flex-1 min-w-40 space-y-1.5">
          {byStar.map(({ star, count, pct }) => (
            <div key={star} className="flex items-center gap-2">
              <span className="text-xs w-4 text-right" style={{ color: 'hsl(25, 15%, 50%)' }}>{star}</span>
              <Star size={10} fill="hsl(36, 90%, 50%)" style={{ color: 'hsl(36, 90%, 50%)' }} />
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(36, 20%, 93%)' }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'hsl(36, 90%, 50%)' }} />
              </div>
              <span className="text-xs w-6" style={{ color: 'hsl(25, 15%, 55%)' }}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <p className="text-3xl">💬</p>
          <p className="text-sm font-medium" style={{ color: 'hsl(25, 30%, 25%)' }}>Belum ada ulasan</p>
          <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>
            Ulasan akan muncul setelah customer mengisi form di halaman lacak pesanan.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border p-4 space-y-2"
              style={{ borderColor: 'hsl(36, 20%, 90%)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: 'hsl(32, 80%, 90%)', color: 'hsl(32, 95%, 35%)' }}>
                    {r.customer_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'hsl(25, 30%, 15%)' }}>
                      {r.customer_name}
                    </p>
                    <p className="text-xs" style={{ color: 'hsl(25, 15%, 55%)' }}>
                      {r.customer_phone}
                    </p>
                  </div>
                </div>
                <p className="text-xs" style={{ color: 'hsl(25, 15%, 60%)' }}>
                  {formatDateTime(r.created_at)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <StarRating rating={r.rating} />
                <span className="text-xs font-medium" style={{ color: 'hsl(32, 90%, 40%)' }}>
                  {(r as { products?: { name: string } }).products?.name}
                </span>
              </div>

              {r.comment && (
                <p className="text-sm leading-relaxed" style={{ color: 'hsl(25, 20%, 35%)' }}>
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
