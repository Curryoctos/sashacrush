import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createReceipt } from '../../../supabase/functions/_shared/createReceipt.ts'
import { generateReceiptPdf } from '../../../supabase/functions/_shared/generateReceiptPdf.ts'
import { generateReceiptNumber } from '../../../supabase/functions/_shared/receiptNumber.ts'
import { exportToCsv, type PaymentRow } from '@/features/payments/exportCsv'
import {
  computePaymentProgress,
  formatUgx,
  formatUsd,
} from '@/lib/formatters'

const year = new Date().getFullYear()

describe('generateReceiptNumber', () => {
  it('returns SC-YYYY-000001 when allocated', async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: `SC-${year}-000001`, error: null }),
    }

    const number = await generateReceiptNumber(supabase as never)
    expect(number).toBe(`SC-${year}-000001`)
    expect(supabase.rpc).toHaveBeenCalledWith('allocate_receipt_number')
  })

  it('increments correctly when allocator returns next sequence', async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: `SC-${year}-000042`, error: null }),
    }

    const number = await generateReceiptNumber(supabase as never)
    expect(number).toBe(`SC-${year}-000042`)
  })
})

describe('generateReceiptPdf', () => {
  const params = {
    receiptNumber: 'SC-2026-000001',
    landTitle: 'Mubende Land',
    landReference: 'SC-E4EEBC99',
    sellerName: 'Mubende Seller',
    amountUsd: 50_000,
    amountUgx: 185_000_000,
    rateUsed: 3700,
    transactionId: 'tx-123',
    confirmedAt: '2026-07-18T12:00:00.000Z',
  }

  it('returns bytes longer than 500', async () => {
    const bytes = await generateReceiptPdf(params)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(500)
  })

  it('includes the receipt number in the PDF content stream', async () => {
    const bytes = await generateReceiptPdf(params)
    const { inflateSync } = await import('node:zlib')
    const latin = Buffer.from(bytes).toString('binary')
    const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g

    let text = ''
    let match: RegExpExecArray | null
    while ((match = streamRe.exec(latin)) !== null) {
      try {
        text += inflateSync(Buffer.from(match[1]!, 'binary')).toString('binary')
      } catch {
        // non-flate stream — ignore
      }
    }

    // pdf-lib encodes WinAnsi strings as PDF hex: <53432D...>
    const hexNeedle = Buffer.from('SC-2026-000001', 'utf8').toString('hex').toUpperCase()
    expect(text.toUpperCase()).toContain(hexNeedle)
  })
})

