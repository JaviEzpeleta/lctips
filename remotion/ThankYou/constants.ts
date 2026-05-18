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
export const PERSON_BEATS = 7 // ≈ 98f (was 96)
export const OUTRO_BEATS = 7 // ≈ 98f (was 96)

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

export const getThankYouDuration = (rankingLength: number) =>
  beatFrame(outroStartBeat(Math.max(rankingLength, 1)) + OUTRO_BEATS)

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
