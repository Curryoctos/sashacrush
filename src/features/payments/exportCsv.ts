export interface PaymentRow {
  id: string
  receipt_number: string | null
  confirmed_at: string | null
  amount_usd: number
  amount_ugx: number | null
  rate_used: number | null
  method: string | null
  status: string
  pdf_path: string | null
  created_at: string
}

export function exportToCsv(rows: PaymentRow[], filename: string): void {
  const headers = [
    'Receipt No',
    'Date',
    'Amount USD',
    'Amount UGX',
    'Rate (1 USD = X UGX)',
    'Method',
    'Status',
  ]
  const lines = rows.map((r) =>
    [
      r.receipt_number ?? '',
      r.confirmed_at ?? r.created_at,
      r.amount_usd,
      r.amount_ugx ?? '',
      r.rate_used ?? '',
      r.method ?? '',
      r.status,
    ].join(','),
  )
  const csv = [headers.join(','), ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
