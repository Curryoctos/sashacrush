import type { PostgrestError } from '@supabase/supabase-js'

export function formatSupabaseError(error: PostgrestError | Error): string {
  if ('code' in error && error.code === '42501') {
    return 'Permission denied. You do not have access to perform this action.'
  }

  if ('code' in error && error.code === 'PGRST116') {
    return 'Record not found or access denied.'
  }

  return error.message
}

export function isRlsViolation(error: PostgrestError): boolean {
  return error.code === '42501' || error.code === 'PGRST301'
}
