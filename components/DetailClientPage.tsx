"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import DefaultLoadingMini from "./DefaultLoadingMini"
import BlurryEntrance from "./BlurryEntrance"
import DetailProfileHeader from "./detail/DetailProfileHeader"
import TipCalendar from "./detail/TipCalendar"
import DetailTransferRow from "./detail/DetailTransferRow"
import ProfileNotFound from "./ProfileNotFound"
import { ArrowUpRight, ArrowDownLeft } from "lucide-react"
import { useProgressiveTransfers } from "@/hooks/useProgressiveTransfers"
import toast from "react-hot-toast"

const TOKEN_FILTERS = ["All", "GHO", "BONSAI", "POINTLESS"] as const
type TokenFilter = (typeof TOKEN_FILTERS)[number]

const ITEMS_PER_PAGE = 50

const DetailClientPage = ({ handle }: { handle: string }) => {
  const {
    transfers: allTransfers,
    datesWithTips: datesWithTipsSet,
    isLoadingPage,
    isAutoLoading,
    isDone,
    currentPage,
    loadMorePages,
    profileData: progressiveProfileData,
    profileNotFound: progressiveProfileNotFound,
  } = useProgressiveTransfers(handle)

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [basicProfileData, setBasicProfileData] = useState<any>(null)
  const [tokenFilter, setTokenFilter] = useState<TokenFilter>("All")
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)
  const [visibleCountSent, setVisibleCountSent] = useState(ITEMS_PER_PAGE)
  const [visibleCountReceived, setVisibleCountReceived] = useState(ITEMS_PER_PAGE)

  const basicProfileRef = useRef(false)

  // Use progressive profile data when available, fall back to basic profile
  const profileData = progressiveProfileData || basicProfileData

  const isInitialLoading = currentPage === 0 && isLoadingPage
  const isStreaming = isLoadingPage || isAutoLoading

  // Fetch basic profile for fast header render
  useEffect(() => {
    if (!handle || basicProfileRef.current) return
    basicProfileRef.current = true
    const fetchBasic = async () => {
      try {
        const res = await fetch("/api/basic-profile", {
          method: "POST",
          body: JSON.stringify({ handle }),
        })
        const data = await res.json()
        if (data.profile) {
          setBasicProfileData(data.profile)
          console.log("👤✅ [detail] Basic profile loaded:", data.profile)
        }
      } catch (err) {
        console.error("👤❌ [detail] Basic profile fetch failed:", err)
        toast.error("Couldn't load quick profile")
      }
    }
    fetchBasic()
  }, [handle])

  // Reset visible counts when filters change
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE)
    setVisibleCountSent(ITEMS_PER_PAGE)
    setVisibleCountReceived(ITEMS_PER_PAGE)
  }, [selectedDate, tokenFilter])

  const filteredTransfers = useMemo(() => {
    let result = allTransfers

    // Filter by token
    if (tokenFilter !== "All") {
      result = result.filter((t) => {
        if (tokenFilter === "GHO") return t.symbol === "WGHO" || t.symbol === "ETH"
        if (tokenFilter === "BONSAI") return t.symbol === "BONSAI"
        if (tokenFilter === "POINTLESS") return t.symbol === "pointless"
        return true
      })
    }

    // Filter by selected date
    if (selectedDate) {
      result = result.filter((t) => {
        const d = new Date(t.timestamp)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
        return key === selectedDate
      })
    }

    return result
  }, [allTransfers, tokenFilter, selectedDate])

  const sentTransfers = useMemo(
    () => filteredTransfers.filter((t) => t.direction === "outcome"),
    [filteredTransfers]
  )

  const receivedTransfers = useMemo(
    () => filteredTransfers.filter((t) => t.direction === "income"),
    [filteredTransfers]
  )

  // Mobile: mixed list pagination
  const visibleTransfers = filteredTransfers.slice(0, visibleCount)
  const hasMore = visibleCount < filteredTransfers.length

  // XL: per-column pagination
  const visibleSent = sentTransfers.slice(0, visibleCountSent)
  const hasMoreSent = visibleCountSent < sentTransfers.length

  const visibleReceived = receivedTransfers.slice(0, visibleCountReceived)
  const hasMoreReceived = visibleCountReceived < receivedTransfers.length

  if (progressiveProfileNotFound) {
    return <ProfileNotFound handle={handle} />
  }

  if (isInitialLoading && !profileData) {
    return (
      <div className="pb-24">
        <DefaultLoadingMini />
      </div>
    )
  }

  const streamingIndicator = isStreaming && (
    <span className="text-indigo-400 ml-1 text-[11px] animate-pulse">
      (loading…)
    </span>
  )

  const loadMorePagesButton = !isDone && !isAutoLoading && (
    <button
      onClick={loadMorePages}
      disabled={isLoadingPage}
      className="w-full mt-4 py-2.5 text-sm text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 ring-1 ring-indigo-500/20 rounded-lg transition-colors disabled:opacity-50"
    >
      {isLoadingPage ? "Loading…" : "Load more pages"}
    </button>
  )

  const tokenFilterTabs = (
    <div className="flex gap-1 mb-3 overflow-x-auto scrollbar-hide">
      {TOKEN_FILTERS.map((filter) => (
        <button
          key={filter}
          onClick={() => setTokenFilter(filter)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex-shrink-0 ${
            tokenFilter === filter
              ? "bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30"
              : "bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800/50"
          }`}
        >
          <div className="flex items-center gap-1">
            {filter !== "All" && (
              <img
                src={
                  filter === "GHO"
                    ? "/gho-icon.png"
                    : filter === "BONSAI"
                      ? "/img/bonsai-logo.webp"
                      : "/img/pointless-logo.webp"
                }
                className="w-3 h-3 rounded-full"
                alt={filter}
              />
            )}
            {filter}
          </div>
        </button>
      ))}
    </div>
  )

  return (
    <div className="p-2">
      <BlurryEntrance>
        {profileData && (
          <DetailProfileHeader
            profileData={profileData}
            handle={handle}
            transferCount={allTransfers.length}
            isStreaming={isStreaming}
          />
        )}
      </BlurryEntrance>

      {isInitialLoading ? (
        <DefaultLoadingMini />
      ) : (
        <>
          {/* ── Mobile layout (below xl) ── */}
          <div className="xl:hidden">
            <BlurryEntrance delay={0.05}>
              <TipCalendar
                currentMonth={currentMonth}
                setCurrentMonth={setCurrentMonth}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                datesWithTips={datesWithTipsSet}
              />
            </BlurryEntrance>

            <BlurryEntrance delay={0.1}>
              {tokenFilterTabs}
            </BlurryEntrance>

            {/* Transfer count */}
            <div className="text-xs text-zinc-500 mb-2 px-2">
              {filteredTransfers.length} transfer
              {filteredTransfers.length !== 1 ? "s" : ""}
              {selectedDate && (
                <span>
                  {" "}
                  on {selectedDate}
                </span>
              )}
              {streamingIndicator}
            </div>

            {/* Transfer list */}
            <div className="space-y-0.5">
              {visibleTransfers.map((transfer, index) => (
                <DetailTransferRow
                  key={`${transfer.transactionHash}-${transfer.direction}-${transfer.symbol}`}
                  transfer={transfer}
                  index={index}
                />
              ))}
            </div>

            {filteredTransfers.length === 0 && !isStreaming && (
              <div className="text-center py-12 text-zinc-500 text-sm">
                No transfers found
              </div>
            )}

            {hasMore && (
              <button
                onClick={() =>
                  setVisibleCount((prev) => prev + ITEMS_PER_PAGE)
                }
                className="w-full mt-4 py-2 text-sm text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800/50 rounded-lg transition-colors"
              >
                Load more ({filteredTransfers.length - visibleCount} remaining)
              </button>
            )}

            {loadMorePagesButton}
          </div>

          {/* ── XL 3-Column Dashboard layout ── */}
          <div className="hidden xl:block">
            {filteredTransfers.length === 0 && !isStreaming ? (
              <BlurryEntrance delay={0.05}>
                <div className="grid grid-cols-[300px_1fr] gap-6 items-start">
                  <div>
                    <TipCalendar
                      currentMonth={currentMonth}
                      setCurrentMonth={setCurrentMonth}
                      selectedDate={selectedDate}
                      setSelectedDate={setSelectedDate}
                      datesWithTips={datesWithTipsSet}
                    />
                    <div className="mt-3">
                      {tokenFilterTabs}
                      <div className="text-xs text-zinc-500 px-2">
                        0 transfers
                        {selectedDate && <span> on {selectedDate}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-center py-12 text-zinc-500 text-sm">
                    No transfers found
                  </div>
                </div>
              </BlurryEntrance>
            ) : (
              <div className="grid grid-cols-[300px_1fr_1fr] gap-6 items-start">
                {/* Left column — Calendar sidebar */}
                <BlurryEntrance delay={0.05}>
                  <div className="sticky top-4">
                    <TipCalendar
                      currentMonth={currentMonth}
                      setCurrentMonth={setCurrentMonth}
                      selectedDate={selectedDate}
                      setSelectedDate={setSelectedDate}
                      datesWithTips={datesWithTipsSet}
                    />
                    <div className="mt-3">
                      {tokenFilterTabs}
                      <div className="text-xs text-zinc-500 px-2">
                        {filteredTransfers.length} transfer
                        {filteredTransfers.length !== 1 ? "s" : ""}
                        {selectedDate && <span> on {selectedDate}</span>}
                        {streamingIndicator}
                      </div>
                    </div>
                  </div>
                </BlurryEntrance>

                {/* Middle column — Sent */}
                <BlurryEntrance delay={0.1}>
                  <div>
                    <div className="flex items-center gap-2 mb-3 px-2">
                      <div className="w-6 h-6 rounded-full bg-orange-500/15 flex items-center justify-center">
                        <ArrowUpRight className="w-3.5 h-3.5 text-orange-400" />
                      </div>
                      <span className="text-sm font-semibold text-orange-300">
                        Sent
                      </span>
                      <span className="text-xs text-zinc-500">
                        {sentTransfers.length}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {visibleSent.map((transfer, index) => (
                        <DetailTransferRow
                          key={`sent-${transfer.transactionHash}-${transfer.direction}-${transfer.symbol}`}
                          transfer={transfer}
                          index={index}
                        />
                      ))}
                    </div>
                    {sentTransfers.length === 0 && !isStreaming && (
                      <div className="text-center py-8 text-zinc-600 text-sm">
                        No sent transfers
                      </div>
                    )}
                    {hasMoreSent && (
                      <button
                        onClick={() =>
                          setVisibleCountSent((prev) => prev + ITEMS_PER_PAGE)
                        }
                        className="w-full mt-4 py-2 text-sm text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800/50 rounded-lg transition-colors"
                      >
                        Load more ({sentTransfers.length - visibleCountSent} remaining)
                      </button>
                    )}
                  </div>
                </BlurryEntrance>

                {/* Right column — Received */}
                <BlurryEntrance delay={0.15}>
                  <div>
                    <div className="flex items-center gap-2 mb-3 px-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center">
                        <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <span className="text-sm font-semibold text-emerald-300">
                        Received
                      </span>
                      <span className="text-xs text-zinc-500">
                        {receivedTransfers.length}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {visibleReceived.map((transfer, index) => (
                        <DetailTransferRow
                          key={`recv-${transfer.transactionHash}-${transfer.direction}-${transfer.symbol}`}
                          transfer={transfer}
                          index={index}
                        />
                      ))}
                    </div>
                    {receivedTransfers.length === 0 && !isStreaming && (
                      <div className="text-center py-8 text-zinc-600 text-sm">
                        No received transfers
                      </div>
                    )}
                    {hasMoreReceived && (
                      <button
                        onClick={() =>
                          setVisibleCountReceived((prev) => prev + ITEMS_PER_PAGE)
                        }
                        className="w-full mt-4 py-2 text-sm text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800/50 rounded-lg transition-colors"
                      >
                        Load more ({receivedTransfers.length - visibleCountReceived} remaining)
                      </button>
                    )}
                  </div>
                </BlurryEntrance>
              </div>
            )}

            {/* Load more pages button below XL columns */}
            {loadMorePagesButton}
          </div>
        </>
      )}
    </div>
  )
}

export default DetailClientPage
