import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ImagePlus, SwitchCamera, X } from 'lucide-react'
import { cameraErrorMessage, openCameraStream, stopMediaStream, type CameraFacing } from '@/features/photos/cameraAccess'
import { captureVideoFrame } from '@/features/photos/captureImage'
import {
  ACCEPTABLE_ACCURACY_M,
  getLastKnownGeolocation,
  isAccurateFix,
  TARGET_ACCURACY_M,
} from '@/features/photos/geolocation'

interface FieldCameraProps {
  landTitle: string
  initialStream: Promise<MediaStream>
  onClose: () => void
  onCapture: (shot: { file: File; capturedAt: string }) => void
  onPickLibrary: (file: File) => void
}

function gpsLabel(): { text: string; tone: 'good' | 'coarse' | 'wait' } {
  const coords = getLastKnownGeolocation()
  if (coords?.latitude == null || coords.longitude == null || coords.accuracyM == null) {
    return { text: 'Waiting for GPS within 10m', tone: 'wait' }
  }
  const meters = Math.round(coords.accuracyM)
  if (coords.accuracyM <= TARGET_ACCURACY_M) {
    return { text: `Live GPS ±${meters}m`, tone: 'good' }
  }
  if (coords.accuracyM <= ACCEPTABLE_ACCURACY_M) {
    return { text: `GPS ±${meters}m · need 10m`, tone: 'coarse' }
  }
  return { text: `GPS ±${meters}m · need 10m`, tone: 'wait' }
}

export function FieldCamera({
  landTitle,
  initialStream,
  onClose,
  onCapture,
  onPickLibrary,
}: FieldCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const libraryRef = useRef<HTMLInputElement>(null)
  const onCloseRef = useRef(onClose)
  const listenersRef = useRef(0)
  const [facing, setFacing] = useState<CameraFacing>('environment')
  const [ready, setReady] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gps, setGps] = useState(gpsLabel)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
      }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setGps(gpsLabel()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    listenersRef.current += 1
    let dropped = false
    let owned: MediaStream | null = null

    const attach = async (pending: Promise<MediaStream>) => {
      setReady(false)
      setError(null)
      try {
        const stream = await pending
        if (dropped) {
          if (listenersRef.current === 0 && streamRef.current !== stream) {
            stopMediaStream(stream)
          }
          return
        }
        owned = stream
        if (streamRef.current && streamRef.current !== stream) {
          stopMediaStream(streamRef.current)
        }
        streamRef.current = stream
        const video = videoRef.current
        if (!video) {
          setError('Camera preview is not ready.')
          return
        }
        video.muted = true
        video.playsInline = true
        video.srcObject = stream
        await video.play()
        if (video.videoWidth === 0) {
          await new Promise<void>((resolve, reject) => {
            const timer = window.setTimeout(() => reject(new Error('Camera preview did not start.')), 8000)
            const done = () => {
              if (video.videoWidth > 0) {
                window.clearTimeout(timer)
                video.removeEventListener('loadedmetadata', done)
                resolve()
              }
            }
            video.addEventListener('loadedmetadata', done)
          })
        }
        if (!dropped) {
          setReady(true)
        }
      } catch (cameraError) {
        if (!dropped) {
          setError(cameraErrorMessage(cameraError))
          setReady(false)
        }
      }
    }

    void attach(initialStream)

    return () => {
      dropped = true
      listenersRef.current -= 1
      const snapshot = streamRef.current ?? owned
      window.setTimeout(() => {
        if (listenersRef.current > 0) {
          return
        }
        stopMediaStream(snapshot)
        if (streamRef.current === snapshot) {
          streamRef.current = null
        }
      }, 0)
    }
  }, [initialStream])

  const switchFacing = () => {
    if (!navigator.mediaDevices?.getUserMedia || capturing) {
      return
    }
    const next: CameraFacing = facing === 'environment' ? 'user' : 'environment'
    setFacing(next)
    const pending = openCameraStream(next)
    void pending
      .then(async (stream) => {
        if (listenersRef.current === 0) {
          stopMediaStream(stream)
          return
        }
        if (streamRef.current && streamRef.current !== stream) {
          stopMediaStream(streamRef.current)
        }
        streamRef.current = stream
        const video = videoRef.current
        if (!video) {
          return
        }
        video.muted = true
        video.srcObject = stream
        await video.play()
        setReady(true)
        setError(null)
      })
      .catch((cameraError: unknown) => {
        setError(cameraErrorMessage(cameraError))
      })
  }

  const gpsReady = gps.tone === 'good'

  const capture = async () => {
    const video = videoRef.current
    const coords = getLastKnownGeolocation()
    if (!video || !ready || capturing) {
      return
    }
    if (!coords || !isAccurateFix(coords, TARGET_ACCURACY_M)) {
      setError('Waiting for a GPS fix within 10m.')
      return
    }
    setError(null)
    setCapturing(true)
    const capturedAtMs = Date.now()
    try {
      const file = await captureVideoFrame(video, capturedAtMs)
      onCapture({ file, capturedAt: new Date(capturedAtMs).toISOString() })
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : 'Could not capture the photo.')
      setCapturing(false)
    }
  }

  const toneClass =
    gps.tone === 'good'
      ? 'bg-emerald-500/90 text-white'
      : gps.tone === 'coarse'
        ? 'bg-amber-400/90 text-ink'
        : 'bg-white/15 text-white'

  return createPortal(
    <div className="fixed inset-0 z-[80] flex h-[100dvh] flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label="Site camera">
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div>
          <p className="text-sm font-medium">{landTitle}</p>
          <p className="text-xs text-white/70">On-site capture</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneClass}`}>{gps.text}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close camera"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <video
          ref={videoRef}
          className="h-full w-full object-contain"
          playsInline
          muted
          autoPlay
        />
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
            Starting camera…
          </div>
        )}
        {error && (
          <div className="absolute inset-x-4 bottom-4 rounded-lg bg-black/80 p-3 text-sm" role="alert">
            {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 items-center px-6 pb-8 pt-4">
        <div>
          <button
            type="button"
            onClick={() => libraryRef.current?.click()}
            aria-label="Upload from library"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15"
          >
            <ImagePlus className="h-5 w-5" />
          </button>
          <input
            ref={libraryRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) {
                onPickLibrary(file)
              }
            }}
          />
        </div>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => void capture()}
            disabled={!ready || capturing || !gpsReady}
            aria-label={
              capturing ? 'Saving photo' : gpsReady ? 'Capture photo' : 'Waiting for GPS within 10m'
            }
            className="h-16 w-16 rounded-full border-4 border-white bg-white/90 disabled:opacity-40"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={switchFacing}
            disabled={!ready || capturing}
            aria-label={facing === 'environment' ? 'Use front camera' : 'Use rear camera'}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 disabled:opacity-40"
          >
            <SwitchCamera className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
