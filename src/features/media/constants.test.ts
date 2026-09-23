import { describe, expect, it } from 'vitest'
import {
  formatBytes,
  MAX_MEDIA_BYTES,
  validateMediaUpload,
} from '@/features/media/constants'

describe('validateMediaUpload', () => {
  it('accepts mp4 under the size cap', () => {
    const file = new File([new Uint8Array(1024)], 'site.mp4', { type: 'video/mp4' })
    expect(validateMediaUpload(file, 'Site walk', 'land-1')).toBeNull()
  })

  it('rejects non-video mime types', () => {
    const file = new File([new Uint8Array(10)], 'notes.txt', { type: 'text/plain' })
    expect(validateMediaUpload(file, 'Notes', 'land-1')).toMatch(/MP4|MOV/i)
  })

  it('rejects oversized files', () => {
    const file = {
      name: 'huge.mp4',
      type: 'video/mp4',
      size: MAX_MEDIA_BYTES + 1,
    } as File
    expect(validateMediaUpload(file, 'Huge', 'land-1')).toMatch(/500MB/i)
  })
})

describe('formatBytes', () => {
  it('formats MB', () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})
