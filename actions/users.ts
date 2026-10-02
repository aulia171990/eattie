'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'

type ActionState = { error?: string; success?: boolean } | null

export async function updateUserRole(
  targetUserId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const auth = await requireRole(['owner'])
  if (auth.error) return { error: auth.error }
  const supabase = auth.supabase
  const user = auth.user
  if (!user) return { error: 'Tidak terautentikasi' }

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

export async function toggleUserActive(
  targetUserId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const auth = await requireRole(['owner'])
  if (auth.error) return { error: auth.error }
  const supabase = auth.supabase
  const user = auth.user
  if (!user) return { error: 'Tidak terautentikasi' }

  if (targetUserId === user.id) {
    return { error: 'Tidak dapat menonaktifkan akun sendiri' }
  }

  const isActive = formData.get('is_active') === 'true'

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', targetUserId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings/users')
  return { success: true }
}
