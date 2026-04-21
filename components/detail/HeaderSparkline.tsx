"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useMemo, useState } from "react"
import { ArrowUpRight, ArrowDownLeft } from "lucide-react"
import { format } from "date-fns"
import NumberFlow from "@number-flow/react"
import type { DetailTransfer } from "@/lib/types"

const BUCKET_COUNT = 28
const CHART_W = 132
const CHART_H = 26
const BAR_GAP = 1.5

interface Bucket {
  amount: number
  count: number
  firstDate: Date | null
  startMs: number
  endMs: number
}

interface Props {
  transfers: DetailTransfer[]
  direction: "sent" | "received"
  onBucketClick?: (date: Date) => void
}

const HeaderSparkline = ({ transfers, direction, onBucketClick }: Props) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const dirKey = direction === "sent" ? "outcome" : "income"

  const { buckets, max, total } = useMemo(() => {
    const empty: Bucket[] = Array.from({ length: BUCKET_COUNT }, () => ({
      amount: 0,
      count: 0,
      firstDate: null,
      startMs: 0,
      endMs: 0,
    }))

    if (transfers.length === 0) {
      return { buckets: empty, max: 1, total: 0 }
    }

    let minT = Infinity
    let maxT = -Infinity
    for (const t of transfers) {
      const ms = new Date(t.timestamp).getTime()
      if (ms < minT) minT = ms
      if (ms > maxT) maxT = ms
    }
    const range = Math.max(maxT - minT, 1)
    const bucketWidth = range / BUCKET_COUNT

    const bins: Bucket[] = Array.from({ length: BUCKET_COUNT }, (_, i) => ({
      amount: 0,
      count: 0,
      firstDate: null,
      startMs: minT + i * bucketWidth,
      endMs: minT + (i + 1) * bucketWidth,
    }))

    let sum = 0
    for (const t of transfers) {
      if (t.direction !== dirKey) continue
      if (!(t.symbol === "WGHO" || t.symbol === "ETH")) continue
      const ts = new Date(t.timestamp).getTime()
      const idx = Math.min(
        BUCKET_COUNT - 1,
        Math.floor(((ts - minT) / range) * BUCKET_COUNT)
      )
      const amt = Number(t.amount)
      const bin = bins[idx]
      bin.amount += amt
      bin.count += 1
      sum += amt
      if (!bin.firstDate || ts < bin.firstDate.getTime()) {
        bin.firstDate = new Date(t.timestamp)
      }
    }

    const m = bins.reduce((a, b) => (b.amount > a ? b.amount : a), 0)
    return { buckets: bins, max: Math.max(m, 1), total: sum }
  }, [transfers, dirKey])

  const isSent = direction === "sent"
  const color = isSent ? "rgb(251 146 60)" : "rgb(52 211 153)"
  const Icon = isSent ? ArrowUpRight : ArrowDownLeft
  const barWidth = (CHART_W - BAR_GAP * (BUCKET_COUNT - 1)) / BUCKET_COUNT

  const hovered = hoveredIdx !== null ? buckets[hoveredIdx] : null
  const hoverBarCenterX =
    hoveredIdx !== null ? hoveredIdx * (barWidth + BAR_GAP) + barWidth / 2 : 0

  const formatRange = (start: number, end: number) => {
    const s = new Date(start)
    const e = new Date(end)
    if (s.toDateString() === e.toDateString()) return format(s, "MMM d")
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
      return `${format(s, "MMM d")} – ${format(e, "d")}`
    }
    return `${format(s, "MMM d")} – ${format(e, "MMM d")}`
  }

  const formatAmount = (n: number) => {
    if (n >= 10000)
      return n.toLocaleString(undefined, {
        notation: "compact",
        compactDisplay: "short",
        maximumFractionDigits: 1,
      })
    return n.toLocaleString(undefined, {
      minimumFractionDigits: n >= 100 ? 0 : 2,
      maximumFractionDigits: n >= 100 ? 0 : 2,
    })
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
          isSent ? "bg-orange-500/15" : "bg-emerald-500/15"
        }`}
      >
        <Icon
          className={`w-3.5 h-3.5 ${
            isSent ? "text-orange-400" : "text-emerald-400"
          }`}
        />
      </div>
      <div className="flex flex-col items-start gap-0.5">
        <div
          className={`text-[9px] uppercase tracking-wider font-semibold leading-none tabular-nums ${
            isSent ? "text-orange-300/80" : "text-emerald-300/80"
          }`}
        >
          <NumberFlow
            value={total}
            prefix="$"
            format={
              total >= 10000
                ? {
                    notation: "compact",
                    compactDisplay: "short",
                    maximumFractionDigits: 1,
                  }
                : {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: total >= 100 ? 0 : 2,
                  }
            }
          />
        </div>
        <div className="relative">
          <svg
            width={CHART_W}
            height={CHART_H}
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            className="overflow-visible"
            aria-hidden
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {buckets.map((bin, i) => {
              const h = Math.max(
                (bin.amount / max) * (CHART_H - 1),
                bin.amount > 0 ? 2 : 1
              )
              const x = i * (barWidth + BAR_GAP)
              const y = CHART_H - h
              const isHovered = hoveredIdx === i
              return (
                <motion.rect
                  key={`bar-${i}`}
                  x={x}
                  width={barWidth}
                  fill={color}
                  fillOpacity={
                    bin.amount > 0
                      ? isHovered
                        ? 1
                        : 0.9
                      : isHovered
                        ? 0.35
                        : 0.18
                  }
                  rx={0.5}
                  initial={{ height: 0, y: CHART_H }}
                  animate={{ height: h, y }}
                  transition={{
                    type: "spring",
                    stiffness: 160,
                    damping: 22,
                    mass: 0.6,
                    delay: i * 0.012,
                  }}
                />
              )
            })}
            {buckets.map((bin, i) => {
              const cellX = Math.max(
                0,
                i * (barWidth + BAR_GAP) - BAR_GAP / 2
              )
              const cellW = barWidth + BAR_GAP
              const canClick = bin.firstDate !== null
              return (
                <rect
                  key={`hit-${i}`}
                  x={cellX}
                  y={0}
                  width={cellW}
                  height={CHART_H}
                  fill="transparent"
                  style={{ cursor: canClick ? "pointer" : "default" }}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onClick={() => {
                    if (bin.firstDate) onBucketClick?.(bin.firstDate)
                  }}
                />
              )
            })}
          </svg>
          <AnimatePresence>
            {hovered && (
              <motion.div
                key={hoveredIdx}
                initial={{ opacity: 0, y: 3, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 3, scale: 0.96 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
                style={{
                  position: "absolute",
                  left: hoverBarCenterX,
                  bottom: "calc(100% + 8px)",
                }}
                className="pointer-events-none z-50 -translate-x-1/2"
              >
                <div
                  className={`rounded-md px-2 py-1.5 bg-zinc-900/95 backdrop-blur-md ring-1 shadow-xl whitespace-nowrap ${
                    isSent ? "ring-orange-500/30" : "ring-emerald-500/30"
                  }`}
                >
                  <div className="text-[10px] font-semibold text-zinc-300">
                    {formatRange(hovered.startMs, hovered.endMs)}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-[11px] font-bold tabular-nums ${
                        isSent ? "text-orange-300" : "text-emerald-300"
                      }`}
                    >
                      {hovered.amount > 0
                        ? `${isSent ? "-" : "+"}$${formatAmount(hovered.amount)}`
                        : "—"}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {hovered.count}{" "}
                      {hovered.count === 1 ? "tx" : "txs"}
                    </span>
                  </div>
                  {hovered.count > 0 && onBucketClick && (
                    <div className="text-[9px] text-zinc-500 mt-0.5">
                      Click to jump
                    </div>
                  )}
                </div>
                <div className="w-0 h-0 mx-auto border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-zinc-900/95" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default HeaderSparkline
