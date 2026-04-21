"use client"

import { formatLargeNumber } from "@/lib/utils"

interface TokenTotal {
  displayName: string
  icon: string
  sent: number
  received: number
  isDollar: boolean
}

const TotalsSummary = ({
  tokenTotals,
  isStreaming,
}: {
  tokenTotals: TokenTotal[]
  isStreaming: boolean
}) => {
  if (tokenTotals.length === 0) return null

  return (
    <div className="bg-black/30 rounded-xl p-3 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
          Totals
        </span>
        {isStreaming && (
          <span className="text-[9px] font-medium text-indigo-400 bg-indigo-500/15 px-1.5 py-0.5 rounded-full animate-pulse">
            live
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {tokenTotals.map((token) => (
          <div key={token.displayName} className="flex items-center gap-2">
            <img
              src={token.icon}
              className="w-4 h-4 rounded-full flex-shrink-0"
              alt={token.displayName}
            />
            <span className="text-[11px] text-zinc-400 w-[52px] flex-shrink-0">
              {token.displayName}
            </span>
            <div className="flex items-center gap-3 text-[11px] tabular-nums">
              {token.sent > 0 && (
                <span className="text-orange-300">
                  -{token.isDollar ? "$" : ""}
                  {formatLargeNumber(token.sent)}
                </span>
              )}
              {token.received > 0 && (
                <span className="text-emerald-300">
                  +{token.isDollar ? "$" : ""}
                  {formatLargeNumber(token.received)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TotalsSummary
