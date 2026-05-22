"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import DefaultLoadingMini from "./DefaultLoadingMini"
import Link from "next/link"
import BlurryEntrance from "./BlurryEntrance"
import DetailProfileHeader from "./detail/DetailProfileHeader"
import TipCalendar from "./detail/TipCalendar"
import DetailTransferRow from "./detail/DetailTransferRow"
import TotalsSummary from "./detail/TotalsSummary"
import TopCounterparties from "./detail/TopCounterparties"
import ProfileNotFound from "./ProfileNotFound"
import { ArrowUpRight, ArrowDownLeft } from "lucide-react"
import { useProgressiveTransfers } from "@/hooks/useProgressiveTransfers"
import { getCachedProfile, loadBatchProfiles } from "@/lib/profileCache"
import NumberFlow from "@number-flow/react"
import { Film, Loader2, Download } from "lucide-react"
import toast from "react-hot-toast"
import {
  buildReceivedGhoRanking,
  THANK_YOU_JSON_KIND,
  THANK_YOU_JSON_VERSION,
  type ThankYouExport,
  type ThankYouRankingEntry,
} from "@/lib/thankYouRanking"
import { useThankYouRender } from "@/hooks/useThankYouRender"

const TOKEN_FILTERS = ["All", "GHO", "BONSAI", "POINTLESS"] as const
type TokenFilter = (typeof TOKEN_FILTERS)[number]

type DirectionTab = "all" | "sent" | "received"

const ITEMS_PER_PAGE = 50

// How many top supporters get a personalized Gemini note baked into the
// export. Only the top 10 are shown one-by-one in the video (ranks 11–20 are
// paired and message-less), so there's no point personalizing beyond that.
const PERSONALIZE_TOP_N = 10

// Asks the server to write a warm, post-aware note for each of the top
// supporters and merges them onto the ranking. Best-effort: any failure just
// returns the ranking untouched, so the video falls back to the cute
// hardcoded lines.
const fetchThankYouNotes = async (
  recipientHandle: string,
  recipientName: string,
  ranking: ThankYouRankingEntry[],
  count: number
): Promise<ThankYouRankingEntry[]> => {
  const supporters = ranking.slice(0, count).map((e) => ({
    address: e.address,
    handle: e.handle,
    name: e.name,
  }))
  if (supporters.length === 0) return ranking
  try {
    const res = await fetch("/api/thank-you-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { handle: recipientHandle, name: recipientName },
        supporters,
      }),
    })
    if (!res.ok) return ranking
    const data = await res.json()
    const notes = data?.notes
    if (!notes || typeof notes !== "object") return ranking
    return ranking.map((e) => {
      const note = notes[e.address.toLowerCase()]
      return typeof note === "string" && note.trim()
        ? { ...e, note: note.trim() }
        : e
    })
  } catch {
    return ranking
  }
}

