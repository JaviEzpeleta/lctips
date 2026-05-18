"use client"

import { useEffect, useState, type ReactNode } from "react"
import {
  AbsoluteFill,
  Img,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  isHtmlInCanvasSupported,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion"
import { Audio } from "@remotion/media"
import { ShaderEffect } from "./vfx/ShaderEffect"
import { valentineVHS } from "./vfx/valentineVHS"

// ── Load the silliest, cutest fonts we can find (cursi mode) ──
const fontHandle = delayRender("Loading cursi fonts 🎀")
if (typeof document !== "undefined") {
  const link = document.createElement("link")
  link.rel = "stylesheet"
  link.href =
    "https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Pacifico&family=Gloria+Hallelujah&display=swap"
  document.head.appendChild(link)
  const docFonts = (document as unknown as { fonts: FontFaceSet }).fonts
  Promise.all([
    docFonts.load('800 100px "Baloo 2"'),
    docFonts.load('400 100px "Pacifico"'),
    docFonts.load('400 100px "Gloria Hallelujah"'),
  ])
    .then(() => continueRender(fontHandle))
    .catch(() => continueRender(fontHandle))
} else {
  continueRender(fontHandle)
}
import {
  FPS,
  INTRO_FRAMES,
  OUTRO_FRAMES,
  PER_PERSON_FRAMES,
  ThankYouVideoProps,
  getThankYouDuration,
  messageForRank,
} from "./constants"
import type { ThankYouRankingEntry } from "@/lib/thankYouRanking"

// Chunky rounded kawaii (names, numbers, badges)
const ROUND = '"Baloo 2", "SF Pro Rounded", ui-rounded, system-ui, sans-serif'
// Flowing cheesy script (emotional headings & messages)
const SCRIPT = '"Pacifico", "Baloo 2", cursive'
// Wobbly handwritten (little captions)
const HAND = '"Gloria Hallelujah", "Baloo 2", cursive'

const money = (n: number) =>
  n >= 10000
    ? `$${(n / 1000).toFixed(1)}k`
    : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const hashHue = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360
  return h
}

const CUTE = [
  "💛", "✨", "💖", "🌸", "🤍", "💫", "💕", "💗", "🥰", "🌷",
  "💞", "🎀", "🦄", "🌈", "💝", "🧁", "🍓", "⭐️", "😻", "💘",
  "🌟", "💐", "🫶", "💓", "🍭", "🌺", "💟", "🐰",
]

// Big slow back layer + dense fast front layer = parallax cursi storm.
const FLOATERS = Array.from({ length: 46 }, (_, i) => {
  const back = i % 3 === 0
  return {
    x: (i * 137.508) % 100,
    delay: (i * 53) % 200,
    size: back ? 120 + ((i * 37) % 160) : 56 + ((i * 29) % 90),
    speed: (back ? 0.28 : 0.7) + ((i * 7) % 10) / 14,
    spin: ((i % 2 === 0 ? 1 : -1) * (0.4 + ((i * 11) % 10) / 8)),
    swing: 30 + ((i * 13) % 60),
    opacity: back ? 0.28 : 0.62,
    glyph: CUTE[i % CUTE.length],
  }
})

const TWINKLES = Array.from({ length: 22 }, (_, i) => ({
  x: (i * 73.31) % 100,
  y: (i * 41.7) % 100,
  size: 22 + ((i * 19) % 40),
  phase: (i * 0.91) % (Math.PI * 2),
  rate: 5 + (i % 5),
  glyph: ["✨", "⭐️", "🌟", "💫"][i % 4],
}))

