"use client"

import type { ReactNode } from "react"
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion"

/**
 * "VHS de San Valentín" — a frame-driven retro grade that needs NO
 * HtmlInCanvas / Chrome flags. It's plain SVG <filter> + CSS overlays,
 * so it renders identically in the <Player> and in renderMediaOnWeb.
 *
 * Layering (bottom → top):
 *   1. children, run through an SVG filter:
 *        tape warp (displacement) → RGB split (chromatic aberration)
 *        → pink/magenta grade → film grain
 *   2. CSS texture overlays (crisp, unfiltered): halftone dots,
 *      scanlines, a rolling bright bar, and a rose vignette.
 *
 * Everything animates off `useCurrentFrame()` — never CSS @keyframes —
 * so the export is deterministic.
 */

const FILTER_ID = "ty-vhs-filter"

export const VhsLook = ({
  enabled = true,
  children,
}: {
  enabled?: boolean
  children: ReactNode
}) => {
  const frame = useCurrentFrame()
  const { height } = useVideoConfig()

  if (!enabled) return <>{children}</>

  // ── tape head wobble / horizontal jitter (cranked) ──
  const jitter =
    Math.sin(frame / 3) * 3.4 + Math.sin(frame / 0.7) * 1.6
  // more frequent + bigger vertical roll (every ~3s a fat slip)
  const rolling = frame % 90 < 8
  const rollY = rolling ? ((frame % 90) / 8) * 34 : 0

  // ── chromatic aberration amount (px), breathes + spikes hard on rolls ──
  const ca = 5.5 + Math.sin(frame / 4) * 3.8 + (rolling ? 9 : 0)
  // ── tape warp displacement scale ──
  const warp = 6 + Math.sin(frame / 9) * 4.5 + (rolling ? 16 : 0)
  // boiling grain — new noise field every frame
  const grainSeed = frame % 211

  // rolling bright "tracking" bar position
  const barSpan = height + 320
  const barY = ((frame * 6) % barSpan) - 260

  return (
    <AbsoluteFill style={{ backgroundColor: "#ffd6e8" }}>
      {/* 0-size SVG just to host the filter definition */}
      <svg
        width="0"
        height="0"
        style={{ position: "absolute" }}
        aria-hidden
      >
        <defs>
          <filter
            id={FILTER_ID}
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
            colorInterpolationFilters="sRGB"
          >
            {/* tape warp — mostly horizontal banding */}
            <feTurbulence
              type="turbulence"
              baseFrequency="0.0012 0.018"
              numOctaves={1}
              seed={7}
              result="warpNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="warpNoise"
              scale={warp}
              xChannelSelector="R"
              yChannelSelector="G"
              result="warped"
            />

            {/* chromatic aberration: split R / G / B and screen them back */}
            <feOffset in="warped" dx={ca} dy="0" result="rShift" />
            <feColorMatrix
              in="rShift"
              type="matrix"
              values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="rOnly"
            />
            <feColorMatrix
              in="warped"
              type="matrix"
              values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="gOnly"
            />
            <feOffset in="warped" dx={-ca} dy="0" result="bShift" />
            <feColorMatrix
              in="bShift"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
              result="bOnly"
            />
            <feBlend
              mode="screen"
              in="rOnly"
              in2="gOnly"
              result="rg"
            />
            <feBlend
              mode="screen"
              in="rg"
              in2="bOnly"
              result="split"
            />

            {/* pink / magenta valentine grade */}
            <feColorMatrix
              in="split"
              type="matrix"
              values="1.06 0.02 0.03 0 0.02
                      0.01 0.95 0.02 0 0.00
                      0.04 0.02 1.05 0 0.03
                      0    0    0    1 0"
              result="graded"
            />

            {/* boiling film grain, blended on top — heavy VCR snow */}
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves={3}
              seed={grainSeed}
              result="grainNoise"
            />
            <feColorMatrix
              in="grainNoise"
              type="matrix"
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0.42 0"
              result="grain"
            />
            <feComposite
              in="grain"
              in2="graded"
              operator="in"
              result="grainClipped"
            />
            <feBlend
              mode="screen"
              in="graded"
              in2="grainClipped"
            />
          </filter>
        </defs>
      </svg>

      {/* the actual content, run through the filter */}
      <AbsoluteFill
        style={{
          filter: `url(#${FILTER_ID}) saturate(1.18) contrast(1.07) brightness(1.02)`,
          transform: `translate(${jitter.toFixed(2)}px, ${rollY.toFixed(
            2
          )}px)`,
        }}
      >
        {children}
      </AbsoluteFill>

      {/* ── crisp texture overlays (not filtered) ── */}

      {/* halftone print dots */}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          mixBlendMode: "multiply",
          opacity: 0.5,
          backgroundImage:
            "radial-gradient(circle at 50% 50%, rgba(110,20,70,0.55) 0 22%, rgba(110,20,70,0) 60%)",
          backgroundSize: "7px 7px",
        }}
      />

      {/* scanlines (drift 1px so they shimmer) */}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          mixBlendMode: "multiply",
          opacity: 0.78,
          backgroundImage:
            "repeating-linear-gradient(to bottom, rgba(20,0,15,0.6) 0 1px, rgba(255,255,255,0) 1px 4px)",
          transform: `translateY(${frame % 4}px)`,
        }}
      />

      {/* rolling bright tracking bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: barY,
          height: 180,
          pointerEvents: "none",
          mixBlendMode: "screen",
          opacity: 0.4,
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,225,240,0.95) 45%, rgba(255,255,255,0) 100%)",
        }}
      />

      {/* rose vignette + tube edge — deep, starts much earlier */}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background:
            "radial-gradient(115% 95% at 50% 50%, rgba(0,0,0,0) 30%, rgba(55,0,28,0.45) 68%, rgba(35,0,18,0.92) 100%)",
        }}
      />
    </AbsoluteFill>
  )
}
