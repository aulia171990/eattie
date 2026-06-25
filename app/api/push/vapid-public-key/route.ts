import { NextResponse } from 'next/server'
import { getVapidPublicKey } from '@/lib/push/vapid'

export async function GET() {
  const publicKey = getVapidPublicKey()
  if (!publicKey) {
    return NextResponse.json({ error: 'Push notifications not configured' }, { status: 503 })
  }
  return NextResponse.json({ publicKey })
}