const AnimatedBackground = () => {
  const frame = useCurrentFrame()
  const { height } = useVideoConfig()
  const drift = Math.sin(frame / 70) * 9
  const breathe = 1 + Math.sin(frame / 38) * 0.025

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(130% 100% at ${50 + drift}% ${30 + drift}%, #fff0f7 0%, #ffd9ec 20%, #ffc9e8 40%, #f0d2ff 62%, #d6e2ff 82%, #cdecff 100%)`,
        transform: `scale(${breathe})`,
      }}
    >
      {/* twinkly fixed sparkles that pulse in place */}
      {TWINKLES.map((t, i) => {
        const tw = (Math.sin(frame / t.rate + t.phase) + 1) / 2
        return (
          <span
            key={`tw-${i}`}
            style={{
              position: "absolute",
              left: `${t.x}%`,
              top: `${t.y}%`,
              fontSize: t.size,
              opacity: 0.15 + tw * 0.7,
              transform: `scale(${0.6 + tw * 0.8}) rotate(${tw * 90}deg)`,
              filter: "drop-shadow(0 0 10px rgba(255,210,235,0.7))",
            }}
          >
            {t.glyph}
          </span>
        )
      })}

      {/* the big flying cursi storm 🎀 */}
      {FLOATERS.map((h, i) => {
        const span = height + h.size + 320
        const y = height + 160 - ((frame * h.speed * 10 + h.delay * 13) % span)
        const wob = Math.sin((frame + h.delay) / 20) * h.swing
        return (
          <span
            key={`fl-${i}`}
            style={{
              position: "absolute",
              left: `${h.x}%`,
              top: y,
              transform: `translateX(${wob}px) rotate(${wob * 0.6 + frame * h.spin}deg)`,
              fontSize: h.size,
              opacity: h.opacity,
              filter: "drop-shadow(0 4px 12px rgba(255,140,195,0.4))",
            }}
          >
            {h.glyph}
          </span>
        )
      })}

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(58% 42% at 50% 48%, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0) 72%)",
        }}
      />
    </AbsoluteFill>
  )
}

