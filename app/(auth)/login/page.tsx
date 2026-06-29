'use client'

import { BRANDING } from '@/config/branding'

import { useActionState } from 'react'
import { login } from '@/actions/auth'
import Link from 'next/link'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null)

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'hsl(25, 30%, 12%)' }}
      >
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'hsl(32, 95%, 44%)' }} />
        <div className="absolute -bottom-32 -right-16 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'hsl(32, 95%, 44%)' }} />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: BRANDING.colors.primary }}>{BRANDING.logoEmoji}</div>
          <span className="text-white text-xl font-semibold">Bakery Manager</span>
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Kelola Toko Roti<br />
              <span style={{ color: 'hsl(32, 95%, 60%)' }}>dengan Mudah</span>
            </h1>
            <p className="mt-4 text-lg" style={{ color: 'hsl(36, 20%, 65%)' }}>
              Sistem manajemen lengkap untuk inventory, produksi, penjualan, dan laporan keuangan.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { emoji: '📦', label: 'Inventory', desc: 'Kontrol stok bahan baku' },
              { emoji: '🏭', label: 'Produksi', desc: 'Tracking batch produksi' },
              { emoji: '💳', label: 'POS Kasir', desc: 'Sistem kasir cepat' },
              { emoji: '📊', label: 'Laporan', desc: 'Analisis keuangan' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl p-4" style={{ background: 'hsl(25, 20%, 18%)' }}>
                <div className="text-2xl mb-2">{item.emoji}</div>
                <div className="text-white font-medium text-sm">{item.label}</div>
                <div className="text-xs mt-1" style={{ color: 'hsl(36, 15%, 55%)' }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-sm" style={{ color: 'hsl(36, 15%, 45%)' }}>
          © 2025 Bakery Management System
        </div>
      </div>

      {/* Right login panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8"
        style={{ background: 'hsl(36, 33%, 97%)' }}>
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: BRANDING.colors.primary }}>{BRANDING.logoEmoji}</div>
            <span className="text-xl font-semibold" style={{ color: 'hsl(25, 30%, 12%)' }}>
              Bakery Manager
            </span>
          </div>

          <h2 className="text-2xl font-bold" style={{ color: 'hsl(25, 30%, 12%)' }}>
            Selamat Datang
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'hsl(25, 15%, 50%)' }}>
            Masuk ke akun Anda untuk melanjutkan
          </p>

          <form action={formAction} className="mt-8 space-y-5">
            {state?.error && (
              <div className="rounded-lg p-3 text-sm text-red-700 bg-red-50 border border-red-200">
                {state.error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium" style={{ color: 'hsl(25, 30%, 20%)' }}>
                Email
              </label>
              <input id="email" name="email" type="email" autoComplete="email" required
                placeholder="nama@email.com"
                className="w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none"
                style={{ borderColor: 'hsl(36, 20%, 80%)', background: 'white', color: 'hsl(25, 30%, 12%)' }}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium" style={{ color: 'hsl(25, 30%, 20%)' }}>
                Password
              </label>
              <input id="password" name="password" type="password" autoComplete="current-password" required
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none"
                style={{ borderColor: 'hsl(36, 20%, 80%)', background: 'white', color: 'hsl(25, 30%, 12%)' }}
              />
            </div>

            <button type="submit" disabled={isPending}
              className="w-full py-2.5 px-4 rounded-lg font-medium text-sm text-white disabled:opacity-60"
              style={{ background: 'hsl(32, 95%, 44%)' }}>
              {isPending ? 'Masuk...' : 'Masuk'}
            </button>
          </form>

          {/* SIGNUP LINK DISABLED — uncomment to re-enable
          <p className="mt-6 text-center text-sm" style={{ color: 'hsl(25, 15%, 50%)' }}>
            Belum punya akun?{' '}
            <Link href="/sign-up" className="font-medium hover:underline" style={{ color: 'hsl(32, 95%, 44%)' }}>
              Daftar Sekarang
            </Link>
          </p>
          */}
        </div>
      </div>
    </div>
  )
}
