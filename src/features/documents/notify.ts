import { supabase } from '@/lib/supabase'

export async function notifyDocumentSent(
  documentId: string,
  sellerId: string,
): Promise<void> {
  const { error } = await supabase.functions.invoke('notify-document-sent', {
    body: { documentId, sellerId },
  })

  if (error) {
    throw new Error(error.message || 'Document notification email failed')
  }
}