const Avatar = ({
  picture,
  name,
  size,
  ring,
}: {
  picture: string | null
  name: string
  size: number
  ring: string
}) => {
  const [failed, setFailed] = useState(false)
  const hue = hashHue(name)
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        background: `linear-gradient(135deg, hsl(${hue} 85% 80%), hsl(${(hue + 60) % 360} 85% 78%))`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 0 0 5px ${ring}, 0 18px 50px rgba(214,120,180,0.45)`,
      }}
    >
        {picture && !failed ? (
          <Img
            src={picture}
            onError={() => setFailed(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span
            style={{
              fontSize: size * 0.42,
              fontWeight: 800,
              color: "#fff",
              fontFamily: ROUND,
            }}
          >
            {name.trim().charAt(0).toUpperCase() || "♥"}
          </span>
        )}
    </div>
  )
}

const Intro = ({ recipientHandle }: { recipientHandle: string }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const pop = spring({ frame, fps, config: { damping: 11, mass: 0.7 } })
  const sub = interpolate(frame, [14, 34], [0, 1], { extrapolateRight: "clamp" })
  const wiggle = Math.sin(frame / 7) * 4
  const beat = 1 + Math.sin(frame / 6) * 0.04
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: 80,
        fontFamily: ROUND,
      }}
    >
      <div
        style={{
          fontSize: 170,
          marginBottom: 4,
          transform: `scale(${0.4 + pop * 0.6}) rotate(${wiggle}deg)`,
          filter: "drop-shadow(0 10px 20px rgba(255,140,200,0.45))",
        }}
      >
        💌✨
      </div>
      <div
        style={{
          fontFamily: SCRIPT,
          fontSize: 188,
          color: "#ff3d8b",
          transform: `scale(${(0.6 + pop * 0.4) * beat}) rotate(${wiggle * 0.4}deg)`,
          textShadow:
            "0 5px 0 #fff, 0 0 28px rgba(255,140,200,0.7), 0 18px 40px rgba(214,51,108,0.3)",
          backgroundImage:
            "linear-gradient(135deg, #ff6ec7 0%, #c026d3 45%, #7c3aed 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Thank youuu~
      </div>
      <div
        style={{
          fontFamily: HAND,
          marginTop: 36,
          fontSize: 50,
          color: "#a3478f",
          opacity: sub,
          transform: `translateY(${(1 - sub) * 22}px)`,
        }}
      >
        to everyone who tipped 🥹💕
      </div>
      <div
        style={{
          marginTop: 14,
          fontSize: 72,
          fontWeight: 800,
          color: "#fff",
          background: "linear-gradient(135deg, #ff85c2, #b06aff)",
          padding: "10px 44px",
          borderRadius: 999,
          boxShadow: "0 16px 34px rgba(192,38,211,0.4)",
          opacity: sub,
          transform: `scale(${0.85 + sub * 0.15})`,
        }}
      >
        @{recipientHandle} 💖
      </div>
    </AbsoluteFill>
  )
}

const PersonScene = ({ entry }: { entry: ThankYouRankingEntry }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const isTop = entry.rank === 1

  const enter = spring({ frame, fps, config: { damping: 12, mass: 0.8 } })
  const avatarPop = spring({
    frame: frame - 4,
    fps,
    config: { damping: 10, mass: 0.7 },
  })
  const colIn = spring({
    frame: frame - 6,
    fps,
    config: { damping: 14, mass: 0.9 },
  })
  const countT = interpolate(frame, [16, 46], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const eased = 1 - Math.pow(1 - countT, 3)
  const shown = entry.total * eased
  const msgIn = interpolate(frame, [52, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const float = Math.sin(frame / 16) * 12
  const wiggle = Math.sin(frame / 9) * 3
  const heartBeat = 1 + Math.sin(frame / 5) * 0.05
  const numPulse = countT < 1 ? 1 + Math.sin(frame / 2.2) * 0.035 : 1

  const avatarSize = isTop ? 560 : 480
  const accent = isTop ? "#c026d3" : "#d6336c"

  return (
    <AbsoluteFill
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: "0 110px",
        gap: 90,
        fontFamily: ROUND,
        opacity: enter,
      }}
    >
      {/* ── Left column: avatar + rank ribbon ── */}
      <div
        style={{
          flex: "0 0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `translateX(${(1 - colIn) * -70}px)`,
        }}
      >
        {/* giant ghost rank numeral behind the avatar */}
        <div
          style={{
            position: "absolute",
            fontFamily: SCRIPT,
            fontSize: 660,
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1,
            transform: `translateY(-30px) rotate(${wiggle * 1.5}deg)`,
            textShadow: "0 0 40px rgba(255,180,220,0.6)",
            userSelect: "none",
            pointerEvents: "none",
          }}
        >
          {entry.rank}
        </div>
        <div
          style={{
            transform: `scale(${(0.5 + avatarPop * 0.5) * heartBeat}) translateY(${float}px) rotate(${wiggle}deg)`,
          }}
        >
          <Avatar
            picture={entry.picture}
            name={entry.name}
            size={avatarSize}
            ring={
              isTop
                ? "conic-gradient(from 0deg, #ffd56b, #ff8fc7, #b388ff, #ffd56b)"
                : "linear-gradient(135deg, #ff9ecf, #b8a4ff)"
            }
          />
        </div>
        <div
          style={{
            marginTop: -28,
            fontFamily: ROUND,
            fontSize: isTop ? 54 : 44,
            fontWeight: 800,
            color: "#fff",
            background: isTop
              ? "linear-gradient(135deg, #ffb302, #ff5fa2, #c026d3)"
              : "linear-gradient(135deg, #ff6ec7, #a855f7)",
            padding: isTop ? "14px 44px" : "11px 34px",
            borderRadius: 999,
            border: "4px solid rgba(255,255,255,0.85)",
            boxShadow:
              "0 16px 34px rgba(192,38,211,0.45), 0 0 24px rgba(255,160,210,0.6)",
            transform: `translateY(${(1 - enter) * 24}px) rotate(${-wiggle}deg) scale(${heartBeat})`,
            whiteSpace: "nowrap",
          }}
        >
          {isTop
            ? "👑 #1 Top supporter 💖"
            : `🌟 #${entry.rank} supporter 🌟`}
        </div>
      </div>

      {/* ── Right column: name + amount + message ── */}
      <div
        style={{
          flex: "1 1 0",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          minWidth: 0,
          transform: `translateX(${(1 - colIn) * 70}px)`,
        }}
      >
        <div
          style={{
            fontFamily: HAND,
            fontSize: 42,
            color: accent,
            opacity: 0.9,
            marginBottom: 6,
            transform: `rotate(${-wiggle * 0.5}deg)`,
          }}
        >
          {isTop ? "sending alllll my love to ♡" : "big squishy thanks to ♡"}
        </div>

        <div
          style={{
            fontFamily: ROUND,
            fontSize: isTop ? 104 : 90,
            fontWeight: 800,
            lineHeight: 1.04,
            backgroundImage:
              "linear-gradient(135deg, #ff5fa2 0%, #c026d3 50%, #7c3aed 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "0 6px 18px rgba(214,51,108,0.18)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            transform: `scale(${0.9 + enter * 0.1})`,
          }}
        >
          {entry.name} 💕
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 18,
            marginTop: 26,
            transform: `scale(${numPulse})`,
            transformOrigin: "left center",
          }}
        >
          <span
            style={{
              fontFamily: ROUND,
              fontSize: isTop ? 176 : 150,
              fontWeight: 800,
              color: "#16a34a",
              lineHeight: 1,
              textShadow:
                "0 5px 0 #fff, 0 0 22px rgba(120,230,160,0.6), 0 16px 32px rgba(22,163,74,0.22)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {money(shown)}
          </span>
          <span
            style={{
              fontFamily: ROUND,
              fontSize: 56,
              fontWeight: 800,
              color: "#15803d",
            }}
          >
            GHO 🥹
          </span>
        </div>

        <div
          style={{
            fontFamily: HAND,
            fontSize: 40,
            color: "#a3478f",
            marginTop: 12,
          }}
        >
          across {entry.count} tippy tip{entry.count === 1 ? "" : "s"} 💝✨
        </div>

        <div
          style={{
            fontFamily: SCRIPT,
            marginTop: 40,
            fontSize: isTop ? 84 : 70,
            color: "#ff3d8b",
            textShadow: "0 4px 0 #fff, 0 0 22px rgba(255,150,200,0.65)",
            opacity: msgIn,
            transform: `translateY(${(1 - msgIn) * 18}px) scale(${0.85 + msgIn * 0.15}) rotate(${wiggle * 0.5}deg)`,
          }}
        >
          {messageForRank(entry.rank)}
        </div>
      </div>
    </AbsoluteFill>
  )
}

