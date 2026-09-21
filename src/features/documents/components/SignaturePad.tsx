import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'

interface SignaturePadProps {
  className?: string
  disabled?: boolean
  onStrokeEnd?: () => void
}

export function SignaturePad({ className, disabled = false, onStrokeEnd }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      const snapshot = canvas.toDataURL()
      canvas.width = Math.max(1, Math.floor(rect.width * ratio))
      canvas.height = Math.max(1, Math.floor(rect.height * ratio))
      const context = canvas.getContext('2d')
      if (!context) {
        return
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.strokeStyle = '#121a14'
      context.lineWidth = 2.25

      const image = new Image()
      image.onload = () => {
        context.drawImage(image, 0, 0, rect.width, rect.height)
      }
      image.src = snapshot
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) {
      return null
    }
    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  const startStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) {
      return
    }
    const point = pointFromEvent(event)
    if (!point) {
      return
    }
    drawing.current = true
    lastPoint.current = point
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || disabled) {
      return
    }
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    const point = pointFromEvent(event)
    const previous = lastPoint.current
    if (!canvas || !context || !point || !previous) {
      return
    }
    context.beginPath()
    context.moveTo(previous.x, previous.y)
    context.lineTo(point.x, point.y)
    context.stroke()
    lastPoint.current = point
  }

  const endStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) {
      return
    }
    drawing.current = false
    lastPoint.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // ignore
    }
    onStrokeEnd?.()
  }

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        'h-44 w-full touch-none rounded-md border border-border bg-[linear-gradient(180deg,#fbfcfb_0%,#f3f5f3_100%)]',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-crosshair',
        className,
      )}
      onPointerDown={startStroke}
      onPointerMove={moveStroke}
      onPointerUp={endStroke}
      onPointerCancel={endStroke}
      aria-label="Signature pad"
    />
  )
}

export function clearSignaturePad(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d')
  if (!context) {
    return
  }
  const ratio = window.devicePixelRatio || 1
  context.save()
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.restore()
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.strokeStyle = '#121a14'
  context.lineWidth = 2.25
}

export function getSignaturePadCanvas(
  container: HTMLElement | null,
): HTMLCanvasElement | null {
  return container?.querySelector('canvas') ?? null
}
