import { createAdminClient } from '@/lib/supabase/admin'
import { configureWebPush, webpush } from '@/lib/push/vapid'
import { formatCurrency } from '@/lib/utils'

export interface NewOrderPushPayload {
  orderId: string
  orderNumber: string
  customerName: string
  totalAmount: number
}

interface PushSubscriptionRow {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

/**
 * Sends Web Push notifications to all subscribed owner devices.
 * Safe to call fire-and-forget — errors are logged, never thrown to callers.
 */
export async function sendNewOrderPushNotification(payload: NewOrderPushPayload): Promise<void> {
  if (!configureWebPush()) {
    console.warn('[push] VAPID keys not configured — skipping push notification')
    return
  }

  try {
    const admin = createAdminClient()

    const { data: owners, error: ownersError } = await admin
      .from('profiles')
      .select('id')
      .eq('role', 'owner')
      .eq('is_active', true)

    if (ownersError || !owners?.length) return

    const ownerIds = owners.map(o => o.id)

    const { data: subscriptions, error: subsError } = await admin
      .from('push_subscriptions')
      .select('id,endpoint,p256dh,auth')
      .in('user_id', ownerIds)

    if (subsError || !subscriptions?.length) return

    const body = `${payload.customerName} · ${formatCurrency(payload.totalAmount)}`
    const pushPayload = JSON.stringify({
      title: `Pesanan Baru: ${payload.orderNumber}`,
      body,
      url: `/dashboard/orders/${payload.orderId}`,
      tag: `order-${payload.orderId}`,
    })

    const staleIds: string[] = []

    await Promise.allSettled(
      (subscriptions as PushSubscriptionRow[]).map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            pushPayload
          )
        } catch (err: unknown) {
          const statusCode =
            typeof err === 'object' &&
            err !== null &&
            'statusCode' in err &&
            typeof (err as { statusCode: unknown }).statusCode === 'number'
              ? (err as { statusCode: number }).statusCode
              : null

          if (statusCode === 404 || statusCode === 410) {
            staleIds.push(sub.id)
          } else {
            console.error('[push] Failed to send notification:', err)
          }
        }
      })
    )

    if (staleIds.length > 0) {
      await admin.from('push_subscriptions').delete().in('id', staleIds)
    }
  } catch (err) {
    console.error('[push] Unexpected error:', err)
  }
}
