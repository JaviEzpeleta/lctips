"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import BlurryEntrance from "@/components/BlurryEntrance"
import NumberFlow from "@number-flow/react"
import { ChevronUp, ExternalLink } from "lucide-react"
import AddressOrProfile from "@/components/AddressOrProfile"
import StarWarsLoading from "@/components/StarWarsLoading"
import { Button } from "@/components/ui/button"
import { timeSince } from "@/lib/time"
import TransactionChart from "@/components/TransactionChart"
import {  formatLargeNumber } from "@/lib/utils"
import Link from "next/link"

import LensLogoSVG from "./LensLogoSVG"

interface RewardData {
  value: string
  to: string
  timestamp: string
  transactionHash: string
  batchId: number
  batchTotal: string
  percentageOfBatch: number
  batchDate: string
}

interface RewardsResponse {
  rewards: RewardData[]
}

interface AggregatedReward {
  value: string
  address: string
  txs: RewardData[]
  totalAmount: number
}

export default function RewardsPage() {
  const [totalRewards, setTotalRewards] = useState<number>(0)
  const [rewardsByAddress, setRewardsByAddress] = useState<AggregatedReward[]>(
    []
  )
  const [displayedRewards, setDisplayedRewards] = useState<AggregatedReward[]>(
    []
  )
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const observerTarget = useRef<HTMLDivElement>(null)

  const ITEMS_PER_PAGE = 30

  const toggleExpanded = (address: string) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(address)) {
        newSet.delete(address)
      } else {
        newSet.add(address)
      }
      return newSet
    })
  }

  const [batchStats, setBatchStats] = useState<{
    totalBatches: number
    avgRecipientsPerBatch: number
    avgAmountPerBatch: number
  }>({ totalBatches: 0, avgRecipientsPerBatch: 0, avgAmountPerBatch: 0 })

  useEffect(() => {
    async function fetchRewards() {
      try {
        const response = await fetch("/api/all-rewards")
        const data: RewardsResponse = await response.json()

        if (!response.ok) {
          console.error("Error fetching rewards:", data)
          // throw new Error(data || "Failed to fetch rewards")
        }

        // calculate total rewards
        const totalRewards = data.rewards.reduce(
          (acc, reward) => acc + Number(reward.value),
          0
        )
        setTotalRewards(totalRewards)

        // Calculate batch statistics
        const batchMap = new Map<
          number,
          { total: number; recipients: number }
        >()
        data.rewards.forEach((reward) => {
          if (!batchMap.has(reward.batchId)) {
            batchMap.set(reward.batchId, { total: 0, recipients: 0 })
          }
          const batch = batchMap.get(reward.batchId)!
          batch.total = Number(reward.batchTotal)
          batch.recipients += 1
        })

        const totalBatches = batchMap.size
        const avgRecipientsPerBatch =
          totalBatches > 0
            ? Array.from(batchMap.values()).reduce(
                (sum, batch) => sum + batch.recipients,
                0
              ) / totalBatches
            : 0
        const avgAmountPerBatch =
          totalBatches > 0
            ? Array.from(batchMap.values()).reduce(
                (sum, batch) => sum + batch.total,
                0
              ) /
              totalBatches /
              10 ** 18
            : 0

        setBatchStats({
          totalBatches,
          avgRecipientsPerBatch,
          avgAmountPerBatch,
        })

        // Aggregate rewards by address
        const rewardsMap: { [key: string]: AggregatedReward } = {}

        for (const reward of data.rewards) {
          if (!rewardsMap[reward.to]) {
            rewardsMap[reward.to] = {
              value: reward.value,
              address: reward.to,
              txs: [reward],
              totalAmount: Number(reward.value),
            }
          } else {
            rewardsMap[reward.to].txs.push(reward)
            rewardsMap[reward.to].totalAmount += Number(reward.value)
            rewardsMap[reward.to].value =
              rewardsMap[reward.to].totalAmount.toString()
          }
        }

        // Convert to array and sort by total amount descending
        const orderedRewardsByAddress = Object.values(rewardsMap).sort(
          (a, b) => b.totalAmount - a.totalAmount
        )

        setRewardsByAddress(orderedRewardsByAddress)

        // Initialize displayed rewards with first batch
        const initialBatch = orderedRewardsByAddress.slice(0, ITEMS_PER_PAGE)
        setDisplayedRewards(initialBatch)
        setHasMore(orderedRewardsByAddress.length > ITEMS_PER_PAGE)

      } catch (err) {
        console.error("Error fetching rewards:", err)
        setError(err instanceof Error ? err.message : "Failed to load rewards")
      } finally {
        setLoading(false)
      }
    }

    fetchRewards()
  }, [])

  const loadMore = () => {
    if (loadingMore || !hasMore) return

    setLoadingMore(true)

    // Simulate a small delay for smoother UX
    setTimeout(() => {
      const currentLength = displayedRewards.length
      const nextBatch = rewardsByAddress.slice(
        currentLength,
        currentLength + ITEMS_PER_PAGE
      )

      setDisplayedRewards((prev) => [...prev, ...nextBatch])
      setHasMore(currentLength + nextBatch.length < rewardsByAddress.length)

      setLoadingMore(false)
    }, 300)
  }

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, loadingMore, loading, displayedRewards.length])

  if (loading) {
    return (
      <StarWarsLoading />
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card className="">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
            <p className="text-zinc-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      {/* Fixed header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-md border-b border-white/10">
        <div className="max-w-4xl mx-auto flex items-center px-4 py-2">
          <Link href="/" className="flex items-center gap-2 text-white hover:text-indigo-300 transition-colors active:opacity-50">
            <span className="font-semibold text-sm">LCTips</span>
          </Link>
        </div>
      </div>

      <div className="container mx-auto sm:p-6 max-w-4xl pt-12">
      <BlurryEntrance>
        <div className="space-y-6">
          {/* Header */}
          <div className="text-lg sm:text-2xl font-semibold text-center">
            <div className="flex items-center justify-center gap-2">
              <LensLogoSVG className="w-8 h-8 sm:w-10 sm:h-10" />
              <div>Lens Rewards: ranks and stats</div>
            </div>
          </div>
         
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Card className="gap-0 bg-gradient-to-br overflow-hidden from-indigo-100 to-indigo-500 border-indigo-800 border-2 relative">
              <div className="absolute inset-0 z-0">
                <img
                  src="/img/19.webp"
                  className="w-full h-full object-cover scale-[150%] translate-y-4 -rotate-6 translate-x-4 opacity-30"
                />
              </div>
              <CardHeader className="pb-0 z-20">
                <CardTitle className="text-sm font-semibold text-black/80">
                  Total Recipients
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-black/80">
                  <NumberFlow value={rewardsByAddress.length} />
                </div>
              </CardContent>
            </Card>

            <Card className="gap-0 bg-gradient-to-br overflow-hidden from-emerald-100 to-emerald-300 border-emerald-500 border-2 relative">
              <div className="absolute inset-0 z-0 overflow-hidden">
                <img
                  src="/img/21.webp"
                  className="w-full h-full object-cover scale-[150%] translate-y-4 -rotate-6 translate-x-4 opacity-70"
                />
              </div>
              <CardHeader className="pb-0 z-20">
                <CardTitle className="text-sm font-semibold text-black/80">
                  Total Rewards Distributed
                </CardTitle>
              </CardHeader>
              <CardContent className="gap-0 z-10">
                <div className="text-3xl font-bold text-black/80">
                  <NumberFlow value={Math.floor(totalRewards / 10 ** 18)} />
                  <span className="text-lg ml-2 text-black/70">GHO</span>
                </div>
                <div className="text-sm font-semibold text-black/80">
                  Avg per recipient:{" "}
                  <span className="pr-0.5 font-black text-base">
                    {(
                      totalRewards /
                      rewardsByAddress.length /
                      10 ** 18
                    ).toFixed(2)}
                  </span>
                  GHO
                </div>
              </CardContent>
            </Card>

            {/* <Card className="gap-0 bg-gradient-to-br overflow-hidden from-purple-100 to-purple-300 border-purple-500 border-2 relative">
              <div className="absolute inset-0 z-0 overflow-hidden">
                <img
                  src="/img/18.webp"
                  className="w-full h-full object-cover scale-[150%] translate-y-4 -rotate-6 translate-x-4 opacity-50"
                />
              </div>
              <CardHeader className="pb-0 z-20">
                <CardTitle className="text-sm font-semibold text-black/80">
                  Reward Batches
                </CardTitle>
              </CardHeader>
              <CardContent className="gap-0 z-10">
                <div className="text-3xl font-bold text-black/80">
                  <NumberFlow value={batchStats.totalBatches} />
                  <span className="text-lg ml-2 text-black/70">batches</span>
                </div>
                <div className="text-sm font-semibold text-black/80">
                  Avg per batch:{" "}
                  <span className="pr-0.5 font-black text-base">
                    {batchStats.avgAmountPerBatch.toFixed(0)}
                  </span>
                  GHO
                </div>
              </CardContent>
            </Card> */}
          </div>

          {/* Rewards List */}
          <div className="space-y-4">
            {displayedRewards.length === 0 && !loading ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-zinc-500">No rewards found</p>
                </CardContent>
              </Card>
            ) : (
              displayedRewards.map((reward, index) => {
                const isExpanded = expandedCards.has(reward.address)
                const isFirstPlace = index === 0
                const isSecondPlace = index === 1
                const isThirdPlace = index === 2
                return (
                  <Card
                    key={reward.address}
                    className={`transition-all py-0! rounded-lg relative hover:shadow-md px-0 bg-gradient-to-br overflow-hidden ${
                      isFirstPlace
                        ? "from-yellow-100 via-amber-200 to-orange-200 shadow-lg py-4 shadow-yellow-500/30 ring-2 ring-yellow-400/50 ring-offset-2 ring-offset-transparent"
                        : isSecondPlace
                        ? "from-zinc-200 via-slate-300 to-zinc-300 shadow-lg py-4 shadow-zinc-500/30 ring-2 ring-zinc-400/50 ring-offset-2 ring-offset-transparent"
                        : isThirdPlace
                        ? "from-amber-100 via-orange-200 to-yellow-200 shadow-lg py-4 shadow-amber-500/30 ring-2 ring-amber-400/50 ring-offset-2 ring-offset-transparent"
                        : "from-zinc-400 to-zinc-100 border-zinc-800 border-2 py-0"
                    }`}
                  >
                    {isFirstPlace && (
                      <div className="absolute z-0 top-0 left-0 w-full h-full bg-gradient-to-br flex justify-center items-center pointer-events-none">
                        <div className="overflow-hidden w-40 opacity-20 pointer-events-none">
                          <img
                            src="/img/trophy.png"
                            className="scale-75 animate-slow-grow pointer-events-none"
                          />
                        </div>
                      </div>
                    )}
                    {isSecondPlace && (
                      <div className="absolute z-0 top-0 left-0 w-full h-full bg-gradient-to-br flex justify-center items-center pointer-events-none">
                        <div className="text-8xl opacity-20 animate-slow-grow pointer-events-none">
                          🥈
                        </div>
                      </div>
                    )}
                    {isThirdPlace && (
                      <div className="absolute z-0 top-0 left-0 w-full h-full bg-gradient-to-br flex justify-center items-center pointer-events-none">
                        <div className="text-8xl opacity-20 animate-slow-grow pointer-events-none">
                          🥉
                        </div>
                      </div>
                    )}
                    <CardContent className="px-0 sm:px-4 py-2 z-20">
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => toggleExpanded(reward.address)}
                      >
                        <div className="flex items-center space-x-2">
                          <div
                            className={`backdrop-blur-sm font-semibold rounded-sm px-1 text-center absolute left-0.5 top-0.5 shadow-sm z-50 ${
                              isFirstPlace
                                ? "text-sm sm:text-lg text-yellow-900 bg-gradient-to-br from-yellow-200 to-amber-300 border-[1px] border-yellow-600 shadow-yellow-800/50 font-black"
                                : isSecondPlace
                                ? "text-xs sm:text-sm text-zinc-900 bg-gradient-to-br from-zinc-200 to-slate-300 border-[1px] border-zinc-600 shadow-zinc-800/50 font-black"
                                : isThirdPlace
                                ? "text-xs sm:text-sm text-amber-900 bg-gradient-to-br from-amber-200 to-orange-300 border-[1px] border-amber-600 shadow-amber-800/50 font-black"
                                : "text-xs sm:text-sm text-zinc-800 bg-white/20 border-[0.66px] border-zinc-800/30 shadow-black/30"
                            }`}
                          >
                            #{index + 1}
                            {isSecondPlace && " 🥈"}
                            {isThirdPlace && " 🥉"}
                          </div>

                          <AddressOrProfile
                            address={reward.address}
                            reward={reward}
                          />
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-lg font-bold">
                              {formatLargeNumber(reward.totalAmount / 10 ** 18)}
                              {/* <NumberFlow
                                value={reward.totalAmount / 10 ** 18}
                                format={{
                                  minimumFractionDigits: 3,
                                  maximumFractionDigits: 3,
                                }}
                              /> */}
                              <span className="text-sm text-zinc-500 ml-1">
                                GHO
                              </span>
                            </div>
                            {/* <p className="text-xs text-zinc-500">
                              {reward.txs.length} transaction
                              {reward.txs.length !== 1 ? "s" : ""}
                            </p> */}
                            {/* Small chart in collapsed state */}
                            <div className="opacity-70 relative z-30">
                              <TransactionChart
                                transactions={reward.txs}
                                isSmall={true}
                                className="rounded pointer"
                              />
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="iconSm"
                            className="rounded-full hover:scale-110 active:scale-95 transition-transform duration-100 active:opacity-50"
                          >
                            <ChevronUp
                              className={`h-5 w-5 scale-125 text-zinc-400 transition-transform duration-200 ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="py-2 space-y-1">
                          {/* <h4 className="text-sm font-semibold text-zinc-600 mb-3">
                            Transaction Details
                          </h4> */}
                          {/* Large chart in expanded state with dual lines */}
                          <div className="pt-2 pb-0 pl-0 px-4 bg-white/20 rounded-lg relative z-30">
                            <TransactionChart
                              transactions={reward.txs}
                              isSmall={false}
                              showDualLines={true}
                              className="rounded pointer"
                            />
                          </div>
                          {reward.txs
                            .sort(
                              (a, b) =>
                                new Date(b.timestamp).getTime() -
                                new Date(a.timestamp).getTime()
                            )
                            .map((tx, txIndex) => (
                              <div
                                key={`${tx.transactionHash}-${txIndex}`}
                                className="flex items-center justify-between p-3 bg-white/40 rounded-lg hover:bg-zinc-100 transition-colors"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium font-mono">
                                      <span className="font-mono">
                                        {formatLargeNumber(
                                          Number(tx.value) / 10 ** 18
                                        )}
                                      </span>
                                      <span className="text-zinc-500 ml-1">
                                        GHO
                                      </span>
                                    </span>
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                                      {tx.percentageOfBatch.toFixed(2)}% of $
                                      {
                                        // batch total

                                        (
                                          Number(tx.batchTotal) /
                                          10 ** 18
                                        ).toLocaleString("en-US", {
                                          minimumFractionDigits: 0,
                                          maximumFractionDigits: 2,
                                        })
                                      }
                                    </span>
                                  </div>
                                  <p className="text-xs text-zinc-500 mt-1">
                                    {new Date(tx.timestamp).toLocaleString()} (
                                    {timeSince(
                                      new Date(tx.timestamp).getTime()
                                    )}
                                    )
                                  </p>
                                </div>
                                <Link
                                  href={`https://explorer.lens.xyz/tx/${tx.transactionHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  // className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Button variant="outline">
                                    <span className="text-xs font-mono hidden sm:block">
                                      {tx.transactionHash.slice(0, 6)}...
                                      {tx.transactionHash.slice(-4)}
                                    </span>
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                </Link>
                              </div>
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}

            {/* Loading more indicator */}
            {hasMore && (
              <div ref={observerTarget} className="flex justify-center py-8">
                {loadingMore && (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
                    <span className="text-zinc-600">
                      Loading more rewards...
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </BlurryEntrance>
    </div>
    </>
  )
}
