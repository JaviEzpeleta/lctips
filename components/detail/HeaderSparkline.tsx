"use client"

import { motion } from "framer-motion"
import { useMemo } from "react"
import { ArrowUpRight, ArrowDownLeft } from "lucide-react"
import NumberFlow from "@number-flow/react"
import type { DetailTransfer } from "@/lib/types"

const BUCKET_COUNT = 28
const CHART_W = 132
const CHART_H = 26
const BAR_GAP = 1.5

interface Props {
  transfers: DetailTransfer[]
  direction: "sent" | "received"
}

const HeaderSparkline = ({ transfers, direction }: Props) => {
  const dirKey = direction === "sent" ? "outcome" : "income"

  const { buckets, max, total } = useMemo(() => {
    const relevant = transfers.filter(
      (t) =>
        t.direction === dirKey && (t.symbol === "WGHO" || t.symbol === "ETH")
    )

    const zero = new Array(BUCKET_COUNT).fill(0)
    if (relevant.length === 0 || transfers.length === 0) {
      return { buckets: zero, max: 1, total: 0 }
    }

    let minT = Infinity
    let maxT = -Infinity
    for (const t of transfers) {
      const ms = new Date(t.timestamp).getTime()
      if (ms < minT) minT = ms
      if (ms > maxT) maxT = ms
    }
    const range = Math.max(maxT - minT, 1)

    const bins = new Array(BUCKET_COUNT).fill(0)
    let sum = 0
    for (const t of relevant) {
      const ts = new Date(t.timestamp).getTime()
      const bucketIdx = Math.min(
        BUCKET_COUNT - 1,
        Math.floor(((ts - minT) / range) * BUCKET_COUNT)
      )
      const amt = Number(t.amount)
      bins[bucketIdx] += amt
      sum += amt
    }

    const m = bins.reduce((a, b) => (b > a ? b : a), 0)
    return { buckets: bins, max: Math.max(m, 1), total: sum }
  }, [transfers, dirKey])

  const isSent = direction === "sent"
  const color = isSent ? "rgb(251 146 60)" : "rgb(52 211 153)"
  const Icon = isSent ? ArrowUpRight : ArrowDownLeft
  const barWidth = (CHART_W - BAR_GAP * (BUCKET_COUNT - 1)) / BUCKET_COUNT

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
        <svg
          width={CHART_W}
          height={CHART_H}
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="overflow-visible"
          aria-hidden
        >
          {buckets.map((v, i) => {
            const h = Math.max((v / max) * (CHART_H - 1), v > 0 ? 2 : 1)
            const x = i * (barWidth + BAR_GAP)
            const y = CHART_H - h
            return (
              <motion.rect
                key={i}
                x={x}
                width={barWidth}
                fill={color}
                fillOpacity={v > 0 ? 0.9 : 0.18}
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
        </svg>
      </div>
    </div>
  )
}

export default HeaderSparkline
