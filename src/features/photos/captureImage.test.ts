import { describe, expect, it } from 'vitest'
import { MAX_UPLOAD_BYTES, photoObjectPath, scaledCaptureSize } from '@/features/photos/captureImage'
import { photoAccuracyMeters } from '@/types/photos'
import { cameraErrorMessage } from '@/features/photos/cameraAccess'

describe('scaledCaptureSize', () => {
  it('leaves frames that already fit untouched', () => {
    expect(scaledCaptureSize(1280, 720)).toEqual({ width: 1280, height: 720 })
  })

  it('scales the long edge down for landscape and portrait frames', () => {
    expect(scaledCaptureSize(4000, 3000)).toEqual({ width: 1920, height: 1440 })
    expect(scaledCaptureSize(3000, 4000)).toEqual({ width: 1440, height: 1920 })
  })

  it('rejects an empty camera frame', () => {
    expect(() => scaledCaptureSize(0, 1080)).toThrow(/not ready/i)
  })
})

describe('MAX_UPLOAD_BYTES', () => {
  it('caps an upload under 500KB', () => {
    expect(MAX_UPLOAD_BYTES).toBe(500 * 1024)
    expect(MAX_UPLOAD_BYTES - 1).toBeLessThan(500 * 1024)
  })
})

describe('photoAccuracyMeters', () => {
  it('keeps a 10m camera fix and ignores a missing one', () => {
    expect(photoAccuracyMeters(8.4)).toBe(8.4)
    expect(photoAccuracyMeters('9.2')).toBe(9.2)
    expect(photoAccuracyMeters(null)).toBeNull()
  })
})

describe('photoObjectPath', () => {
  it('stores a jpeg under the land folder', () => {
    expect(photoObjectPath('land-1', 'photo-9')).toBe('land-1/photo-9.jpg')
  })
})

describe('cameraErrorMessage', () => {
  it('explains a denied camera permission', () => {
    expect(cameraErrorMessage(new DOMException('nope', 'NotAllowedError'))).toMatch(/denied/i)
  })

  it('explains a missing camera', () => {
    expect(cameraErrorMessage(new DOMException('none', 'NotFoundError'))).toMatch(/no camera/i)
  })
})
