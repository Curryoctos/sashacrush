
function createImageData(width: number, height: number, data?: Uint8ClampedArray): ImageData {
  if (typeof ImageData !== 'undefined') {
    const image = new ImageData(width, height)
    if (data) {
      image.data.set(data)
    }
    return image
  }
  const pixels = data ?? new Uint8ClampedArray(width * height * 4)
  return { data: pixels, width, height, colorSpace: 'srgb' } as ImageData
}

/** Near-white → transparent so scanned signatures sit cleanly on the PDF. */
export function removeNearWhiteBackground(
  imageData: ImageData,
  threshold = 242,
): ImageData {
  const { data, width, height } = imageData
  const next = createImageData(width, height)
  next.data.set(data)

  for (let index = 0; index < next.data.length; index += 4) {
    const red = next.data[index] ?? 0
    const green = next.data[index + 1] ?? 0
    const blue = next.data[index + 2] ?? 0
    const alpha = next.data[index + 3] ?? 0

    if (alpha === 0) {
      continue
    }

    const isPaper =
      red >= threshold &&
      green >= threshold &&
      blue >= threshold &&
      Math.max(red, green, blue) - Math.min(red, green, blue) <= 18

    if (isPaper) {
      next.data[index + 3] = 0
    }
  }

  return next
}

export function trimTransparentEdges(imageData: ImageData, padding = 8): ImageData {
  const { data, width, height } = imageData
  let top = height
  let left = width
  let right = 0
  let bottom = 0
  let found = false

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3] ?? 0
      if (alpha < 16) {
        continue
      }
      found = true
      top = Math.min(top, y)
      left = Math.min(left, x)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }

  if (!found) {
    return createImageData(1, 1)
  }

  const cropLeft = Math.max(0, left - padding)
  const cropTop = Math.max(0, top - padding)
  const cropRight = Math.min(width - 1, right + padding)
  const cropBottom = Math.min(height - 1, bottom + padding)
  const cropWidth = cropRight - cropLeft + 1
  const cropHeight = cropBottom - cropTop + 1
  const cropped = createImageData(cropWidth, cropHeight)

  for (let y = 0; y < cropHeight; y += 1) {
    for (let x = 0; x < cropWidth; x += 1) {
      const source = ((cropTop + y) * width + (cropLeft + x)) * 4
      const target = (y * cropWidth + x) * 4
      cropped.data[target] = data[source] ?? 0
      cropped.data[target + 1] = data[source + 1] ?? 0
      cropped.data[target + 2] = data[source + 2] ?? 0
      cropped.data[target + 3] = data[source + 3] ?? 0
    }
  }

  return cropped
}

export async function loadImageElement(source: Blob | string): Promise<HTMLImageElement> {
  const url = typeof source === 'string' ? source : URL.createObjectURL(source)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('Could not read signature image.'))
      element.src = url
    })
    return image
  } finally {
    if (typeof source !== 'string') {
      URL.revokeObjectURL(url)
    }
  }
}

export async function processSignatureUpload(file: Blob): Promise<{
  pngBytes: Uint8Array
  previewUrl: string
}> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Upload a PNG or JPG of your handwritten signature.')
  }

  const image = await loadImageElement(file)
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth || image.width
  canvas.height = image.naturalHeight || image.height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Could not prepare signature image.')
  }

  context.drawImage(image, 0, 0)
  const cleaned = removeNearWhiteBackground(
    context.getImageData(0, 0, canvas.width, canvas.height),
  )
  const trimmed = trimTransparentEdges(cleaned)
  canvas.width = Math.max(1, trimmed.width)
  canvas.height = Math.max(1, trimmed.height)
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.putImageData(trimmed, 0, 0)

  const pngBytes = await canvasToPngBytes(canvas)
  const previewUrl = URL.createObjectURL(new Blob([new Uint8Array(pngBytes)], { type: 'image/png' }))
  return { pngBytes, previewUrl }
}

export async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (!value) {
        reject(new Error('Could not export signature.'))
        return
      }
      resolve(value)
    }, 'image/png')
  })
  return new Uint8Array(await blob.arrayBuffer())
}

export function isBlankCanvas(canvas: HTMLCanvasElement): boolean {
  const context = canvas.getContext('2d')
  if (!context) {
    return true
  }
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
  for (let index = 3; index < data.length; index += 4) {
    if ((data[index] ?? 0) > 8) {
      return false
    }
  }
  return true
}
