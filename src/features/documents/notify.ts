import { supabase } from '@/lib/supabase'

export async function notifyDocumentSent(
  documentId: string,
  assigneeId: string,
): Promise<void> {
  const { error } = await supabase.functions.invoke('notify-document-sent', {
    body: { documentId, assigneeId, sellerId: assigneeId },
  })

  if (error) {
    throw new Error(error.message || 'Document notification email failed')
  }
}

export async function notifyDocumentSigned(documentId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('notify-document-signed', {
    body: { documentId },
  })

  if (error) {
    console.warn('notify-document-signed edge function:', error.message)
  }
}