const Outro = ({ recipientHandle }: { recipientHandle: string }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const pop = spring({ frame, fps, config: { damping: 12, mass: 0.8 } })
  const wiggle = Math.sin(frame / 7) * 5
  const beat = 1 + Math.sin(frame / 5) * 0.05
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: 80,
        fontFamily: ROUND,
      }}
    >
      <div
        style={{
          fontSize: 200,
          transform: `scale(${(0.5 + pop * 0.5) * beat}) rotate(${wiggle}deg)`,
          filter: "drop-shadow(0 12px 24px rgba(255,140,200,0.5))",
        }}
      >
        🫶💞
      </div>
      <div
        style={{
          fontFamily: SCRIPT,
          marginTop: 18,
          fontSize: 168,
          transform: `scale(${0.7 + pop * 0.3}) rotate(${wiggle * 0.3}deg)`,
          backgroundImage:
            "linear-gradient(135deg, #ff6ec7 0%, #c026d3 50%, #7c3aed 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          textShadow: "0 5px 0 #fff, 0 0 30px rgba(255,140,200,0.7)",
        }}
      >
        with all my love~
      </div>
      <div
        style={{
          marginTop: 22,
          fontSize: 76,
          fontWeight: 800,
          color: "#fff",
          background: "linear-gradient(135deg, #ff85c2, #b06aff)",
          padding: "12px 50px",
          borderRadius: 999,
          boxShadow: "0 18px 38px rgba(192,38,211,0.45)",
          opacity: pop,
          transform: `scale(${0.85 + pop * 0.15})`,
        }}
      >
        @{recipientHandle} 💛✨
      </div>
    </AbsoluteFill>
  )
}

// "VHS de San Valentín" — tuned marked-but-cute. Tweak here to taste.
const VFX = {
  chroma: 1.1,
  scan: 0.55,
  grain: 0.7,
  dots: 0.36,
  dotSize: 7,
  curve: 0.1,
  tint: 0.55,
}

