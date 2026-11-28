import { supabase } from '@/lib/supabase'

export async function notifySuggestionStatusChanged(suggestionId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('notify-suggestion-status', {
    body: { suggestionId },
  })
  if (error) {
    console.warn('notify-suggestion-status edge function:', error.message)
  }
}
