import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CartProvider } from '@/contexts/cart-context'

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role === 'baker') redirect('/dashboard')

  return (
    <CartProvider>
      <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
        {children}
      </div>
    </CartProvider>
  )
}
