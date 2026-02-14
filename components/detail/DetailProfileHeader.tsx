"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface DetailProfileHeaderProps {
  profileData: any
  handle: string
  transferCount: number
  isStreaming?: boolean
}

const DetailProfileHeader = ({
  profileData,
  handle,
  transferCount,
  isStreaming,
}: DetailProfileHeaderProps) => {
  return (
    <div className="border-2 border-zinc-950 bg-black/30 rounded-xl p-3 mb-4">
      <div className="flex items-center gap-3">
        <Link
          href={`/u/${handle}`}
          className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors active:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="w-10 h-10 rounded-full flex-shrink-0 outline-2 outline-black"
            style={{
              backgroundImage: `url(${
                profileData?.metadata?.picture || "/img/default-avatar.png"
              })`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="min-w-0">
            <div className="text-base font-bold truncate">
              {profileData?.metadata?.name || handle}
            </div>
            <div className="flex items-center gap-1.5">
              <Link
                href={`/u/${handle}`}
                className="text-indigo-300 text-sm font-semibold hover:text-indigo-200 transition-colors"
              >
                @{handle}
              </Link>
              <span className="text-[11px] text-zinc-500">
                {transferCount} transfers
                {isStreaming && (
                  <span className="text-indigo-400 ml-1 animate-pulse">
                    loading…
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DetailProfileHeader
