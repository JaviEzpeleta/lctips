"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { DetailTransfer } from "@/lib/types"
import { formatLargeNumber } from "@/lib/utils"
import {
  CachedProfile,
  getCachedProfile,
  loadProfile,
  subscribeProfileCache,
} from "@/lib/profileCache"

type Direction = "sent" | "received"

const TOP_N = 5

const isGhoTransfer = (t: DetailTransfer) =>
  t.symbol === "WGHO" || t.symbol === "ETH"

const TopCounterpartyRow = ({
  profile,
  handle,
  total,
  direction,
  rank,
}: {
  profile: NonNullable<CachedProfile>
  handle: string
  total: number
  direction: Direction
  rank: number
}) => {
  const isSent = direction === "sent"
  const name = profile.metadata.name || handle
  const picture = profile.metadata.picture

  return (
    <Link href={`/u/${handle}`}>
      <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-zinc-900/50 transition-colors">
        <span className="text-[10px] text-zinc-600 w-4 tabular-nums flex-shrink-0">
          {rank}
        </span>
        {picture ? (
          <div
            className="w-5 h-5 rounded-full flex-shrink-0"
            style={{
              backgroundImage: `url(${picture})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-zinc-800 flex-shrink-0" />
        )}
        <span className="text-xs font-medium truncate flex-1 min-w-0">
          {name}
        </span>
        <span
          className={`text-xs font-bold tabular-nums flex-shrink-0 ${
            isSent ? "text-orange-300" : "text-emerald-300"
          }`}
        >
          {isSent ? "-" : "+"}${formatLargeNumber(total)}
        </span>
      </div>
    </Link>
  )
}

const TopCounterparties = ({
  transfers,
  direction,
  isStreaming,
}: {
  transfers: DetailTransfer[]
  direction: Direction
  isStreaming: boolean
}) => {
  const candidates = useMemo(() => {
    const want: DetailTransfer["direction"] =
      direction === "sent" ? "outcome" : "income"
    const sums = new Map<string, number>()
    for (const t of transfers) {
      if (t.direction !== want) continue
      if (!isGhoTransfer(t)) continue
      if (!t.counterpartyAddress) continue
      const key = t.counterpartyAddress.toLowerCase()
      sums.set(key, (sums.get(key) ?? 0) + Number(t.amount))
    }
    return Array.from(sums.entries()).sort((a, b) => b[1] - a[1])
  }, [transfers, direction])

  const [cacheVersion, setCacheVersion] = useState(0)

  useEffect(() => {
    for (const [address] of candidates) {
      loadProfile(address)
    }
    const unsubscribe = subscribeProfileCache(() =>
      setCacheVersion((v) => v + 1)
    )
    return () => {
      unsubscribe()
    }
  }, [candidates])

  const top = useMemo(() => {
    const result: Array<{
      address: string
      total: number
      profile: NonNullable<CachedProfile>
      handle: string
    }> = []
    for (const [address, total] of candidates) {
      const profile = getCachedProfile(address)
      if (!profile) continue
      const handle = profile.username.localName
      if (!handle) continue
      result.push({ address, total, profile, handle })
      if (result.length >= TOP_N) break
    }
    return result
    // cacheVersion intentionally in deps to trigger refresh when cache changes
  }, [candidates, cacheVersion])

  if (top.length === 0) return null

  const accent = direction === "sent" ? "text-orange-300/80" : "text-emerald-300/80"

  return (
    <div className="bg-black/30 rounded-xl p-2.5 mb-3">
      <div className="flex items-center gap-2 mb-1.5 px-1">
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${accent}`}>
          Top {TOP_N} {direction === "sent" ? "Sent" : "Received"} · GHO
        </span>
        {isStreaming && (
          <span className="text-[9px] font-medium text-indigo-400 bg-indigo-500/15 px-1.5 py-0.5 rounded-full animate-pulse">
            live
          </span>
        )}
      </div>
      <div className="space-y-0.5">
        {top.map((entry, i) => (
          <TopCounterpartyRow
            key={entry.address}
            profile={entry.profile}
            handle={entry.handle}
            total={entry.total}
            direction={direction}
            rank={i + 1}
          />
        ))}
      </div>
    </div>
  )
}

export default TopCounterparties
