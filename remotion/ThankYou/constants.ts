import type { ThankYouRankingEntry } from "@/lib/thankYouRanking"

export const FPS = 30
// 4:3 landscape
export const WIDTH = 1440
export const HEIGHT = 1080

// ── Beat grid ────────────────────────────────────────────────────────────
// ty4tipinme.mp3 analysed with librosa: a rock-steady 127.84 BPM. At 30 fps
// that's one beat every 60/127.84*30 = 14.08 frames, with the first audible
// downbeat landing at ~frame 14. Every scene cut and SFX hit in this video is
// snapped to this grid so the whole thing grooves to the track.
export const BPM = 127.841
export const BEAT = (60 / BPM) * FPS // ≈ 14.08 frames per beat
export const GRID0 = 14 // frame of the first downbeat (phase anchor)

// Frame of beat index `k` on the music grid, rounded to a real frame. Used
// cumulatively (not k*const) so scene starts never drift off the beat.
export const beatFrame = (k: number) => Math.round(GRID0 + BEAT * k)
// A relative offset of `beats` beats, in whole frames (for in-scene SFX).
export const beatOffset = (beats: number) => Math.round(beats * BEAT)

// Scene lengths, in beats. The intro starts at frame 0 (so its title spring
// naturally punches on the first downbeat); every supporter scene and the
// outro begin exactly on a beat.
export const INTRO_BEATS = 5 // ≈ 84f (was 78)
export const PERSON_BEATS = 7 // ≈ 98f — individual #10→#2 slides
export const OUTRO_BEATS = 7 // ≈ 98f (was 96)

// Countdown-specific beat lengths (all snapped to the same grid).
export const PAIR_BEATS = 5 // ≈ 70f — paired 19·20 … 11·12 slides (secondary)
export const CARD_BEATS = 3 // ≈ 42f — "TOP 10 💖" divider card
export const SUSPENSE_BEATS = 5 // ≈ 70f — drumroll build-up before #1
export const TOP1_BEATS = 12 // ≈ 169f — the #1 finale, held long & loud

// Beat index where supporter `i` (0-based) begins, and where the outro begins.
export const personStartBeat = (i: number) => INTRO_BEATS + i * PERSON_BEATS
export const outroStartBeat = (n: number) => INTRO_BEATS + n * PERSON_BEATS

// Absolute frame helpers (all beat-aligned & drift-free).
export const introEndFrame = () => beatFrame(INTRO_BEATS)
export const personStartFrame = (i: number) => beatFrame(personStartBeat(i))
export const outroStartFrame = (n: number) => beatFrame(outroStartBeat(n))

// Back-compat: kept so existing imports keep type-checking. These are now the
// *nominal* beat-aligned lengths; real per-scene lengths are derived from the
// grid (consecutive beatFrame() differences) to stay locked to the music.
export const INTRO_FRAMES = beatFrame(INTRO_BEATS)
export const PER_PERSON_FRAMES = Math.round(PERSON_BEATS * BEAT)
export const OUTRO_FRAMES = Math.round(OUTRO_BEATS * BEAT)

export type ThankYouVideoProps = {
  recipientHandle: string
  recipientName: string
  ranking: ThankYouRankingEntry[]
  /** "VHS de San Valentín" retro grade. Defaults to on. */
  vhs?: boolean
}

// ── Countdown running order ──────────────────────────────────────────────
// The video is no longer a uniform list: it's a build-up. Lowest supporters
// come first (paired, to keep it snappy), then the top 10 one-by-one, then a
// drumroll, then the #1 finale held long. Structure is fully derived from `n`
// so getThankYouDuration() can stay a pure function of the ranking length.
export type ThankYouSegment =
  | { kind: "intro" }
  | { kind: "pair"; ranks: number[] } // 1–2 ranks, lower-importance shown first
  | { kind: "card" } // "TOP 10 💖" divider
  | { kind: "person"; rank: number } // ranks 10 … 2
  | { kind: "suspense" } // drumroll before the reveal
  | { kind: "top1" } // rank 1 — the finale
  | { kind: "outro" }

