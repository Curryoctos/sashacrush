import { describe, expect, it } from 'vitest'
import { computeSHA256 } from '@/lib/crypto'
import {
  ALREADY_SIGNED_ERROR,
  assertCanSignDocument,
  validateFileSize,
  validateFileType,
} from '@/features/documents/validation'
import { MAX_FILE_SIZE_BYTES } from '@/types/documents'

describe('computeSHA256', () => {
  it('returns consistent hex string for same input', async () => {
    const input = new TextEncoder().encode('sashacrush-document')
    const first = await computeSHA256(input)
    const second = await computeSHA256(input)

    expect(first).toBe(second)
    expect(first).toMatch(/^[a-f0-9]{64}$/)
  })

  it('returns different hash for different input', async () => {
    const first = await computeSHA256(new TextEncoder().encode('document-a'))
    const second = await computeSHA256(new TextEncoder().encode('document-b'))

    expect(first).not.toBe(second)
  })
})

describe('file validation', () => {
  it('rejects executable MIME type', () => {
    expect(validateFileType('application/x-msdownload')).toBe(false)
  })

  it('rejects files larger than 50MB', () => {
    expect(validateFileSize(MAX_FILE_SIZE_BYTES + 1)).toBe(false)
    expect(validateFileSize(MAX_FILE_SIZE_BYTES)).toBe(true)
  })
})

describe('signDocument immutability', () => {
  it('throws when document is already signed', () => {
    expect(() => assertCanSignDocument('signed')).toThrow(ALREADY_SIGNED_ERROR)
  })
})
