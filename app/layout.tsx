import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/contexts/providers'

export const metadata: Metadata = {
  title: 'Bakery Management',
  description: 'Sistem manajemen toko roti lengkap',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
