import type { ActionState } from './index'

// Generic action signature for useActionState
export type ServerAction = (
  prev: ActionState,
  formData: FormData
) => Promise<ActionState>

// Helper to extract error from ActionState
export function getError(state: ActionState): string | null {
  if (!state) return null
  if ('error' in state) return state.error
  return null
}

export function isSuccess(state: ActionState): boolean {
  if (!state) return false
  return 'success' in state && state.success === true
}
