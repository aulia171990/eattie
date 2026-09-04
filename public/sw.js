/* eslint-disable no-restricted-globals */
// Service worker for Web Push — works even when dashboard tab is closed.

self.addEventListener('push', (event) => {
  let payload = {
    title: 'Pesanan Baru',
    body: 'Ada pesanan online masuk',
    url: '/dashboard/orders',
    tag: 'new-order',
  }

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() }
    } catch {
      payload.body = event.data.text()
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      data: { url: payload.url },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url ?? '/dashboard/orders'
  const absoluteUrl = new URL(targetUrl, self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if it's on our origin, then navigate
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.focus()
          // Navigate to the target URL
          if ('navigate' in client) {
            return client.navigate(absoluteUrl)
          }
          return client
        }
      }
      // No existing tab — open new window
      if (clients.openWindow) {
        return clients.openWindow(absoluteUrl)
      }
    })
  )
})
