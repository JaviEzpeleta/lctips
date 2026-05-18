"use client"

import { memo, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import NumberFlow from "@number-flow/react"
import { AnimatePresence, motion } from "framer-motion"
import { DetailTransfer } from "@/lib/types"
import {
  CachedProfile,
  getCachedProfile,
  loadProfile,
  subscribeProfileCache,
} from "@/lib/profileCache"

type Direction = "sent" | "received"

const TOP_N = 20

const isGhoTransfer = (t: DetailTransfer) =>
  t.symbol === "WGHO" || t.symbol === "ETH"

const TopCounterpartyRow = memo(function TopCounterpartyRow({
  profile,
  handle,
  total,
  count,
  direction,
  rank,
  ratio,
}: {
  profile: NonNullable<CachedProfile>
  handle: string
  total: number
  count: number
  direction: Direction
  rank: number
  ratio: number
}) {
  const isSent = direction === "sent"
  const name = profile.metadata.name || handle
  const picture = profile.metadata.picture
  const barWidth = `${Math.max(ratio * 100, 2)}%`

  return (
    <Link href={`/u/${handle}`}>
      <div className="relative rounded-md overflow-hidden hover:bg-zinc-900/50 transition-colors">
        <motion.div
          className={`absolute inset-y-0 left-0 pointer-events-none ${
            isSent
              ? "bg-gradient-to-r from-orange-500/25 to-orange-500/5"
              : "bg-gradient-to-r from-emerald-500/25 to-emerald-500/5"
          }`}
          initial={false}
          animate={{ width: barWidth }}
          transition={{ type: "spring", stiffness: 180, damping: 28, mass: 0.8 }}
        />
        <div className="relative flex items-center gap-2 py-1.5 px-2">
          <span className="text-[10px] text-zinc-600 w-4 tabular-nums flex-shrink-0">
            <NumberFlow value={rank} />
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
            <span className="ml-1 text-[10px] text-zinc-500 tabular-nums font-normal">
              (<NumberFlow value={count} />)
            </span>
          </span>
          <span
            className={`text-xs font-bold tabular-nums flex-shrink-0 ${
              isSent ? "text-orange-300" : "text-emerald-300"
            }`}
          >
            <NumberFlow
              value={total}
              prefix={isSent ? "-$" : "+$"}
              format={
                total >= 10000
                  ? {
                      notation: "compact",
                      compactDisplay: "short",
                      maximumFractionDigits: 1,
                    }
                  : {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
              }
            />
          </span>
        </div>
      </div>
    </Link>
  )
})

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
    const stats = new Map<string, { total: number; count: number }>()
    for (const t of transfers) {
      if (t.direction !== want) continue
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
    return Array.from(stats.entries()).sort((a, b) => b[1].total - a[1].total)
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
      count: number
      profile: NonNullable<CachedProfile>
      handle: string
    }> = []
    for (const [address, { total, count }] of candidates) {
      const profile = getCachedProfile(address)
      if (!profile) continue
      const handle = profile.username.localName
      if (!handle) continue
      result.push({ address, total, count, profile, handle })
      if (result.length >= TOP_N) break
    }
    return result
    // cacheVersion intentionally in deps to trigger refresh when cache changes
  }, [candidates, cacheVersion])

  if (top.length === 0) return null

  const maxTotal = top[0]?.total ?? 0
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
      <div className="space-y-0.5 relative">
        <AnimatePresence initial={false}>
          {top.map((entry, i) => (
            <motion.div
              key={entry.address}
              layout
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{
                layout: { type: "spring", stiffness: 420, damping: 34, mass: 0.7 },
                opacity: { duration: 0.18 },
                y: { duration: 0.22 },
                scale: { duration: 0.22 },
              }}
            >
              <TopCounterpartyRow
                profile={entry.profile}
                handle={entry.handle}
                total={entry.total}
                count={entry.count}
                direction={direction}
                rank={i + 1}
                ratio={maxTotal > 0 ? entry.total / maxTotal : 0}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default memo(TopCounterparties)
