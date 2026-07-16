import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { convertQRIS } from '@/lib/qris/converter'

/**
 * Generates a dynamic QRIS QR code (as PNG) for a specific payment amount.
 *
 * SECURITY: QRIS_STATIC_STRING is server-only (no NEXT_PUBLIC_ prefix) —
 * never expose the raw merchant QRIS string to the browser.
 *
 * Usage: GET /api/qris?amount=45000
 */
export async function GET(req: NextRequest) {
  const amountParam = req.nextUrl.searchParams.get('amount')
  const amount = Number(amountParam)

  if (!amountParam || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Parameter amount tidak valid' }, { status: 400 })
  }

  // QRIS amount field should be a whole number (no decimals) per EMVCo spec
  const wholeAmount = Math.round(amount)

  const staticQris = process.env.QRIS_STATIC_STRING
  if (!staticQris) {
    return NextResponse.json(
      { error: 'QRIS_STATIC_STRING belum dikonfigurasi di server' },
      { status: 500 }
    )
  }

  let dynamicQris: string
  try {
    dynamicQris = convertQRIS(staticQris, { amount: wholeAmount })
  } catch {
    return NextResponse.json({ error: 'Gagal memproses QRIS' }, { status: 500 })
  }

  try {
    const pngBuffer = await QRCode.toBuffer(dynamicQris, {
      type: 'png',
      width: 512,
      margin: 1,
      errorCorrectionLevel: 'M',
    })

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        'Content-Type': 'image/png',
        // Don't cache — amount changes per order
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Gagal membuat gambar QR' }, { status: 500 })
  }
}
