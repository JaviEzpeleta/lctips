"use client"

import { useState } from "react"
import {
  AbsoluteFill,
  Img,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion"
import { Audio } from "@remotion/media"
import { VhsLook } from "./VhsLook"

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
  ThankYouVideoProps,
  WIDTH,
  beatFrame,
  beatOffset,
  getThankYouDuration,
  introEndFrame,
  messageForRank,
  outroStartFrame,
  personStartFrame,
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

// ── Scene layout (kept in sync with PersonScene styles) ──
const SCENE_PAD_X = 90
const SCENE_GAP = 70

// Rough per-glyph em widths for Baloo 2 800 — enough to shrink-to-fit so the
// amount + "GHO" never spill past the right column for any tip total.
const emFor = (ch: string) =>
  ch === "." ? 0.3 : ch === "," ? 0.32 : ch === "k" ? 0.56 : 0.6
const textEm = (s: string) =>
  [...s].reduce((w, ch) => w + emFor(ch), 0)

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
  // Number counts up across beats 1→3 (pop SFX punches the value on beat 2);
  // the message slides fully in by beat 5, exactly when the kiss SFX hits.
  const countT = interpolate(frame, [beatOffset(1), beatOffset(3)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const eased = 1 - Math.pow(1 - countT, 3)
  const shown = entry.total * eased
  const msgIn = interpolate(frame, [beatOffset(4), beatOffset(5)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const float = Math.sin(frame / 16) * 12
  const wiggle = Math.sin(frame / 9) * 3
  const heartBeat = 1 + Math.sin(frame / 5) * 0.05
  const numPulse = countT < 1 ? 1 + Math.sin(frame / 2.2) * 0.035 : 1

  const avatarSize = isTop ? 500 : 430

  // Shrink-to-fit the amount so "$X / GHO" never overflows the right column,
  // no matter how big the total is. Sized from the final value (stable).
  const amountFont = isTop ? 176 : 150
  const ghoFont = 56
  const rightWidth = WIDTH - 2 * SCENE_PAD_X - SCENE_GAP - avatarSize
  const amountWidth =
    textEm(money(entry.total)) * amountFont + 18 + 4.4 * ghoFont
  const fit = Math.min(1, (rightWidth * 0.97) / amountWidth)

  return (
    <AbsoluteFill
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: `0 ${SCENE_PAD_X}px`,
        gap: SCENE_GAP,
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
            whiteSpace: "nowrap",
            transform: `scale(${numPulse * fit})`,
            transformOrigin: "left center",
          }}
        >
          <span
            style={{
              fontFamily: ROUND,
              fontSize: amountFont,
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
              fontSize: ghoFont,
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

export const ThankYouVideo = ({
  recipientHandle,
  ranking,
  vhs = true,
}: ThankYouVideoProps) => {
  const total = getThankYouDuration(ranking.length)
  const musicFade = 18
  // Every boundary is a real beat on the 127.84 BPM grid, derived
  // cumulatively from beatFrame() so it never drifts off the music.
  const introEnd = introEndFrame()
  const outroFrom = outroStartFrame(ranking.length)
  const sceneStart = (i: number) => personStartFrame(i)
  const sceneLen = (i: number) =>
    (i + 1 < ranking.length ? sceneStart(i + 1) : outroFrom) - sceneStart(i)

  return (
    <AbsoluteFill style={{ backgroundColor: "#ffd6e8" }}>
      {/* ── Audio track — kept OUTSIDE the shader. HtmlInCanvas captures
            visuals only; <Audio> must live in the plain tree to be mixed
            into the rendered/playing soundtrack. ── */}
      <Audio
        src={staticFile("music/ty4tipinme.mp3")}
        volume={(f) =>
          interpolate(
            f,
            [0, 24, total - musicFade, total],
            [0, 0.55, 0.55, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          )
        }
      />

      {/* Intro starts at frame 0; the grid's first downbeat is frame 14, so
          the title spring and twinkle land together on beat 1. */}
      <Sequence durationInFrames={introEnd}>
        <Audio src={staticFile("thank-you/sparkle.wav")} volume={0.7} />
        <Sequence from={beatFrame(0)}>
          <Audio src={staticFile("thank-you/twinkle.wav")} volume={0.75} />
        </Sequence>
        <Sequence from={beatFrame(2)}>
          <Audio src={staticFile("thank-you/kiss.wav")} volume={0.85} />
        </Sequence>
      </Sequence>

      {ranking.map((entry, i) => (
        <Sequence
          key={`audio-${entry.address}`}
          from={sceneStart(i)}
          durationInFrames={sceneLen(i)}
        >
          {/* scene begins exactly on a beat → SFX snap to beats 0/1/2/5 */}
          <Audio src={staticFile("thank-you/sparkle.wav")} volume={0.6} />
          <Sequence from={beatOffset(1)}>
            <Audio src={staticFile("thank-you/twinkle.wav")} volume={0.6} />
          </Sequence>
          <Sequence from={beatOffset(2)}>
            <Audio src={staticFile("thank-you/pop.wav")} volume={0.85} />
          </Sequence>
          <Sequence from={beatOffset(5)}>
            <Audio src={staticFile("thank-you/kiss.wav")} volume={0.8} />
          </Sequence>
        </Sequence>
      ))}

      <Sequence
        from={outroFrom}
        durationInFrames={total - outroFrom}
      >
        <Audio src={staticFile("thank-you/sparkle.wav")} volume={0.7} />
        <Sequence from={beatOffset(1)}>
          <Audio src={staticFile("thank-you/twinkle.wav")} volume={0.8} />
        </Sequence>
        <Sequence from={beatOffset(2)}>
          <Audio src={staticFile("thank-you/kiss.wav")} volume={0.9} />
        </Sequence>
      </Sequence>

      {/* ── Visuals — wrapped in the Valentine-VHS look ── */}
      <VhsLook enabled={vhs}>
        <AbsoluteFill style={{ backgroundColor: "#ffd6e8" }}>
          <AnimatedBackground />

          <Sequence durationInFrames={introEnd}>
            <Intro recipientHandle={recipientHandle} />
          </Sequence>

          {ranking.map((entry, i) => (
            <Sequence
              key={entry.address}
              from={sceneStart(i)}
              durationInFrames={sceneLen(i)}
            >
              <PersonScene entry={entry} />
            </Sequence>
          ))}

          <Sequence from={outroFrom} durationInFrames={total - outroFrom}>
            <Outro recipientHandle={recipientHandle} />
          </Sequence>
        </AbsoluteFill>
      </VhsLook>
    </AbsoluteFill>
  )
}

export { FPS, WIDTH, HEIGHT } from "./constants"
