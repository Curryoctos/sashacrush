import { supabase } from '@/lib/supabase'

export async function notifySellerAssigned(
  landId: string,
  sellerId: string,
): Promise<void> {
  const { error } = await supabase.functions.invoke('notify-seller-assigned', {
    body: { landId, sellerId },
  })

  if (error) {
    console.warn('notify-seller-assigned edge function:', error.message)
  }
}
