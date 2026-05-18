"use client"

import { useEffect, useRef } from "react"

/**
 * Drives a `requestAnimationFrame` loop that calls `canvas.requestPaint()`
 * each tick. Required to keep an `<HtmlInCanvas>` redrawing while children
 * (springs, sequences, floating emoji) are animating — the browser's native
 * `paint` event only fires on DOM/style changes, not on every internal tick.
 */
export const usePaintLoop = () => {
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      ;(
        ref.current as unknown as { requestPaint?: () => void } | null
      )?.requestPaint?.()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return ref
}
