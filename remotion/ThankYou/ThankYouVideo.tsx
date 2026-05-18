"use client"

import { useMemo, useState } from "react"
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion"
import { Audio } from "@remotion/media"
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

const FONT =
  '"SF Pro Rounded", ui-rounded, "Hiragino Maru Gothic ProN", "Quicksand", system-ui, -apple-system, "Segoe UI", sans-serif'

const money = (n: number) =>
  n >= 10000
    ? `$${(n / 1000).toFixed(1)}k`
    : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const hashHue = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360
  return h
}

const AnimatedBackground = () => {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()
  const drift = Math.sin(frame / 90) * 6
  const hearts = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        x: (i * 137.5) % 100,
        delay: (i * 23) % 90,
        size: 26 + ((i * 17) % 44),
        speed: 0.5 + ((i * 7) % 10) / 12,
        glyph: ["💛", "✨", "💖", "🌸", "🤍", "💫"][i % 6],
      })),
    []
  )
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 90% at ${50 + drift}% 0%, #ffe3f1 0%, #ffd6e8 22%, #f3d9ff 48%, #d9e4ff 72%, #cfe9ff 100%)`,
      }}
    >
      {hearts.map((h, i) => {
        const y =
          height + 120 - ((frame * h.speed * 9 + h.delay * 11) % (height + 260))
        const wob = Math.sin((frame + h.delay) / 22) * 26
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${h.x}%`,
              top: y,
              transform: `translateX(${wob}px) rotate(${wob}deg)`,
              fontSize: h.size,
              opacity: 0.5,
              filter: "drop-shadow(0 2px 6px rgba(255,150,200,0.35))",
            }}
          >
            {h.glyph}
          </span>
        )
      })}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(60% 40% at 50% 50%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 70%)",
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
        padding: 8,
        background: ring,
        boxShadow: "0 18px 50px rgba(214,120,180,0.45)",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          overflow: "hidden",
          background: `linear-gradient(135deg, hsl(${hue} 85% 80%), hsl(${(hue + 60) % 360} 85% 78%))`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "6px solid #fff",
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
              fontFamily: FONT,
            }}
          >
            {name.trim().charAt(0).toUpperCase() || "♥"}
          </span>
        )}
      </div>
    </div>
  )
}

const Intro = ({ recipientHandle }: { recipientHandle: string }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const pop = spring({ frame, fps, config: { damping: 11, mass: 0.7 } })
  const sub = interpolate(frame, [14, 34], [0, 1], { extrapolateRight: "clamp" })
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: 80,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          fontSize: 130,
          marginBottom: 10,
          transform: `scale(${0.4 + pop * 0.6})`,
        }}
      >
        💌
      </div>
      <div
        style={{
          fontSize: 116,
          fontWeight: 800,
          color: "#d6336c",
          transform: `scale(${0.6 + pop * 0.4})`,
          textShadow: "0 4px 0 #fff, 0 12px 30px rgba(214,51,108,0.25)",
        }}
      >
        Thank you!
      </div>
      <div
        style={{
          marginTop: 30,
          fontSize: 46,
          fontWeight: 600,
          color: "#7a4a8c",
          opacity: sub,
          transform: `translateY(${(1 - sub) * 20}px)`,
        }}
      >
        to everyone who tipped
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 56,
          fontWeight: 800,
          color: "#9b2c6f",
          opacity: sub,
        }}
      >
        @{recipientHandle}
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
  const countT = interpolate(frame, [16, 46], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const eased = 1 - Math.pow(1 - countT, 3)
  const shown = entry.total * eased
  const msgIn = interpolate(frame, [50, 66], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const float = Math.sin(frame / 16) * 8

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: 70,
        fontFamily: FONT,
        opacity: enter,
      }}
    >
      <div
        style={{
          fontSize: isTop ? 60 : 44,
          fontWeight: 800,
          color: "#c026d3",
          background: "rgba(255,255,255,0.7)",
          padding: isTop ? "10px 34px" : "8px 26px",
          borderRadius: 999,
          boxShadow: "0 10px 26px rgba(192,38,211,0.25)",
          transform: `translateY(${(1 - enter) * -30}px)`,
        }}
      >
        {isTop ? "👑 #1 Top supporter" : `#${entry.rank}`}
      </div>

      <div
        style={{
          marginTop: 56,
          transform: `scale(${0.5 + avatarPop * 0.5}) translateY(${float}px)`,
        }}
      >
        <Avatar
          picture={entry.picture}
          name={entry.name}
          size={isTop ? 460 : 380}
          ring={
            isTop
              ? "conic-gradient(from 0deg, #ffd56b, #ff8fc7, #b388ff, #ffd56b)"
              : "linear-gradient(135deg, #ff9ecf, #b8a4ff)"
          }
        />
      </div>

      <div
        style={{
          marginTop: 44,
          fontSize: isTop ? 84 : 72,
          fontWeight: 800,
          color: "#7a2d6b",
          maxWidth: 900,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {entry.name}
      </div>

      <div
        style={{
          marginTop: 18,
          fontSize: 96,
          fontWeight: 800,
          color: "#16a34a",
          textShadow: "0 3px 0 #fff",
        }}
      >
        {money(shown)}{" "}
        <span style={{ fontSize: 52, color: "#15803d" }}>GHO</span>
      </div>
      <div style={{ fontSize: 34, color: "#9a6aa8", marginTop: 4 }}>
        across {entry.count} tip{entry.count === 1 ? "" : "s"} 💝
      </div>

      <div
        style={{
          marginTop: 40,
          fontSize: isTop ? 70 : 58,
          fontWeight: 800,
          color: "#d6336c",
          opacity: msgIn,
          transform: `scale(${0.8 + msgIn * 0.2})`,
        }}
      >
        {messageForRank(entry.rank)}
      </div>
    </AbsoluteFill>
  )
}

const Outro = ({ recipientHandle }: { recipientHandle: string }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const pop = spring({ frame, fps, config: { damping: 12, mass: 0.8 } })
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: 80,
        fontFamily: FONT,
      }}
    >
      <div style={{ fontSize: 140, transform: `scale(${0.5 + pop * 0.5})` }}>
        🫶
      </div>
      <div
        style={{
          marginTop: 24,
          fontSize: 104,
          fontWeight: 800,
          color: "#d6336c",
          transform: `scale(${0.7 + pop * 0.3})`,
          textShadow: "0 4px 0 #fff",
        }}
      >
        With all my love
      </div>
      <div
        style={{
          marginTop: 16,
          fontSize: 60,
          fontWeight: 800,
          color: "#9b2c6f",
          opacity: pop,
        }}
      >
        @{recipientHandle} 💛
      </div>
    </AbsoluteFill>
  )
}