const DetailClientPage = ({
  handle,
  initialProfile,
}: {
  handle: string
  initialProfile: any | null
}) => {
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
    loadError,
  } = useProgressiveTransfers(handle)

  const { state: renderState, render: runRender } = useThankYouRender()

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [tokenFilter, setTokenFilter] = useState<TokenFilter>("All")
  const [directionTab, setDirectionTab] = useState<DirectionTab>("all")
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)
  const [visibleCountSent, setVisibleCountSent] = useState(ITEMS_PER_PAGE)
  const [visibleCountReceived, setVisibleCountReceived] = useState(ITEMS_PER_PAGE)
  // Quick mode: render only the top 3 supporters for fast iteration.
  const [quickMode, setQuickMode] = useState(false)
  // True while Gemini is writing the personalized thank-you notes.
  const [personalizing, setPersonalizing] = useState(false)

  // Prefer progressive profile once it arrives; otherwise use the
  // server-resolved initialProfile so the header renders immediately.
  const profileData = progressiveProfileData || initialProfile

  const isInitialLoading = currentPage === 0 && isLoadingPage
  const isStreaming = isLoadingPage || isAutoLoading

  // Reset visible counts when filters change
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE)
    setVisibleCountSent(ITEMS_PER_PAGE)
    setVisibleCountReceived(ITEMS_PER_PAGE)
  }, [selectedDate, tokenFilter])

  // Warm the profile cache in one batched request per transfers update,
  // instead of letting each row fire its own /api/profile-data-by-address POST.
  useEffect(() => {
    if (allTransfers.length === 0) return
    const needed = new Set<string>()
    for (const t of allTransfers) {
      const addr = t.counterpartyAddress
      if (!addr) continue
      if (getCachedProfile(addr) !== undefined) continue
      needed.add(addr)
    }
    if (needed.size === 0) return
    loadBatchProfiles(Array.from(needed))
  }, [allTransfers])

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

  const tokenTotals = useMemo(() => {
    const acc: Record<string, { sent: number; received: number }> = {}
    for (const t of filteredTransfers) {
      // Merge WGHO + ETH into "GHO"
      const key = t.symbol === "WGHO" || t.symbol === "ETH" ? "GHO" : t.symbol
      if (!acc[key]) acc[key] = { sent: 0, received: 0 }
      const amount = Number(t.amount)
      if (t.direction === "outcome") acc[key].sent += amount
      else acc[key].received += amount
    }

    const tokenConfig: Record<string, { displayName: string; icon: string; isDollar: boolean; order: number }> = {
      GHO: { displayName: "GHO", icon: "/gho-icon.png", isDollar: true, order: 0 },
      BONSAI: { displayName: "BONSAI", icon: "/img/bonsai-logo.webp", isDollar: false, order: 1 },
      pointless: { displayName: "POINTLESS", icon: "/img/pointless-logo.webp", isDollar: false, order: 2 },
    }

    return Object.entries(acc)
      .map(([key, vals]) => {
        const config = tokenConfig[key]
        if (!config) return null
        return { ...config, ...vals }
      })
      .filter(Boolean)
      .sort((a, b) => a!.order - b!.order) as Array<{
        displayName: string; icon: string; sent: number; received: number; isDollar: boolean; order: number
      }>
  }, [filteredTransfers])

  const ghoTotals = useMemo(
    () => tokenTotals.find((t) => t.displayName === "GHO"),
    [tokenTotals]
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

  const streamingIndicator = isStreaming ? (
    <span className="text-indigo-400 ml-1 text-[11px] animate-pulse">
      page {currentPage}…
    </span>
  ) : isDone ? (
    <span className="text-emerald-600 ml-1 text-[11px]">
      &#10003; all loaded
    </span>
  ) : null

  const errorBanner = loadError && !isLoadingPage && (
    <div className="mt-4 px-4 py-3 rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20 text-amber-200/90 text-sm flex items-center justify-between gap-3">
      <span>{loadError}</span>
      <button
        onClick={loadMorePages}
        className="text-amber-100 hover:text-white bg-amber-500/15 hover:bg-amber-500/25 ring-1 ring-amber-400/30 px-3 py-1 rounded-md text-xs font-medium transition-colors"
      >
        Try again
      </button>
    </div>
  )

  const loadMorePagesButton = !isDone && !isAutoLoading && !loadError && (
    <button
      onClick={loadMorePages}
      disabled={isLoadingPage}
      className="w-full mt-4 py-2.5 text-sm text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 ring-1 ring-indigo-500/20 rounded-lg transition-colors disabled:opacity-50"
    >
      {isLoadingPage ? "Loading…" : "Load more pages"}
    </button>
  )

  // Builds the export payload, enriching the top `notesFor` supporters with
  // personalized Gemini notes (read from their recent Lens posts). Async
  // because the note generation is a server round-trip.
  const buildThankYouPayload = async (
    notesFor: number = PERSONALIZE_TOP_N
  ): Promise<ThankYouExport | null> => {
    const ranking = buildReceivedGhoRanking(allTransfers, getCachedProfile)
    if (ranking.length === 0) {
      toast("No GHO supporters to thank yet 💛")
      return null
    }
    const recipientName = profileData?.metadata?.name || handle

    let finalRanking = ranking
    if (notesFor > 0) {
      setPersonalizing(true)
      const loadingToast = toast.loading("Writing personal thank-yous… 💌")
      try {
        finalRanking = await fetchThankYouNotes(
          handle,
          recipientName,
          ranking,
          notesFor
        )
      } finally {
        toast.dismiss(loadingToast)
        setPersonalizing(false)
      }
    }

    return {
      kind: THANK_YOU_JSON_KIND,
      version: THANK_YOU_JSON_VERSION,
      generatedAt: new Date().toISOString(),
      currency: "GHO",
      recipient: {
        handle,
        name: recipientName,
        picture: profileData?.metadata?.picture ?? null,
      },
      ranking: finalRanking,
    }
  }

  const handleRenderThankYou = async () => {
    if (personalizing) return
    const payload = await buildThankYouPayload(
      quickMode ? 3 : PERSONALIZE_TOP_N
    )
    if (!payload) return
    if (quickMode) {
      runRender({ ...payload, ranking: payload.ranking.slice(0, 3) })
      return
    }
    runRender(payload)
  }

  const handleExportThankYou = async () => {
    if (personalizing) return
    const payload = await buildThankYouPayload()
    if (!payload) return
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${handle}-thank-you.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast.success(
      `Exported top ${payload.ranking.length} — open /thank-you to make the video 🎬`
    )
  }

  const isRendering =
    renderState.status === "checking" || renderState.status === "rendering"

  const exportThankYouButton = isDone && (
    <div className="mt-3">
      {isRendering ? (
        <div className="rounded-lg ring-1 ring-pink-500/25 bg-gradient-to-r from-pink-500/10 to-fuchsia-500/10 px-4 py-3">
          <div className="flex items-center justify-between text-sm font-semibold text-pink-200 mb-2">
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {renderState.status === "checking"
                ? "Preparing your video…"
                : "Rendering your thank-you video…"}
            </span>
            <span className="tabular-nums">
              {renderState.status === "rendering"
                ? `${Math.round(renderState.progress * 100)}%`
                : ""}
            </span>
          </div>
          <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pink-500 to-fuchsia-500 transition-all duration-300"
              style={{
                width:
                  renderState.status === "rendering"
                    ? `${Math.max(3, Math.round(renderState.progress * 100))}%`
                    : "8%",
              }}
            />
          </div>
          <p className="text-[11px] text-pink-300/70 mt-2">
            Rendering happens in your browser — keep this tab open. It downloads
            automatically when it&apos;s done. 🎬
          </p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2 items-stretch">
          <button
            type="button"
            onClick={() => setQuickMode((v) => !v)}
            disabled={personalizing}
            title="Quick mode: render only the top 3 supporters so you can test fast"
            className={`sm:w-auto px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 whitespace-nowrap ring-1 transition-colors disabled:opacity-60 ${
              quickMode
                ? "bg-amber-500/20 text-amber-200 ring-amber-400/40"
                : "bg-zinc-900/50 text-zinc-400 ring-zinc-700/40 hover:bg-zinc-800/50"
            }`}
          >
            <span
              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                quickMode ? "bg-amber-400" : "bg-zinc-600"
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  quickMode ? "translate-x-3.5" : "translate-x-0.5"
                }`}
              />
            </span>
            Quick mode
          </button>
          <button
            onClick={handleRenderThankYou}
            disabled={personalizing}
            className="flex-1 py-2.5 text-sm font-semibold text-pink-100 hover:text-white bg-pink-500/15 hover:bg-pink-500/25 ring-1 ring-pink-500/30 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait"
          >
            {personalizing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Writing personal thank-yous…
              </>
            ) : renderState.status === "done" ? (
              <>
                <Film className="w-4 h-4" />
                Render again
              </>
            ) : (
              <>
                <Film className="w-4 h-4" />
                {quickMode
                  ? "Render thank-you video (quick · top 3)"
                  : "Render thank-you video"}
              </>
            )}
          </button>
          <button
            onClick={handleExportThankYou}
            disabled={personalizing}
            title="Export the ranking as JSON — use this on Safari/mobile or to render later in the studio"
            className="sm:w-auto px-4 py-2.5 text-sm font-semibold text-pink-200/80 hover:text-white bg-pink-500/10 hover:bg-pink-500/20 ring-1 ring-pink-500/20 rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-60 disabled:cursor-wait"
          >
            <Download className="w-4 h-4" />
            JSON
          </button>
        </div>
      )}

      {renderState.status === "error" && (
        <div className="mt-2 text-sm text-amber-300 bg-amber-500/10 ring-1 ring-amber-500/25 rounded-lg px-4 py-3">
          {renderState.message}
          <div className="text-xs text-amber-300/70 mt-1">
            Client-side rendering needs WebCodecs (best on desktop Chrome or
            Edge). On Safari/mobile, use the{" "}
            <button
              onClick={handleExportThankYou}
              className="underline hover:text-amber-200"
            >
              JSON export
            </button>{" "}
            and render it from the{" "}
            <Link
              href="/thank-you"
              target="_blank"
              className="underline hover:text-amber-200"
            >
              thank-you studio
            </Link>
            .
          </div>
        </div>
      )}

      {renderState.status === "done" && (
        <div className="mt-2 text-sm text-emerald-300">
          Done! If the download didn&apos;t start,{" "}
          <a
            href={renderState.url}
            download={`${handle}-thank-you.mp4`}
            className="underline"
          >
            click here
          </a>
          .
        </div>
      )}
    </div>
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
            transfers={allTransfers}
          />
        )}
      </BlurryEntrance>

      {exportThankYouButton}

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
                showPrevMonthByDefault={false}
              />
            </BlurryEntrance>

            <BlurryEntrance delay={0.1}>
              {tokenFilterTabs}
            </BlurryEntrance>

            {/* Sticky direction segmented control */}
            <div className="sticky top-0 z-20 -mx-2 px-2 py-2 mb-2 bg-zinc-900/85 backdrop-blur-md">
              <div className="grid grid-cols-3 gap-1 bg-black/40 rounded-xl p-1 ring-1 ring-white/[0.03]">
                {(
                  [
                    {
                      key: "all",
                      label: "All",
                      count: filteredTransfers.length,
                      activeBg: "bg-zinc-800",
                      activeText: "text-zinc-100",
                      activeRing: "ring-white/10",
                      icon: null,
                    },
                    {
                      key: "sent",
                      label: "Sent",
                      count: sentTransfers.length,
                      activeBg: "bg-orange-500/15",
                      activeText: "text-orange-300",
                      activeRing: "ring-orange-400/20",
                      icon: ArrowUpRight,
                    },
                    {
                      key: "received",
                      label: "Received",
                      count: receivedTransfers.length,
                      activeBg: "bg-emerald-500/15",
                      activeText: "text-emerald-300",
                      activeRing: "ring-emerald-400/20",
                      icon: ArrowDownLeft,
                    },
                  ] as const
                ).map((tab) => {
                  const isActive = directionTab === tab.key
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setDirectionTab(tab.key)}
                      className={`relative flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isActive
                          ? `${tab.activeBg} ${tab.activeText} ring-1 ${tab.activeRing}`
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {Icon && <Icon className="w-3.5 h-3.5" />}
                      <span>{tab.label}</span>
                      <span className="text-[10px] opacity-70 tabular-nums">
                        <NumberFlow value={tab.count} />
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Context line: selected date / streaming */}
            {(selectedDate || isStreaming) && (
              <div className="text-[11px] text-zinc-500 mb-2 px-2 flex items-center gap-1.5">
                {selectedDate && <span>On {selectedDate}</span>}
                {streamingIndicator}
              </div>
            )}

            {/* Tab-aware content */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={directionTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {directionTab === "all" && (
                  <>
                    <TotalsSummary
                      tokenTotals={tokenTotals}
                      isStreaming={isStreaming}
                    />
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
                  </>
                )}

                {directionTab === "sent" && (
                  <>
                    {!selectedDate && (
                      <TopCounterparties
                        transfers={allTransfers}
                        direction="sent"
                        isStreaming={isStreaming}
                      />
                    )}
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
                      <div className="text-center py-12 text-zinc-500 text-sm">
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
                  </>
                )}

                {directionTab === "received" && (
                  <>
                    {!selectedDate && (
                      <TopCounterparties
                        transfers={allTransfers}
                        direction="received"
                        isStreaming={isStreaming}
                      />
                    )}
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
                      <div className="text-center py-12 text-zinc-500 text-sm">
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
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {errorBanner}
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
                      <div className="text-xs text-zinc-500 px-2 mb-2">
                        0 transfers
                        {selectedDate && <span> on {selectedDate}</span>}
                      </div>
                      <TotalsSummary tokenTotals={tokenTotals} isStreaming={isStreaming} />
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
                      <div className="text-xs text-zinc-500 px-2 mb-2">
                        {filteredTransfers.length} transfer
                        {filteredTransfers.length !== 1 ? "s" : ""}
                        {selectedDate && <span> on {selectedDate}</span>}
                        {streamingIndicator}
                      </div>
                      <TotalsSummary tokenTotals={tokenTotals} isStreaming={isStreaming} />
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
                      {ghoTotals && ghoTotals.sent > 0 && (
                        <span className="text-xs text-orange-300/80 tabular-nums">
                          <NumberFlow
                            value={ghoTotals.sent}
                            prefix="$"
                            format={
                              ghoTotals.sent >= 10000
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
                          {" "}GHO
                        </span>
                      )}
                    </div>
                    {!selectedDate && (
                      <TopCounterparties
                        transfers={allTransfers}
                        direction="sent"
                        isStreaming={isStreaming}
                      />
                    )}
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
                      {ghoTotals && ghoTotals.received > 0 && (
                        <span className="text-xs text-emerald-300/80 tabular-nums">
                          <NumberFlow
                            value={ghoTotals.received}
                            prefix="$"
                            format={
                              ghoTotals.received >= 10000
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
                          {" "}GHO
                        </span>
                      )}
                    </div>
                    {!selectedDate && (
                      <TopCounterparties
                        transfers={allTransfers}
                        direction="received"
                        isStreaming={isStreaming}
                      />
                    )}
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
            {errorBanner}
            {loadMorePagesButton}
          </div>
        </>
      )}
    </div>
  )
}

export default DetailClientPage
