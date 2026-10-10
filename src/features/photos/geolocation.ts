export type GeoCoords = {
  latitude: number | null
  longitude: number | null
  /** Horizontal accuracy in meters, when the browser reports it. */
  accuracyM: number | null
}

export const NULL_COORDS: GeoCoords = {
  latitude: null,
  longitude: null,
  accuracyM: null,
}

/** MSDP C-13 target: within ~10m when the device can provide it. */
export const TARGET_ACCURACY_M = 10
/** Accept a slightly weaker fix rather than waiting forever outdoors. */
export const ACCEPTABLE_ACCURACY_M = 25
const WATCH_BUDGET_MS = 25_000

/** Best fix seen this session — used so uploads need not wait on GPS. */
let lastKnownCoords: GeoCoords | null = null
let warmupWatchId: number | null = null

function coordsFromPosition(position: GeolocationPosition): GeoCoords {
  const { latitude, longitude, accuracy } = position.coords
  return {
    latitude,
    longitude,
    accuracyM: Number.isFinite(accuracy) ? accuracy : null,
  }
}

function remember(coords: GeoCoords) {
  if (coords.latitude == null || coords.longitude == null) {
    return
  }
  if (
    !lastKnownCoords ||
    (coords.accuracyM ?? Number.POSITIVE_INFINITY) <
      (lastKnownCoords.accuracyM ?? Number.POSITIVE_INFINITY)
  ) {
    lastKnownCoords = coords
  }
}

export function getLastKnownGeolocation(): GeoCoords | null {
  return lastKnownCoords
}

/** Test helper — clears the in-memory GPS sample. */
export function resetGeolocationCache() {
  lastKnownCoords = null
}

function betterCoords(next: GeoCoords, previous: GeoCoords | null): GeoCoords {
  if (next.latitude == null || next.longitude == null) {
    return previous ?? NULL_COORDS
  }
  if (previous?.latitude == null || previous.longitude == null) {
    return next
  }
  return (next.accuracyM ?? Number.POSITIVE_INFINITY) <=
    (previous.accuracyM ?? Number.POSITIVE_INFINITY)
    ? next
    : previous
}

async function queryGeolocationPermission(): Promise<
  PermissionState | 'unsupported'
> {
  if (!navigator.permissions?.query) {
    return 'unsupported'
  }

  try {
    const status = await navigator.permissions.query({
      name: 'geolocation',
    })
    return status.state
  } catch {
    return 'unsupported'
  }
}

/**
 * Watch GPS until accuracy is good enough (or the budget expires).
 * Prefer high-accuracy samples only — never fall back to a stale network fix.
 */
function watchBestPosition(budgetMs: number): Promise<GeoCoords> {
  return new Promise((resolve) => {
    let best: GeolocationPosition | null = null
    let settled = false
    let watchId = 0
    let timer = 0

    const finish = (coords: GeoCoords) => {
      if (settled) {
        return
      }
      settled = true
      if (watchId) {
        navigator.geolocation.clearWatch(watchId)
      }
      window.clearTimeout(timer)
      remember(coords)
      resolve(coords)
    }

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const accuracy = position.coords.accuracy
        if (
          !best ||
          (Number.isFinite(accuracy) &&
            accuracy < (best.coords.accuracy ?? Number.POSITIVE_INFINITY))
        ) {
          best = position
        }

        const coords = coordsFromPosition(position)
        remember(coords)

        if (Number.isFinite(accuracy) && accuracy <= TARGET_ACCURACY_M) {
          finish(coords)
        }
      },
      () => {
        // Keep waiting for another sample until the budget ends.
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: budgetMs,
      },
    )

    timer = window.setTimeout(() => {
      if (best) {
        finish(coordsFromPosition(best))
        return
      }
      finish(NULL_COORDS)
    }, budgetMs)
  })
}

/**
 * Read GPS for a field photo.
 * Uses watchPosition + high accuracy so a coarse first estimate can refine.
 */
export async function readGeolocation(): Promise<GeoCoords> {
  if (!navigator.geolocation) {
    return NULL_COORDS
  }

  const permission = await queryGeolocationPermission()
  if (permission === 'denied') {
    return NULL_COORDS
  }

  return watchBestPosition(WATCH_BUDGET_MS)
}

/**
 * GPS to stamp on a shutter press.
 * Uses a warm ≤10m fix immediately so the photo can upload without waiting.
 */
export async function readCaptureGeolocation(maxWaitMs = 2_500): Promise<GeoCoords> {
  const known = getLastKnownGeolocation()
  if (known && isAccurateFix(known, TARGET_ACCURACY_M)) {
    return known
  }

  if (!navigator.geolocation) {
    return known ?? NULL_COORDS
  }

  const permission = await queryGeolocationPermission()
  if (permission === 'denied') {
    return known ?? NULL_COORDS
  }

  const fresh = await watchBestPosition(maxWaitMs)
  return betterCoords(fresh, getLastKnownGeolocation())
}

/** Keep a background fix warm so uploads can start with a last-known point. */
export function startGeolocationWarmup(): () => void {
  if (!navigator.geolocation || warmupWatchId != null) {
    return () => undefined
  }

  void queryGeolocationPermission().then((permission) => {
    if (permission === 'denied' || !navigator.geolocation) {
      return
    }
    warmupWatchId = navigator.geolocation.watchPosition(
      (position) => {
        remember(coordsFromPosition(position))
      },
      () => undefined,
      {
        enableHighAccuracy: true,
        maximumAge: 5_000,
        timeout: 20_000,
      },
    )
  })

  return () => {
    if (warmupWatchId != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(warmupWatchId)
      warmupWatchId = null
    }
  }
}

/** True when the fix meets the product accuracy target (≤10m) or acceptable band. */
export function isAccurateFix(
  coords: GeoCoords,
  maxMeters: number = ACCEPTABLE_ACCURACY_M,
): boolean {
  return (
    coords.latitude != null &&
    coords.longitude != null &&
    coords.accuracyM != null &&
    coords.accuracyM <= maxMeters
  )
}
