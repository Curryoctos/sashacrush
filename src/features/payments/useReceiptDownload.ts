import { useState } from 'react'
import { RECEIPTS_BUCKET } from '@/features/payments/receiptPdf'
import { supabase } from '@/lib/supabase'

export function useReceiptDownload() {
  const [isDownloading, setIsDownloading] = useState(false)

  async function downloadReceipt(pdfPath: string): Promise<void> {
    setIsDownloading(true)
    try {
      const { data, error } = await supabase.storage
        .from(RECEIPTS_BUCKET)
        .createSignedUrl(pdfPath, 3600) // 1 hour

      if (error || !data?.signedUrl) {
        throw new Error(error?.message ?? 'Could not generate download link')
      }

      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } finally {
      setIsDownloading(false)
    }
  }

  return { downloadReceipt, isDownloading }
}