export type PlannedSegment = ThankYouSegment & {
  /** beat index where this segment begins (cumulative, drift-free) */
  startBeat: number
  /** nominal length, in beats */
  beats: number
  /** absolute start frame, snapped to the 127.84 BPM grid */
  fromFrame: number
  /** length in frames = next beat boundary − this one */
  durationInFrames: number
}

const beatsForKind = (kind: ThankYouSegment["kind"]): number => {
  switch (kind) {
    case "intro":
      return INTRO_BEATS
    case "pair":
      return PAIR_BEATS
    case "card":
      return CARD_BEATS
    case "person":
      return PERSON_BEATS
    case "suspense":
      return SUSPENSE_BEATS
    case "top1":
      return TOP1_BEATS
    case "outro":
      return OUTRO_BEATS
  }
}

// Running order for `n` supporters (n already capped at THANK_YOU_TOP_N).
// Adapts down gracefully: <10 → no pairs/card, odd tail → a 1-person "pair",
// <3 → no drumroll, n=1 → straight to the finale.
export function thankYouSegments(n: number): ThankYouSegment[] {
  const top = Math.max(0, Math.floor(n))
  const segs: ThankYouSegment[] = [{ kind: "intro" }]

  // Ranks 11..min(n,20) as pairs, lowest pair first: (20,19),(18,17)…(12,11).
  if (top > 10) {
    const hi = Math.min(top, 20)
    for (let r = hi; r >= 11; r -= 2) {
      segs.push({ kind: "pair", ranks: r - 1 >= 11 ? [r, r - 1] : [r] })
    }
    segs.push({ kind: "card" })
  }

  // Individuals #min(n,10) … #2, descending toward the climax.
  for (let r = Math.min(top, 10); r >= 2; r--) {
    segs.push({ kind: "person", rank: r })
  }

  // The #1 reveal — a short drumroll (only if there's real suspense), then
  // the big finale.
  if (top >= 1) {
    if (top >= 3) segs.push({ kind: "suspense" })
    segs.push({ kind: "top1" })
  }

  segs.push({ kind: "outro" })
  return segs
}

// Same plan, resolved onto the beat grid. Boundaries are derived cumulatively
// via beatFrame() so no scene ever drifts off ty4tipinme.mp3.
export function planThankYou(n: number): PlannedSegment[] {
  let cum = 0
  return thankYouSegments(n).map((seg) => {
    const beats = beatsForKind(seg.kind)
    const startBeat = cum
    // The very first segment (intro) starts at literal frame 0 so the music's
    // GRID0 lead-in (14f before downbeat 0) is preserved; every later boundary
    // is the real beat frame. End is always beatFrame(startBeat + beats).
    const fromFrame = startBeat === 0 ? 0 : beatFrame(startBeat)
    const durationInFrames = beatFrame(startBeat + beats) - fromFrame
    cum += beats
    return { ...seg, startBeat, beats, fromFrame, durationInFrames }
  })
}

export const thankYouTotalBeats = (n: number) =>
  thankYouSegments(n).reduce((b, s) => b + beatsForKind(s.kind), 0)

export const getThankYouDuration = (rankingLength: number) =>
  beatFrame(thankYouTotalBeats(Math.max(rankingLength, 1)))

// Cute thank-you lines, indexed by rank (1-based). #1 gets the warmest one.
export const MESSAGES = [
  "I love you so much 💛",
  "Thank you, truly 🥹",
  "You're the absolute best 💖",
  "Forever grateful 🌸",
  "You made my day ✨",
  "So much love for you 💕",
  "Thank you, kind soul 🤍",
  "You're amazing 🌟",
  "Sending you hugs 🫶",
  "Couldn't do it without you 💫",
] as const

export const messageForRank = (rank: number) =>
  MESSAGES[(rank - 1) % MESSAGES.length]