// Wraps the visuals in the Valentine-VHS shader. Falls back to a raw
// render when HtmlInCanvas isn't available (some browsers / the web
// renderer) so the Player and the export never crash — they just lose
// the filter instead. The mount gate keeps SSR == first client paint.
const Shaded = ({ children }: { children: ReactNode }) => {
  const { width, height } = useVideoConfig()
  const [shaded, setShaded] = useState(false)
  useEffect(() => {
    setShaded(isHtmlInCanvasSupported())
  }, [])
  if (!shaded) return <>{children}</>
  return (
    <ShaderEffect
      effect={valentineVHS}
      params={VFX}
      width={width}
      height={height}
    >
      {children}
    </ShaderEffect>
  )
}

export const ThankYouVideo = ({
  recipientHandle,
  ranking,
}: ThankYouVideoProps) => {
  const total = getThankYouDuration(ranking.length)
  const musicFade = 18
  const outroFrom = INTRO_FRAMES + ranking.length * PER_PERSON_FRAMES

  return (
    <AbsoluteFill style={{ backgroundColor: "#ffd6e8" }}>
      {/* ── Audio track — kept OUTSIDE the shader. HtmlInCanvas captures
            visuals only; <Audio> must live in the plain tree to be mixed
            into the rendered/playing soundtrack. ── */}
      <Audio
        src={staticFile("thank-you/music.wav")}
        volume={(f) =>
          interpolate(
            f,
            [0, 24, total - musicFade, total],
            [0, 0.55, 0.55, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          )
        }
      />

      <Sequence durationInFrames={INTRO_FRAMES}>
        <Audio src={staticFile("thank-you/sparkle.wav")} volume={0.7} />
        <Sequence from={6}>
          <Audio src={staticFile("thank-you/twinkle.wav")} volume={0.75} />
        </Sequence>
        <Sequence from={20}>
          <Audio src={staticFile("thank-you/kiss.wav")} volume={0.85} />
        </Sequence>
      </Sequence>

      {ranking.map((entry, i) => (
        <Sequence
          key={`audio-${entry.address}`}
          from={INTRO_FRAMES + i * PER_PERSON_FRAMES}
          durationInFrames={PER_PERSON_FRAMES}
        >
          <Audio src={staticFile("thank-you/sparkle.wav")} volume={0.6} />
          <Sequence from={6}>
            <Audio src={staticFile("thank-you/twinkle.wav")} volume={0.6} />
          </Sequence>
          <Sequence from={16}>
            <Audio src={staticFile("thank-you/pop.wav")} volume={0.85} />
          </Sequence>
          <Sequence from={52}>
            <Audio src={staticFile("thank-you/kiss.wav")} volume={0.8} />
          </Sequence>
        </Sequence>
      ))}

      <Sequence from={outroFrom} durationInFrames={OUTRO_FRAMES}>
        <Audio src={staticFile("thank-you/sparkle.wav")} volume={0.7} />
        <Sequence from={4}>
          <Audio src={staticFile("thank-you/twinkle.wav")} volume={0.8} />
        </Sequence>
        <Sequence from={22}>
          <Audio src={staticFile("thank-you/kiss.wav")} volume={0.9} />
        </Sequence>
      </Sequence>

      {/* ── Visuals — wrapped in the Valentine-VHS shader ── */}
      <Shaded>
        <AbsoluteFill style={{ backgroundColor: "#ffd6e8" }}>
          <AnimatedBackground />

          <Sequence durationInFrames={INTRO_FRAMES}>
            <Intro recipientHandle={recipientHandle} />
          </Sequence>

          {ranking.map((entry, i) => (
            <Sequence
              key={entry.address}
              from={INTRO_FRAMES + i * PER_PERSON_FRAMES}
              durationInFrames={PER_PERSON_FRAMES}
            >
              <PersonScene entry={entry} />
            </Sequence>
          ))}

          <Sequence from={outroFrom} durationInFrames={OUTRO_FRAMES}>
            <Outro recipientHandle={recipientHandle} />
          </Sequence>
        </AbsoluteFill>
      </Shaded>
    </AbsoluteFill>
  )
}

export { FPS, WIDTH, HEIGHT } from "./constants"
