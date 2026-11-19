import { describe, expect, it } from 'vitest'
import {
  removeNearWhiteBackground,
  trimTransparentEdges,
} from '@/features/documents/signatureImage'

class TestImageData {
  data: Uint8ClampedArray
  width: number
  height: number

  constructor(dataOrWidth: Uint8ClampedArray | number, width?: number, height?: number) {
    if (typeof dataOrWidth === 'number') {
      this.width = dataOrWidth
      this.height = width ?? 0
      this.data = new Uint8ClampedArray(this.width * this.height * 4)
      return
    }
    this.data = dataOrWidth
    this.width = width ?? 0
    this.height = height ?? 0
  }
}

;(globalThis as { ImageData: typeof TestImageData }).ImageData = TestImageData

function makeImageData(
  width: number,
  height: number,
  fill: [number, number, number, number],
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let index = 0; index < data.length; index += 4) {
    data[index] = fill[0]
    data[index + 1] = fill[1]
    data[index + 2] = fill[2]
    data[index + 3] = fill[3]
  }
  return new ImageData(data, width, height)
}

describe('signature background removal', () => {
  it('makes near-white paper transparent while keeping ink', () => {
    const image = makeImageData(4, 1, [255, 255, 255, 255])
    image.data[0] = 20
    image.data[1] = 20
    image.data[2] = 20
    image.data[3] = 255

    const cleaned = removeNearWhiteBackground(image)
    expect(cleaned.data[3]).toBe(255)
    expect(cleaned.data[7]).toBe(0)
  })

  it('trims empty edges around the ink', () => {
    const image = makeImageData(6, 6, [0, 0, 0, 0])
    const center = (3 * 6 + 3) * 4
    image.data[center] = 10
    image.data[center + 1] = 10
    image.data[center + 2] = 10
    image.data[center + 3] = 255

    const trimmed = trimTransparentEdges(image, 1)
    expect(trimmed.width).toBeLessThan(6)
    expect(trimmed.height).toBeLessThan(6)
    expect([...trimmed.data].some((value, index) => index % 4 === 3 && value > 0)).toBe(
      true,
    )
  })
})
