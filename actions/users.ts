'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type ActionState = { error?: string; success?: boolean } | null

export async function updateUserRole(
  targetUserId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()

  // Verify caller is owner
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi' }

  const { data: caller } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (caller?.role !== 'owner') {
    return { error: 'Hanya owner yang dapat mengubah role' }
  }

  // Prevent owner from changing their own role
  if (targetUserId === user.id) {
    return { error: 'Tidak dapat mengubah role sendiri' }
  }

  const newRole = formData.get('role') as string
  if (!['owner', 'cashier', 'baker'].includes(newRole)) {
    return { error: 'Role tidak valid' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole as 'owner' | 'cashier' | 'baker', updated_at: new Date().toISOString() })
    .eq('id', targetUserId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings/users')
  return { success: true }
}
