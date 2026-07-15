'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Toggle the is_featured flag on a product review. Called from a native
 * <form action>, so the signature is (formData). The dashboard page already
 * gates by role; we re-check auth here as defense in depth.
 */
export async function toggleReviewFeatured(formData: FormData): Promise<void> {
  const id = formData.get('id') as string
  const featured = formData.get('featured') === 'true'
  if (!id) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('product_reviews')
    .update({ is_featured: featured })
    .eq('id', id)

  revalidatePath('/dashboard/reviews')
  revalidatePath('/store')
}
