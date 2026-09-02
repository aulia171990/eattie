'use client'

import { BrandingProvider } from './branding-context'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <BrandingProvider>
      {children}
    </BrandingProvider>
  )
}
