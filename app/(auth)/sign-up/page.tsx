'use client'

import { BRANDING } from '@/config/branding'
// SIGNUP DISABLED — remove this redirect and restore the original export below to re-enable
import { redirect } from 'next/navigation'
export default function SignUpPage() {
  redirect('/login')
}


/* ORIGINAL SIGNUP PAGE — uncomment to re-enable
'use client'


import { useActionState } from 'react'
import { signUp } from '@/actions/auth'
import Link from 'next/link'

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState(signUp, null)

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'hsl(36, 33%, 97%)' }}>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl text-white"
            style={{ background: BRANDING.colors.primary }}>{BRANDING.logoEmoji}</div>
          <span className="text-xl font-semibold" style={{ color: 'hsl(25, 30%, 12%)' }}>Bakery Manager</span>
        </div>

        <h2 className="text-2xl font-bold mb-1" style={{ color: 'hsl(25, 30%, 12%)' }}>Daftar Akun</h2>
        <p className="text-sm mb-6" style={{ color: 'hsl(25, 15%, 50%)' }}>
          Buat akun untuk mulai menggunakan sistem
        </p>

        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="p-3 rounded-lg text-sm text-red-700 bg-red-50 border border-red-200">
              {state.error}
            </div>
          )}

          {[
            { name: 'full_name', label: 'Nama Lengkap', type: 'text', placeholder: 'Nama Anda' },
            { name: 'email', label: 'Email', type: 'email', placeholder: 'nama@email.com' },
            { name: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
          ].map((f) => (
            <div key={f.name}>
              <label className="text-sm font-medium block mb-1" style={{ color: 'hsl(25, 30%, 20%)' }}>
                {f.label}
              </label>
              <input name={f.name} type={f.type} required placeholder={f.placeholder}
                className="w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none"
                style={{ borderColor: 'hsl(36, 20%, 80%)', background: 'white' }}
              />
            </div>
          ))}

          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: 'hsl(25, 30%, 20%)' }}>
              Role
            </label>
            <select name="role" required
              className="w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'hsl(36, 20%, 80%)', background: 'white' }}>
              <option value="owner">Pemilik (Owner)</option>
              <option value="cashier">Kasir (Cashier)</option>
              <option value="baker">Baker</option>
            </select>
          </div>

          <button type="submit" disabled={isPending}
            className="w-full py-2.5 px-4 rounded-lg font-medium text-sm text-white disabled:opacity-60"
            style={{ background: 'hsl(32, 95%, 44%)' }}>
            {isPending ? 'Mendaftar...' : 'Daftar'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: 'hsl(25, 15%, 50%)' }}>
          Sudah punya akun?{' '}
          <Link href="/login" className="font-medium hover:underline" style={{ color: 'hsl(32, 95%, 44%)' }}>
            Masuk
          </Link>
        </p>
      </div>
    </div>
  )
}
*/