describe('createReceipt', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('skips if already receipted and does not generate a PDF', async () => {
    const generateSpy = vi.fn()
    vi.doMock('../../../supabase/functions/_shared/generateReceiptPdf.ts', () => ({
      RECEIPTS_BUCKET: 'receipts',
      generateReceiptPdf: generateSpy,
    }))

    const maybeSingle = vi.fn().mockResolvedValue({
      data: { receipt_number: 'SC-2026-000001', pdf_path: 'seller/SC-2026-000001.pdf' },
      error: null,
    })

    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle,
              }),
            }),
          }),
        }),
      }),
      storage: { from: vi.fn() },
      functions: { invoke: vi.fn() },
      rpc: vi.fn(),
    }

    const result = await createReceipt({
      supabase: supabase as never,
      paymentId: 'pay-1',
      landId: 'land-1',
      sellerId: 'seller-1',
      amountUsd: 50_000,
      amountUgx: 185_000_000,
      rateUsed: 3700,
      transactionId: 'pay-1',
      confirmedAt: '2026-07-18T12:00:00.000Z',
    })

    expect(result.receiptNumber).toBe('SC-2026-000001')
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('throws if land not found', async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'receipts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'land_records') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'not found' },
                }),
              }),
            }),
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'Seller', email: 's@x.com' },
                error: null,
              }),
            }),
          }),
        }
      }),
    }

    await expect(
      createReceipt({
        supabase: supabase as never,
        paymentId: 'pay-1',
        landId: 'missing-land',
        sellerId: 'seller-1',
        amountUsd: 1,
        amountUgx: 1,
        rateUsed: 1,
        transactionId: 'pay-1',
        confirmedAt: '2026-07-18T12:00:00.000Z',
      }),
    ).rejects.toThrow(/Land record not found/)
  })

  it('throws if seller not found', async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'receipts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'land_records') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { title: 'Mubende Land', location: 'Mubende' },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'missing' },
              }),
            }),
          }),
        }
      }),
    }

    await expect(
      createReceipt({
        supabase: supabase as never,
        paymentId: 'pay-1',
        landId: 'land-1',
        sellerId: 'missing-seller',
        amountUsd: 1,
        amountUgx: 1,
        rateUsed: 1,
        transactionId: 'pay-1',
        confirmedAt: '2026-07-18T12:00:00.000Z',
      }),
    ).rejects.toThrow(/Seller profile not found/)
  })

  it('rolls back PDF on receipt insert failure', async () => {
    const remove = vi.fn().mockResolvedValue({ data: null, error: null })
    const upload = vi.fn().mockResolvedValue({ data: {}, error: null })

    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: `SC-${year}-000001`, error: null }),
      from: vi.fn((table: string) => {
        if (table === 'receipts') {
          return {
            select: vi.fn().mockImplementation((_cols: string, opts?: { head?: boolean }) => {
              if (opts?.head) {
                return Promise.resolve({ count: 0, error: null })
              }
              return {
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                  }),
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: '23505', message: 'duplicate key value' },
                }),
              }),
            }),
          }
        }
        if (table === 'land_records') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { title: 'Mubende Land', location: 'Mubende' },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { full_name: 'Seller', email: 's@x.com' },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      }),
      storage: {
        from: vi.fn().mockReturnValue({ upload, remove }),
      },
      functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
    }

    await expect(
      createReceipt({
        supabase: supabase as never,
        paymentId: 'pay-1',
        landId: 'land-1',
        sellerId: 'seller-1',
        amountUsd: 50_000,
        amountUgx: 185_000_000,
        rateUsed: 3700,
        transactionId: 'pay-1',
        confirmedAt: '2026-07-18T12:00:00.000Z',
      }),
    ).rejects.toThrow(/Receipt DB insert failed/)

    expect(remove).toHaveBeenCalledWith([`seller-1/SC-${year}-000001.pdf`])
  })
})

describe('formatters', () => {
  it('formatUsd formats correctly', () => {
    expect(formatUsd(300000)).toBe('$300,000.00')
    expect(formatUsd(0.5)).toBe('$0.50')
  })

  it('formatUgx formats correctly', () => {
    expect(formatUgx(1_107_000_000)).toBe('1,107,000,000 UGX')
  })

  it('balance calculation is correct', () => {
    const { outstandingUsd, pctPaid } = computePaymentProgress(300_000, 50_000)
    expect(outstandingUsd).toBe(250_000)
    expect(pctPaid).toBe(16.67)
  })
})

describe('exportToCsv', () => {
  it('produces correct headers', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:mock')
    const revokeObjectURL = vi.fn()
    const click = vi.fn()

    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    })

    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return { href: '', download: '', click } as unknown as HTMLAnchorElement
      }
      return originalCreateElement(tag)
    })

    const rows: PaymentRow[] = [
      {
        id: '1',
        receipt_number: 'SC-2026-000001',
        confirmed_at: '2026-07-18T12:00:00.000Z',
        amount_usd: 50_000,
        amount_ugx: 185_000_000,
        rate_used: 3700,
        method: 'manual',
        status: 'confirmed',
        pdf_path: 'seller/SC-2026-000001.pdf',
        created_at: '2026-07-18T12:00:00.000Z',
      },
    ]

    let blobText = ''
    vi.stubGlobal(
      'Blob',
      class MockBlob {
        parts: BlobPart[]
        constructor(parts: BlobPart[]) {
          this.parts = parts
          blobText = parts.map(String).join('')
        }
      },
    )

    exportToCsv(rows, 'payments.csv')

    expect(
      blobText.startsWith(
        'Receipt No,Date,Amount USD,Amount UGX,Rate (1 USD = X UGX),Method,Status',
      ),
    ).toBe(true)
    expect(click).toHaveBeenCalled()

    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })
})
