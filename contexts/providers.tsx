'use client'

import { BrandingProvider } from './branding-context'
import { ToastProvider } from './toast-context'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <BrandingProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </BrandingProvider>
  )
}
