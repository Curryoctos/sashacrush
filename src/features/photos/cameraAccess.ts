export type CameraFacing = 'environment' | 'user'

export async function openCameraStream(facing: CameraFacing): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new DOMException('Camera API is unavailable.', 'NotFoundError')
  }

  const attempts: MediaStreamConstraints[] = [
    cameraConstraints(facing),
    { audio: false, video: { facingMode: facing } },
    { audio: false, video: true },
  ]

  let lastError: unknown
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (error) {
      lastError = error
      const name = error instanceof DOMException ? error.name : ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        throw error
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Could not open the camera.')
}

export function cameraConstraints(facing: CameraFacing): MediaStreamConstraints {
  return {
    audio: false,
    video: {
      facingMode: { ideal: facing },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  }
}

export function cameraErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : ''

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera permission was denied. Allow camera access, or upload a photo from your library.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera was found on this device. Upload a photo from your library instead.'
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'The camera is in use by another app. Close it and try again.'
  }
  if (name === 'OverconstrainedError') {
    return 'This camera facing is not available. Try the other camera or upload from your library.'
  }

  return 'Could not open the camera. Upload a photo from your library instead.'
}

export function stopMediaStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((track) => track.stop())
}
