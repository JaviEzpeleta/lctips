"use client"

import { DetailTransfer } from "@/lib/types"
import { useCallback, useEffect, useRef, useState } from "react"

const PAGES_PER_BURST = 8
const PAGE_FETCH_CONCURRENCY = 2
const FETCH_TIMEOUT_MS = 30_000
const AUTO_CONTINUE_DELAY_MS = 3000
const MAX_TRANSFERS = 5000

type PageResult =
  | { kind: "ok"; page: number; transfers: DetailTransfer[]; hasMore: boolean; profile?: any }
  | { kind: "empty"; page: number; profile?: any }
  | { kind: "notFound" }
  | { kind: "error"; page: number; message: string }
  | { kind: "aborted" }

export function useProgressiveTransfers(handle: string) {
  const [transfers, setTransfers] = useState<DetailTransfer[]>([])
  const [datesWithTips, setDatesWithTips] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(0)
  const [isLoadingPage, setIsLoadingPage] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [profileData, setProfileData] = useState<any>(null)
  const [profileNotFound, setProfileNotFound] = useState(false)
  const [autoLoadRemaining, setAutoLoadRemaining] = useState(PAGES_PER_BURST)
  const [loadError, setLoadError] = useState<string | null>(null)

  const dedupMapRef = useRef(new Map<string, DetailTransfer>())
  const abortRef = useRef<AbortController | null>(null)

  const rebuildFromMap = useCallback(() => {
    const sorted = [...dedupMapRef.current.values()].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    setTransfers(sorted)

    const dates = new Set<string>()
    for (const t of sorted) {
      const d = new Date(t.timestamp)
      dates.add(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      )
    }
    setDatesWithTips(dates)
  }, [])

  const fetchPageRaw = useCallback(
    async (pageNum: number, signal: AbortSignal): Promise<PageResult> => {
      const startTime = performance.now()

      try {
        const timeoutController = new AbortController()
        const timeoutId = setTimeout(
          () => timeoutController.abort(),
          FETCH_TIMEOUT_MS
        )
        const combinedSignal = AbortSignal.any([signal, timeoutController.signal])

        const res = await fetch("/api/detail-transfers-page", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle, page: pageNum }),
          signal: combinedSignal,
        })

        clearTimeout(timeoutId)

        if (signal.aborted) return { kind: "aborted" }
        if (res.status === 404) return { kind: "notFound" }

        if (!res.ok) {
          const errorData = await res
            .json()
            .catch(() => ({ error: "Unknown error" }))
          return {
            kind: "error",
            page: pageNum,
            message: errorData.error || `HTTP ${res.status}`,
          }
        }

        const data = await res.json()
        const elapsed = (performance.now() - startTime).toFixed(0)

        if (!data.transfers || data.transfers.length === 0) {
          console.log(`🎉 [transfers] Page ${pageNum} empty in ${elapsed}ms`)
          return { kind: "empty", page: pageNum, profile: data.profile }
        }

        console.log(
          `✅ [transfers] Page ${pageNum}: ${data.transfers.length} transfers, hasMore=${data.hasMore}, ${elapsed}ms`
        )

        return {
          kind: "ok",
          page: pageNum,
          transfers: data.transfers as DetailTransfer[],
          hasMore: !!data.hasMore,
          profile: data.profile,
        }
      } catch (error: any) {
        if (error?.name === "AbortError") {
          if (!signal.aborted) {
            return {
              kind: "error",
              page: pageNum,
              message: `timed out after ${FETCH_TIMEOUT_MS / 1000}s`,
            }
          }
          return { kind: "aborted" }
        }
        return {
          kind: "error",
          page: pageNum,
          message: error?.message || "Network error",
        }
      }
    },
    [handle]
  )

  const mergeTransfers = useCallback((newTransfers: DetailTransfer[]) => {
    for (const t of newTransfers) {
      const key = `${t.transactionHash}:${t.direction}:${t.symbol}`
      const existing = dedupMapRef.current.get(key)
      if (existing) {
        const sum = parseFloat(existing.amount) + parseFloat(t.amount)
        dedupMapRef.current.set(key, { ...existing, amount: sum.toString() })
      } else {
        dedupMapRef.current.set(key, t)
      }
    }
  }, [])

  const runBurst = useCallback(
    async (firstPage: number, controller: AbortController) => {
      setIsLoadingPage(true)
      setLoadError(null)
      const burstStart = performance.now()

      let notFound = false
      let anyDone = false
      let lastGoodPage = 0

      // Keep page fetches modestly parallel. Each page fans out into receipt
      // RPC work, and the server route still caps those calls globally.
      let nextPage = firstPage
      let pagesScheduled = 0
      let shouldStop = false

      while (pagesScheduled < PAGES_PER_BURST && !shouldStop) {
        if (controller.signal.aborted) return

        const batchPages: number[] = []
        while (
          batchPages.length < PAGE_FETCH_CONCURRENCY &&
          pagesScheduled < PAGES_PER_BURST
        ) {
          batchPages.push(nextPage)
          nextPage += 1
          pagesScheduled += 1
        }

        const results = await Promise.all(
          batchPages.map((pageNum) => fetchPageRaw(pageNum, controller.signal))
        )

        for (const r of results) {
          if (controller.signal.aborted || r.kind === "aborted") return

          if (r.kind === "notFound") {
            notFound = true
            shouldStop = true
            break
          }
          if (r.kind === "error") {
            console.error(`❌ [transfers] Page ${r.page}: ${r.message}`)
            setLoadError(
              lastGoodPage > 0 || dedupMapRef.current.size > 0
                ? "Couldn't load more transfers right now. You can try again."
                : "Couldn't load transfers right now. You can try again."
            )
            shouldStop = true
            break
          }
          if (r.kind === "empty") {
            if (r.profile) setProfileData(r.profile)
            anyDone = true
            shouldStop = true
            break
          }
          // r.kind === "ok"
          if (r.profile) setProfileData(r.profile)
          mergeTransfers(r.transfers)
          lastGoodPage = r.page
          rebuildFromMap()
          setCurrentPage(r.page)
          if (!r.hasMore) {
            anyDone = true
            shouldStop = true
            break
          }
          if (dedupMapRef.current.size >= MAX_TRANSFERS) {
            console.log(
              `🛑 [transfers] Hit ${MAX_TRANSFERS} transfer cap, stopping auto-load`
            )
            anyDone = true
            shouldStop = true
            break
          }
        }
      }

      if (notFound) {
        setProfileNotFound(true)
        setIsDone(true)
        setIsLoadingPage(false)
        setAutoLoadRemaining(0)
        return
      }

      setIsLoadingPage(false)

      if (anyDone) {
        const total = dedupMapRef.current.size
        console.log(
          `🏁 [transfers] Burst done in ${(performance.now() - burstStart).toFixed(0)}ms, total ${total}`
        )
        setIsDone(true)
      } else {
        console.log(
          `🏁 [transfers] Burst complete through page ${lastGoodPage} in ${(performance.now() - burstStart).toFixed(0)}ms, total ${dedupMapRef.current.size}`
        )
      }

      setAutoLoadRemaining(0)
    },
    [fetchPageRaw, handle, mergeTransfers, rebuildFromMap]
  )

  // Auto-load burst
  useEffect(() => {
    if (!handle) return

    console.log(`🚀 [transfers] Starting initial burst for @${handle}...`)

    const controller = new AbortController()
    abortRef.current = controller

    // Reset state for fresh load (handles React Strict Mode double-mount)
    dedupMapRef.current.clear()
    setTransfers([])
    setDatesWithTips(new Set())
    setCurrentPage(0)
    setIsLoadingPage(false)
    setIsDone(false)
    setProfileNotFound(false)
    setLoadError(null)
    setAutoLoadRemaining(PAGES_PER_BURST)

    runBurst(1, controller)

    return () => {
      controller.abort()
    }
  }, [handle, runBurst])

  const loadMorePages = useCallback(() => {
    if (isDone || isLoadingPage) return

    const controller = new AbortController()
    abortRef.current = controller
    setAutoLoadRemaining(PAGES_PER_BURST)
    runBurst(currentPage + 1, controller)
  }, [isDone, isLoadingPage, currentPage, runBurst])

  // Auto-continue: once a burst settles (not done, not loading, not already
  // auto-loading, profile exists), schedule the next burst after a short
  // breathing pause so the UI can render what just streamed in.
  useEffect(() => {
    if (isDone || isLoadingPage || profileNotFound || loadError) return
    if (autoLoadRemaining > 0) return
    if (currentPage === 0) return // initial burst hasn't landed yet
    if (transfers.length >= MAX_TRANSFERS) {
      setIsDone(true)
      return
    }

    console.log(
      `⏳ [transfers] Auto-continue: next burst in ${AUTO_CONTINUE_DELAY_MS}ms (from page ${currentPage})`
    )
    const timer = setTimeout(() => {
      loadMorePages()
    }, AUTO_CONTINUE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [
    isDone,
    isLoadingPage,
    profileNotFound,
    loadError,
    autoLoadRemaining,
    currentPage,
    loadMorePages,
    transfers.length,
  ])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const isAutoLoading = autoLoadRemaining > 0

  return {
    transfers,
    datesWithTips,
    isLoadingPage,
    isAutoLoading,
    isDone,
    currentPage,
    loadMorePages,
    profileData,
    profileNotFound,
    loadError,
  }
}
