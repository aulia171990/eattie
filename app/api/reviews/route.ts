import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { product_id, order_id, customer_name, customer_phone, rating, comment } = body

    if (!product_id || !order_id || !customer_name || !customer_phone || !rating) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating harus 1-5' }, { status: 400 })
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

    if (!['COMPLETED', 'completed'].includes(order.status)) {
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
