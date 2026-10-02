import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createRateLimiter, getClientKey } from '@/lib/rate-limit'

// Rate limit: 5 reviews per 10 minutes per IP
const reviewRateLimit = createRateLimiter({ windowMs: 10 * 60_000, max: 5 })

const PHONE_REGEX = /^(\+62|62|0)8[1-9][0-9]{6,11}$/

export async function POST(req: NextRequest) {
  // Rate limit check
  const clientKey = getClientKey(req)
  const rateResult = reviewRateLimit(clientKey)
  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: 'Terlalu banyak ulasan. Coba lagi nanti.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)) } }
    )
  }

  try {
    const body = await req.json()
    const { product_id, order_id, customer_name, customer_phone, rating, comment } = body

    // Input validation
    if (!product_id || !order_id || !customer_name || !customer_phone || !rating) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    if (typeof product_id !== 'string' || product_id.length > 64) {
      return NextResponse.json({ error: 'product_id tidak valid' }, { status: 400 })
    }
    if (typeof order_id !== 'string' || order_id.length > 64) {
      return NextResponse.json({ error: 'order_id tidak valid' }, { status: 400 })
    }
    if (typeof customer_name !== 'string' || customer_name.length < 1 || customer_name.length > 100) {
      return NextResponse.json({ error: 'Nama tidak valid' }, { status: 400 })
    }
    if (typeof customer_phone !== 'string' || !PHONE_REGEX.test(customer_phone)) {
      return NextResponse.json({ error: 'Format nomor telepon tidak valid' }, { status: 400 })
    }
    if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating harus 1-5' }, { status: 400 })
    }
    if (comment !== undefined && comment !== null && (typeof comment !== 'string' || comment.length > 1000)) {
      return NextResponse.json({ error: 'Komentar terlalu panjang (maks 1000 karakter)' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify order exists, is COMPLETED, and phone matches
    const { data: order } = await supabase
      .from('orders')
      .select('id, status, customer_phone')
      .eq('id', order_id)
      .eq('customer_phone', customer_phone)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 })
    }

    // orders.status is schema-nullable (no NULL rows currently in DB); guard with ?? '' for .includes()
    if (!['COMPLETED', 'completed'].includes(order.status ?? '')) {
      return NextResponse.json({ error: 'Ulasan hanya bisa diberikan untuk order yang sudah selesai' }, { status: 403 })
    }

    // Verify product was in this order
    const { data: orderItem } = await supabase
      .from('order_items')
      .select('id')
      .eq('order_id', order_id)
      .eq('product_id', product_id)
      .maybeSingle()

    if (!orderItem) {
      return NextResponse.json({ error: 'Produk tidak ada dalam order ini' }, { status: 400 })
    }

    // Insert review (upsert to prevent duplicates)
    const { error } = await supabase
      .from('product_reviews')
      .insert({
        product_id,
        order_id,
        customer_name,
        customer_phone,
        rating,
        comment: comment || null,
      })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Anda sudah memberikan ulasan untuk produk ini' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
