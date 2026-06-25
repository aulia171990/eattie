import webpush from 'web-push'

let configured = false

export function getVapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null
}

export function configureWebPush(): boolean {
  if (configured) return true

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:owner@eattie.local'

  if (!publicKey || !privateKey) return false

  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
  return true
}

export { webpush }