export const ThankYouVideo = ({
  recipientHandle,
  ranking,
}: ThankYouVideoProps) => {
  const total = getThankYouDuration(ranking.length)
  const musicFade = 18

  return (
    <AbsoluteFill style={{ backgroundColor: "#ffd6e8" }}>
      <AnimatedBackground />

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
        <Intro recipientHandle={recipientHandle} />
      </Sequence>

      {ranking.map((entry, i) => {
        const from = INTRO_FRAMES + i * PER_PERSON_FRAMES
        return (
          <Sequence
            key={entry.address}
            from={from}
            durationInFrames={PER_PERSON_FRAMES}
          >
            <Audio src={staticFile("thank-you/sparkle.wav")} volume={0.6} />
            <Sequence from={16}>
              <Audio src={staticFile("thank-you/pop.wav")} volume={0.85} />
            </Sequence>
            <PersonScene entry={entry} />
          </Sequence>
        )
      })}

      <Sequence
        from={INTRO_FRAMES + ranking.length * PER_PERSON_FRAMES}
        durationInFrames={OUTRO_FRAMES}
      >
        <Audio src={staticFile("thank-you/sparkle.wav")} volume={0.7} />
        <Outro recipientHandle={recipientHandle} />
      </Sequence>
    </AbsoluteFill>
  )
}

export { FPS, WIDTH, HEIGHT } from "./constants"
