"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import NumberFlow from "@number-flow/react"
import { formatLargeNumber } from "@/lib/utils"

interface ProfileHeaderProps {
  profileData: {
    metadata: {
      name: string
      picture: string
    }
  }
  handle: string
  totalIncomeAmount: number
  totalOutcomeAmount: number
  totalBonsaiIncomeAmount: number
  totalBonsaiOutcomeAmount: number
  totalPointlessIncomeAmount: number
  totalPointlessOutcomeAmount: number
  isHovering: boolean
  setIsHovering: (value: boolean) => void
}

const ProfileHeader = ({
  profileData,
  handle,
  totalIncomeAmount,
  totalOutcomeAmount,
  totalBonsaiIncomeAmount,
  totalBonsaiOutcomeAmount,
  totalPointlessIncomeAmount,
  totalPointlessOutcomeAmount,
  isHovering,
  setIsHovering,
}: ProfileHeaderProps) => {
  return (
    <div className="border-2 sm:border-4 px-2 sm:p-2 rounded-l-xl rounded-r-[8px] sm:rounded-xl flex flex-col sm:flex-row overflow-hidden justify-between items-center gap-2 sm:gap-0 border-zinc-950 bg-black/30 mb-4">
      <div className="flex flex-row items-center gap-2 relative z-10 sm:flex-none">
        <div className="flex flex-row items-center gap-2 relative z-10">
          <div className="relative z-20">
            <div className="relative z-20">
              <div
                className="w-9 sm:w-16 h-9 sm:h-16 rounded-full z-20 outline-2 outline-black"
                style={{
                  backgroundImage: `url(${
                    profileData.metadata && profileData.metadata.picture
                      ? profileData.metadata.picture
                      : "/img/default-avatar.png"
                  })`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            </div>
          </div>
          <div className="flex-1">
            <div className="text-base sm:text-xl font-bold w-32 sm:w-44 truncate text-ellipsis">
              {profileData.metadata.name}
            </div>
            <Link
              className="text-indigo-300 group inline-block font-semibold hover:text-indigo-200 active:opacity-50 active:scale-95 transition-all"
              target="_blank"
              href={`https://pingpad.io/u/${handle}`}
              onMouseEnter={() => {
                setIsHovering(true)
              }}
              onMouseLeave={() => {
                setIsHovering(false)
              }}
            >
              <div className="flex items-center gap-0.5">
                <div className="translate-y-[1px] transition-all">
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
                <div className="text-sm sm:text-base">{handle}</div>
              </div>
            </Link>
          </div>
        </div>
        <div className="absolute inset-0 flex -z-0 justify-center items-center pointer-events-none">
          <img
            src={profileData.metadata.picture}
            alt={profileData.metadata.name}
            className="w-16 scale-[500%] -translate-x-12 blur-[4px] brightness-[0.5] z-0 h-16 rounded-full outline-2 outline-black"
          />
        </div>
      </div>
      <div className="flex flex-row gap-4 w-full sm:w-auto sm:flex-none">
      <div className="flex flex-col justify-center items-center z-10 flex-1 sm:flex-none">
        <div className="text-[8px] sm:text-[10px] translate-y-1 sm:translate-y-0.5 font-normal opacity-70 uppercase tracking-wider">
          Received
        </div>
        <div className="text-base h-6 sm:h-auto sm:text-2xl font-bold tracking-tight tabular-nums sm:min-w-32 px-2 text-center flex items-center justify-center gap-0.5">
          {totalIncomeAmount >= 10000 ? (
            formatLargeNumber(totalIncomeAmount)
          ) : (
            <NumberFlow
              value={totalIncomeAmount}
              digits={{
                // Record<number, { max?: number }>
                6: { max: 6 },
              }}
            />
          )}
          <img
            src="/gho-icon.png"
            className="w-3 h-3 sm:w-4 sm:h-4 rounded-full"
            alt="GHO"
          />
        </div>

        {totalPointlessIncomeAmount > 0 && (
          <div className="text-base h-6 sm:h-auto sm:text-2xl font-bold tracking-tight tabular-nums sm:min-w-32 px-2 text-center flex items-center justify-center gap-0.5">
            {totalPointlessIncomeAmount >= 10000 ? (
              formatLargeNumber(totalPointlessIncomeAmount)
            ) : (
              <NumberFlow
                value={totalPointlessIncomeAmount}
                digits={{
                  6: { max: 6 },
                }}
              />
            )}
            <img
              src="/img/pointless-logo.webp"
              className="w-3 h-3 sm:w-4 sm:h-4 rounded-full"
              alt="POINTLESS"
            />
          </div>
        )}

        {totalBonsaiIncomeAmount > 0 && (
          <div className="text-base h-6 sm:h-auto sm:text-2xl font-bold tracking-tight tabular-nums sm:min-w-32 px-2 text-center flex items-center justify-center gap-0.5">
            {totalBonsaiIncomeAmount >= 10000 ? (
              formatLargeNumber(totalBonsaiIncomeAmount)
            ) : (
              <NumberFlow
                value={totalBonsaiIncomeAmount}
                digits={{
                  6: { max: 6 },
                }}
              />
            )}
            <img
              src="/img/bonsai-logo.webp"
              className="w-3 h-3 sm:w-4 sm:h-4"
              alt="BONSAI"
            />
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center items-center flex-1 sm:flex-none">
        <div className="text-[8px] sm:text-[10px] translate-y-1 sm:translate-y-0.5 font-normal opacity-70 uppercase tracking-wider">
          Sent
        </div>
        <div className="text-base h-6 sm:h-auto sm:text-2xl font-bold tracking-tight tabular-nums sm:min-w-32 px-2 text-center flex items-center justify-center gap-0.5">
          {totalOutcomeAmount >= 10000 ? (
            formatLargeNumber(totalOutcomeAmount)
          ) : (
            <NumberFlow
              value={totalOutcomeAmount}
              digits={{
                // Record<number, { max?: number }>
                6: { max: 6 },
              }}
            />
          )}
          <img
            src="/gho-icon.png"
            className="w-3 h-3 sm:w-4 sm:h-4 rounded-full"
            alt="GHO"
          />
        </div>

        {totalPointlessOutcomeAmount > 0 && (
          <div className="text-base h-6 sm:h-auto sm:text-2xl font-bold tracking-tight tabular-nums sm:min-w-32 px-2 text-center flex items-center justify-center gap-0.5">
            {totalPointlessOutcomeAmount >= 10000 ? (
              formatLargeNumber(totalPointlessOutcomeAmount)
            ) : (
              <NumberFlow
                value={totalPointlessOutcomeAmount}
                digits={{
                  6: { max: 6 },
                }}
              />
            )}
            <img
              src="/img/pointless-logo.webp"
              className="w-3 h-3 sm:w-4 sm:h-4 rounded-full"
              alt="POINTLESS"
            />
          </div>
        )}

        {totalBonsaiOutcomeAmount > 0 && (
          <div className="text-base h-6 sm:h-auto sm:text-2xl font-bold tracking-tight tabular-nums sm:min-w-32 px-2 text-center flex items-center justify-center gap-0.5">
            {totalBonsaiOutcomeAmount >= 10000 ? (
              formatLargeNumber(totalBonsaiOutcomeAmount)
            ) : (
              <NumberFlow
                value={totalBonsaiOutcomeAmount}
                digits={{
                  6: { max: 6 },
                }}
              />
            )}
            <img
              src="/img/bonsai-logo.webp"
              className="w-3 h-3 sm:w-4 sm:h-4"
              alt="BONSAI"
            />
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

export default ProfileHeader
