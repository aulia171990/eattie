'use client'

import { useCallback, useEffect, useState } from 'react'

export type PushStatus =
  | 'unsupported'
  | 'loading'
  | 'prompt'
  | 'subscribed'
  | 'denied'
  | 'error'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushNotifications(enabled: boolean) {
  const [status, setStatus] = useState<PushStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const checkSubscription = useCallback(async () => {
    if (!enabled) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      if (existing) {
        setStatus('subscribed')
      } else if (Notification.permission === 'denied') {
        setStatus('denied')
      } else {
        setStatus('prompt')
      }
    } catch {
      setStatus('error')
      setErrorMessage('Gagal mendaftarkan service worker')
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    checkSubscription()
  }, [enabled, checkSubscription])

  const subscribe = useCallback(async () => {
    if (!enabled) return false
    setStatus('loading')
    setErrorMessage(null)

    try {
      const keyRes = await fetch('/api/push/vapid-public-key')
      if (!keyRes.ok) {
        setStatus('error')
        setErrorMessage('Push belum dikonfigurasi di server')
        return false
      }
      const { publicKey } = await keyRes.json()

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus('denied')
        return false
      }

      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      })

      const json = subscription.toJSON()
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setStatus('error')
        setErrorMessage(data.error ?? 'Gagal menyimpan subscription')
        return false
      }

      setStatus('subscribed')
      return true
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Gagal mengaktifkan push')
      return false
    }
  }, [enabled])

  const unsubscribe = useCallback(async () => {
    if (!enabled) return false

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }
      setStatus('prompt')
      return true
    } catch {
      setStatus('error')
      setErrorMessage('Gagal menonaktifkan push')
      return false
    }
  }, [enabled])

  return { status, errorMessage, subscribe, unsubscribe, refresh: checkSubscription }
}
