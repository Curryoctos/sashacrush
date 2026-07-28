import { supabase } from '@/lib/supabase'

export async function notifyAdminSellerMessage(
  messageId: string,
  landId: string,
): Promise<void> {
  const { error } = await supabase.functions.invoke('notify-seller-message', {
    body: { messageId, landId },
  })

  if (error) {
    console.warn('notify-seller-message edge function:', error.message)
  }
}

export async function notifySellerAdminMessage(
  messageId: string,
  landId: string,
): Promise<void> {
  const { error } = await supabase.functions.invoke('notify-admin-message', {
    body: { messageId, landId },
  })

  if (error) {
    console.warn('notify-admin-message edge function:', error.message)
  }
}
