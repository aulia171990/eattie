'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Profile } from '@/types'
import type { TablesInsert } from '@/types/database'

export async function login(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) return { error: 'Email dan password wajib diisi' }

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: 'Email atau password salah' }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signUp(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const full_name = formData.get('full_name') as string
  const role = (formData.get('role') as Profile['role']) || 'cashier'

  if (!email || !password || !full_name) {
    return { error: 'Semua field wajib diisi' }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name, role } },
  })
  if (error) return { error: error.message }

  if (data.user) {
    const profilePayload: TablesInsert<'profiles'> = {
      id: data.user.id,
      full_name,
      role,
      is_active: true,
    }
    await supabase.from('profiles').upsert(profilePayload)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function getUser(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  return data
}
