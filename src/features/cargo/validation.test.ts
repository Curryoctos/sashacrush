import { describe, expect, it } from 'vitest'
import {
  adminNextCargoStatus,
  validateCargoDocument,
  validateCreateCargoShipment,
} from '@/features/cargo/validation'
import { MAX_CARGO_DOC_BYTES } from '@/types/cargo'

describe('validateCreateCargoShipment', () => {
  it('requires core fields', () => {
    expect(
      validateCreateCargoShipment({
        origin: '',
        destination: 'USA',
        description: 'Press',
        expectedAt: '2026-11-01',
      }),
    ).toMatch(/origin/i)
    expect(
      validateCreateCargoShipment({
        origin: 'Shenzhen',
        destination: 'Nebraska',
        description: 'CNC press',
        expectedAt: '2026-11-01',
      }),
    ).toBeNull()
  })
})

describe('adminNextCargoStatus', () => {
  it('walks the status pipeline', () => {
    expect(adminNextCargoStatus('ordered')).toBe('in_transit')
    expect(adminNextCargoStatus('cleared')).toBe('delivered')
    expect(adminNextCargoStatus('delivered')).toBeNull()
  })
})

describe('validateCargoDocument', () => {
  it('accepts pdf under size cap', () => {
    const file = new File([new Uint8Array(100)], 'bol.pdf', { type: 'application/pdf' })
    expect(validateCargoDocument(file, 'Bill of lading')).toBeNull()
  })

  it('rejects oversized files', () => {
    const file = {
      name: 'huge.pdf',
      type: 'application/pdf',
      size: MAX_CARGO_DOC_BYTES + 1,
    } as File
    expect(validateCargoDocument(file, 'Huge')).toMatch(/25MB/i)
  })
})
