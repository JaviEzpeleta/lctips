import type { ThankYouRankingEntry } from "@/lib/thankYouRanking"

export const FPS = 30
// 4:3 landscape
export const WIDTH = 1440
export const HEIGHT = 1080

export const INTRO_FRAMES = 78
export const PER_PERSON_FRAMES = 96
export const OUTRO_FRAMES = 96

export type ThankYouVideoProps = {
  recipientHandle: string
  recipientName: string
  ranking: ThankYouRankingEntry[]
  /** "VHS de San Valentín" retro grade. Defaults to on. */
  vhs?: boolean
}

export const getThankYouDuration = (rankingLength: number) =>
  INTRO_FRAMES +
  Math.max(rankingLength, 1) * PER_PERSON_FRAMES +
  OUTRO_FRAMES

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
