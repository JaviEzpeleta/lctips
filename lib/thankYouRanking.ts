import { DetailTransfer } from "@/lib/types"

// Shape of the JSON file produced by the "Export thank-you JSON" button and
// consumed by the /thank-you video page. Keep `version`/`kind` stable so the
// page can validate uploads.
export const THANK_YOU_JSON_KIND = "lctips-thank-you" as const
export const THANK_YOU_JSON_VERSION = 1 as const
export const THANK_YOU_TOP_N = 10

export type ThankYouRankingEntry = {
  rank: number
  address: string
  handle: string
  name: string
  picture: string | null
  total: number
  count: number
}

export type ThankYouExport = {
  kind: typeof THANK_YOU_JSON_KIND
  version: typeof THANK_YOU_JSON_VERSION
  generatedAt: string
  currency: "GHO"
  recipient: {
    handle: string
    name: string
    picture: string | null
  }
  ranking: ThankYouRankingEntry[]
}

const isGhoTransfer = (t: DetailTransfer) =>
  t.symbol === "WGHO" || t.symbol === "ETH"

type ProfileLookup = (address: string) =>
  | { username: { localName: string }; metadata: { name?: string; picture?: string } }
  | null
  | undefined

// Aggregates received GHO per counterparty (same rule as TopCounterparties)
// and returns the top N enriched with cached profile data.
export function buildReceivedGhoRanking(
  transfers: DetailTransfer[],
  getProfile: ProfileLookup,
  topN: number = THANK_YOU_TOP_N
): ThankYouRankingEntry[] {
  const stats = new Map<string, { total: number; count: number }>()
  for (const t of transfers) {
    if (t.direction !== "income") continue
    if (!isGhoTransfer(t)) continue
    if (!t.counterpartyAddress) continue
    const key = t.counterpartyAddress.toLowerCase()
    const prev = stats.get(key)
    if (prev) {
      prev.total += Number(t.amount)
      prev.count += 1
    } else {
      stats.set(key, { total: Number(t.amount), count: 1 })
    }
  }

  const sorted = Array.from(stats.entries()).sort(
    (a, b) => b[1].total - a[1].total
  )

  const ranking: ThankYouRankingEntry[] = []
  for (const [address, { total, count }] of sorted) {
    const profile = getProfile(address)
    if (!profile) continue
    const handle = profile.username.localName
    if (!handle) continue
    ranking.push({
      rank: ranking.length + 1,
      address,
      handle,
      name: profile.metadata.name || handle,
      picture: profile.metadata.picture ?? null,
      total,
      count,
    })
    if (ranking.length >= topN) break
  }
  return ranking
}

export function isThankYouExport(value: unknown): value is ThankYouExport {
  if (!value || typeof value !== "object") return false
  const v = value as Record<string, unknown>
  return (
    v.kind === THANK_YOU_JSON_KIND &&
    v.version === THANK_YOU_JSON_VERSION &&
    Array.isArray(v.ranking) &&
    typeof v.recipient === "object" &&
    v.recipient !== null
  )
}
