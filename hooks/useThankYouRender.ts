"use client"

import { useCallback, useState } from "react"
import toast from "react-hot-toast"
import { FPS, HEIGHT, WIDTH, getThankYouDuration } from "@/remotion/ThankYou/constants"
import type { ThankYouExport } from "@/lib/thankYouRanking"

export type RenderState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "rendering"; progress: number }
  | { status: "done"; url: string }
  | { status: "error"; message: string }

/**
 * Shared client-side render engine for the thank-you video.
 *
 * Used both by the /thank-you studio (JSON upload flow) and by the one-click
 * "Render" button on a profile's tips page. Remotion + the composition are
 * dynamically imported inside `render()` so the heavy bundle only loads when
 * the user actually renders — keeps the profile page lean.
 */
export const useThankYouRender = () => {
  const [state, setState] = useState<RenderState>({ status: "idle" })

  const render = useCallback(async (payload: ThankYouExport) => {
    if (payload.ranking.length === 0) {
      toast.error("No supporters to thank yet 💛")
      return
    }
    setState({ status: "checking" })
    try {
      const [{ canRenderMediaOnWeb, renderMediaOnWeb }, { ThankYouVideo }] =
        await Promise.all([
          import("@remotion/web-renderer"),
          import("@/remotion/ThankYou/ThankYouVideo"),
        ])

      const check = await canRenderMediaOnWeb({ width: WIDTH, height: HEIGHT })
      if (!check.canRender) {
        const msg =
          check.issues.find((i) => i.severity === "error")?.message ??
          "Your browser can't render video. Try Chrome or Edge on desktop."
        setState({ status: "error", message: msg })
        return
      }

      const inputProps = {
        recipientHandle: payload.recipient.handle,
        recipientName: payload.recipient.name,
        ranking: payload.ranking,
      }
      const durationInFrames = getThankYouDuration(payload.ranking.length)

      setState({ status: "rendering", progress: 0 })
      const result = await renderMediaOnWeb({
        composition: {
          id: "ThankYouVideo",
          component: ThankYouVideo,
          width: WIDTH,
          height: HEIGHT,
          fps: FPS,
          durationInFrames,
          defaultProps: inputProps,
        },
        inputProps,
        onProgress: ({ progress }) =>
          setState({ status: "rendering", progress }),
      })

      const blob = await result.getBlob()
      const url = URL.createObjectURL(blob)
      setState({ status: "done", url })
      const a = document.createElement("a")
      a.href = url
      a.download = `${payload.recipient.handle}-thank-you.mp4`
      document.body.appendChild(a)
      a.click()
      a.remove()
      toast.success("Video rendered & downloaded 🎬")
    } catch (e) {
      setState({
        status: "error",
        message:
          e instanceof Error ? e.message : "Rendering failed unexpectedly",
      })
    }
  }, [])

  const reset = useCallback(() => setState({ status: "idle" }), [])

  return { state, render, reset }
}
