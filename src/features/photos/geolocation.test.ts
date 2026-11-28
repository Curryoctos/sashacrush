import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ACCEPTABLE_ACCURACY_M,
  readCaptureGeolocation,
  readGeolocation,
  resetGeolocationCache,
  TARGET_ACCURACY_M,
} from '@/features/photos/geolocation'

describe('readGeolocation', () => {
  const originalGeolocation = navigator.geolocation
  const originalPermissions = navigator.permissions

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: originalGeolocation,
    })
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: originalPermissions,
    })
    resetGeolocationCache()
  })

  function mockGeo(watchPosition: ReturnType<typeof vi.fn>) {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        watchPosition,
        clearWatch: vi.fn(),
        getCurrentPosition: vi.fn(),
      },
    })
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: {
        query: vi.fn().mockResolvedValue({ state: 'granted' }),
      },
    })
  }

  it('resolves early when a high-accuracy GPS fix arrives', async () => {
    const watchPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          latitude: 0.5601,
          longitude: 31.3952,
          accuracy: TARGET_ACCURACY_M,
        },
      } as GeolocationPosition)
      return 1
    })
    mockGeo(watchPosition)

    await expect(readGeolocation()).resolves.toEqual({
      latitude: 0.5601,
      longitude: 31.3952,
      accuracyM: TARGET_ACCURACY_M,
    })
  })

  it('keeps the most accurate sample when the budget expires', async () => {
    const watchPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          latitude: 0.55,
          longitude: 31.3,
          accuracy: 500,
        },
      } as GeolocationPosition)
      queueMicrotask(() => {
        success({
          coords: {
            latitude: 0.5604,
            longitude: 31.3948,
            accuracy: ACCEPTABLE_ACCURACY_M,
          },
        } as GeolocationPosition)
      })
      return 1
    })
    mockGeo(watchPosition)

    const pending = readGeolocation()
    await vi.runAllTimersAsync()

    await expect(pending).resolves.toEqual({
      latitude: 0.5604,
      longitude: 31.3948,
      accuracyM: ACCEPTABLE_ACCURACY_M,
    })
  })

  it('returns nulls when permission is denied', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        watchPosition: vi.fn(),
        clearWatch: vi.fn(),
      },
    })
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: {
        query: vi.fn().mockResolvedValue({ state: 'denied' }),
      },
    })

    await expect(readGeolocation()).resolves.toEqual({
      latitude: null,
      longitude: null,
      accuracyM: null,
    })
  })

  it('stamps a warm high-accuracy fix without waiting on another sample', async () => {
    const seed = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          latitude: 0.5601,
          longitude: 31.3952,
          accuracy: 8,
        },
      } as GeolocationPosition)
      return 1
    })
    mockGeo(seed)
    await readGeolocation()

    const watchPosition = vi.fn()
    mockGeo(watchPosition)

    await expect(readCaptureGeolocation()).resolves.toEqual({
      latitude: 0.5601,
      longitude: 31.3952,
      accuracyM: 8,
    })
    expect(watchPosition).not.toHaveBeenCalled()
  })
})
