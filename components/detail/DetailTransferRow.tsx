"use client"

import { DetailTransfer } from "@/lib/types"
import { formatLargeNumber, formatRelativeTime } from "@/lib/utils"
import { motion } from "framer-motion"
import { ArrowDownLeft, ArrowUpRight, ExternalLink } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { memo, useState } from "react"
import { useProfileByAddress } from "@/hooks/useProfileByAddress"

const sourceChipClasses: Record<string, string> = {
  profile_tip: "bg-orange-500/10 text-orange-300 border-orange-500/20",
  post_tip: "bg-purple-500/10 text-purple-300 border-purple-500/20",
  collect: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  fundraising: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  prediction: "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20",
  competition: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
  unknown_post_action: "bg-zinc-700/30 text-zinc-300 border-zinc-600/40",
  unknown_account_action: "bg-zinc-700/30 text-zinc-300 border-zinc-600/40",
  known_system_transfer: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  swap: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
  bridge: "bg-teal-500/10 text-teal-300 border-teal-500/20",
  unknown: "bg-zinc-800/60 text-zinc-400 border-zinc-700/60",
}

const DetailTransferRow = ({
  transfer,
  index,
}: {
  transfer: DetailTransfer
  index: number
}) => {
  const profileData = useProfileByAddress(transfer.counterpartyAddress)
  const [isHovering, setIsHovering] = useState(false)

  const isIncome = transfer.direction === "income"
  const amountNum = Number(transfer.amount)
  const formattedAmount = formatLargeNumber(amountNum)
  const timestamp = new Date(transfer.timestamp)
  const formattedTime = formatRelativeTime(timestamp)
  const fullTimestamp = format(timestamp, "MMM d, yyyy 'at' HH:mm")
  const source = transfer.source ?? {
    kind: "unknown",
    label: "Unknown",
    confidence: "unknown",
  }
  const sourceTitle = source.contractLabel
    ? `${source.label} via ${source.contractLabel}`
    : source.label

  const getTokenIcon = (symbol: string) => {
    switch (symbol) {
      case "BONSAI":
        return "/img/bonsai-logo.webp"
      case "pointless":
        return "/img/pointless-logo.webp"
      default:
        return "/gho-icon.png"
    }
  }

  const shortAddress = transfer.counterpartyAddress
    ? `${transfer.counterpartyAddress.slice(0, 6)}...${transfer.counterpartyAddress.slice(-4)}`
    : "Unknown"

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: Math.min(index * 0.015, 0.6) }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="group"
    >
      <div className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-zinc-900/50 transition-colors">
        {/* Direction icon */}
        <div
          className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
            isIncome ? "bg-emerald-500/15" : "bg-orange-500/15"
          }`}
        >
          {isIncome ? (
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <ArrowUpRight className="w-3.5 h-3.5 text-orange-400" />
          )}
        </div>

        {/* Profile info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {profileData ? (
              <>
                <Link
                  href={`/u/${profileData.username.localName}`}
                  className="flex items-center gap-1.5 min-w-0"
                >
                  <div
                    className="w-6 h-6 rounded-full flex-shrink-0"
                    style={{
                      backgroundImage: `url(${profileData.metadata.picture})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  <span className="text-sm font-semibold truncate hover:text-yellow-300 transition-colors">
                    {profileData.username.localName}
                  </span>
                </Link>
              </>
            ) : (
              <span className="text-sm font-mono text-zinc-500 truncate">
                {shortAddress}
              </span>
            )}
          </div>
          <div
            className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[11px] text-zinc-500"
            title={fullTimestamp}
          >
            <span>{formattedTime}</span>
            <span className="text-zinc-700">·</span>
            <span
              className={`inline-flex max-w-full items-center rounded-full border px-1.5 py-0.5 leading-none ${
                sourceChipClasses[source.kind] ?? sourceChipClasses.unknown
              }`}
              title={sourceTitle}
            >
              {source.label}
            </span>
          </div>
        </div>

        {/* Amount */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span
            className={`text-sm font-bold tabular-nums ${
              isIncome ? "text-emerald-300" : "text-orange-300"
            }`}
          >
            {isIncome ? "+" : "-"}
            {transfer.symbol === "BONSAI" || transfer.symbol === "pointless"
              ? ""
              : "$"}
            {formattedAmount}
          </span>
          <img
            src={getTokenIcon(transfer.symbol)}
            className="w-4 h-4 rounded-full"
            alt={transfer.symbol}
          />
        </div>

        {/* Explorer link on hover */}
        <Link
          href={`https://explorer.lens.xyz/tx/${transfer.transactionHash}`}
          target="_blank"
          className={`flex-shrink-0 p-1 rounded transition-opacity ${
            isHovering ? "opacity-50 hover:opacity-100" : "opacity-0"
          }`}
        >
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </motion.div>
  )
}

export default memo(DetailTransferRow)
