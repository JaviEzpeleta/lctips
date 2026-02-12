"use client"

import { GroupedTotal } from "@/app/api/profile/route"
import { formatLargeNumber } from "@/lib/utils"
import { motion } from "framer-motion"
import Link from "next/link"
import { useState } from "react"

const TipFromUserRow = ({
  transfer,
  index,
  tokenSymbol = "GHO",
}: {
  transfer: GroupedTotal
  index: number
  tokenSymbol?: string
}) => {
  const profileData = transfer.profileData

  const [isHovering, setIsHovering] = useState(false)

  const ghoAmountFormatted = formatLargeNumber(Number(transfer.totals))

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.02 }}
    >
      <div className="flex justify-between">
        <div className="flex flex-row items-center gap-2">
          <div>
            <Link
              className="outline outline-offset-2 hover:outline-yellow-300
              hover:scale-[115%] active:scale-[102%] 
               outline-transparent rounded-md block !duration-100 !transition-all active:opacity-50"
              href={`/u/${profileData.username.localName}`}
            >
              <div
                className="w-10 h-10 rounded-md"
                style={{
                  backgroundImage: `url(${profileData.metadata.picture})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            </Link>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-extrabold h-6">
              <Link
                href={`/u/${profileData.username.localName}`}
                className="hover:text-yellow-300 active:opacity-50 inline-block w-52 sm:w-full truncate text-ellipsis"
              >
                {profileData.metadata.name}
              </Link>
            </div>
            {profileData.username && (
              <Link
                className="text-indigo-300 group inline-block font-semibold hover:text-indigo-400 active:opacity-50 transition-all"
                target="_blank"
                href={`https://pingpad.io/u/${profileData.username.localName}`}
                onMouseEnter={() => {
                  setIsHovering(true)
                }}
                onMouseLeave={() => {
                  setIsHovering(false)
                }}
              >
                <div className="flex items-center gap-0.5">
                  <div className="translate-y-[0.5px] grayscale group-hover:grayscale-0 transition-all">
                    <motion.svg
                      width="493"
                      height="487"
                      viewBox="0 0 493 487"
                      fill="none"
                      className="w-3 h-3 text-indigo-100 group-hover:text-yellow-100"
                      animate={{
                        rotate: isHovering ? 360 : 0,
                        scale: isHovering ? 1.2 : 1,
                      }}
                    >
                      <path
                        d="M350.5 426.182C299 459.5 215 476 128.486 426.182C97.8615 470.932 28 464.172 28 434.339C28 404.506 44.5 269 68 170C163.082 -74.5 499 24.9999 462 269C443.627 390.161 319.238 339.11 336.373 269M336.373 269C374.653 112.375 191.131 100.278 163.082 236.905C132.458 386.071 307.275 388.055 336.373 269Z"
                        stroke="currentColor"
                        strokeWidth="56"
                        strokeLinecap="round"
                      />
                    </motion.svg>
                  </div>
                  <div className="text-sm">
                    {profileData.username.localName}
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
        <Link
          target="_blank"
          href={`https://explorer.lens.xyz/address/${transfer.from}#transfers`}
          className="flex active:opacity-50 transition-all duration-100 flex-row items-baseline pt-1 bg-transparent hover:bg-zinc-800 rounded-md h-10 px-1"
        >
          <div
            className="text-sm opacity-70 uppercase tracking-wider"
            style={{
              fontFamily: "monospace",
            }}
          >
            {tokenSymbol === "BONSAI" || tokenSymbol === "POINTLESS" ? "" : "$"}
          </div>
          <div className="text-2xl font-extrabold tabular-nums tracking-tight">
            {ghoAmountFormatted}
          </div>
          {tokenSymbol === "BONSAI" ? (
            <img
              src="/img/bonsai-logo.webp"
              className="ml-1 w-4 h-4"
              alt="BONSAI"
            />
          ) : tokenSymbol === "POINTLESS" ? (
            <img
              src="/img/pointless-logo.webp"
              className="ml-1 w-4 h-4 rounded-full"
              alt="POINTLESS"
            />
          ) : (
            <img src="/gho-icon.png" className="ml-1 w-4 h-4 rounded-full" />
          )}
        </Link>
      </div>
    </motion.div>
  )
}

export default TipFromUserRow
