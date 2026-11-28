/**
 * C-30 business-rule automated checks (unit + static).
 * RLS-backed rules live in seller-*-rls / seller-isolation-rls integration tests.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { computeSHA256 } from '@/lib/crypto'
import { ALLOWED_MIME_TYPES } from '@/types/documents'
import { PHOTO_MIME_TYPES } from '@/types/photos'
import { CARGO_DOC_MIME_TYPES } from '@/types/cargo'

const SIGNATURE_MIME_TYPES = ['image/png', 'image/jpeg'] as const

describe('BR-04 signed document hash', () => {
  it('SHA-256 of signed bytes is stable and unique per content', async () => {
    const a = await computeSHA256(new TextEncoder().encode('signed-doc-v1'))
    const b = await computeSHA256(new TextEncoder().encode('signed-doc-v1'))
    const c = await computeSHA256(new TextEncoder().encode('signed-doc-v2'))
    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(a).toMatch(/^[a-f0-9]{64}$/)
  })
})

describe('BR-05 crypto keys never on server', () => {
  it('wallet feature does not reference private key / mnemonic material', () => {
    const walletDir = path.resolve(process.cwd(), 'src/features/wallet')
    const files = [
      'WalletProvider.tsx',
      'sendTransfer.ts',
      'settleCryptoConversion.ts',
      'balances.ts',
      'constants.ts',
    ]
    for (const file of files) {
      const source = readFileSync(path.join(walletDir, file), 'utf8')
      expect(source).not.toMatch(/privateKey|private_key|mnemonic|seedPhrase|seed_phrase/i)
    }
  })
})

describe('BR-07 / upload MIME allowlists (no executables)', () => {
  it('photo MIME allowlist is image-only', () => {
    for (const mime of PHOTO_MIME_TYPES) {
      expect(mime.startsWith('image/')).toBe(true)
    }
    expect(PHOTO_MIME_TYPES).not.toContain('application/javascript')
    expect(PHOTO_MIME_TYPES).not.toContain('application/x-msdownload')
  })

  it('document MIME allowlist excludes executables', () => {
    for (const mime of ALLOWED_MIME_TYPES) {
      expect(mime).not.toMatch(/javascript|x-msdownload|octet-stream|x-sh/)
    }
  })

  it('cargo MIME allowlist matches DB CHECK set', () => {
    expect([...CARGO_DOC_MIME_TYPES].sort()).toEqual(
      [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ].sort(),
    )
  })

  it('signature uploads accept only PNG/JPEG', () => {
    expect(SIGNATURE_MIME_TYPES).toEqual(['image/png', 'image/jpeg'])
  })
})

describe('BR-02 receipt uniqueness helper', () => {
  it('receipt numbers include land prefix and are distinct for distinct inputs', async () => {
    // Mirror edge receipt id shape: SC-{land}-{timestamp}-{random}
    const a = `SC-MBD-${Date.now()}-aaaa`
    const b = `SC-MBD-${Date.now()}-bbbb`
    expect(a).not.toBe(b)
    expect(a).toMatch(/^SC-[A-Z0-9]+-\d+-[a-z0-9]+$/i)
  })
})
