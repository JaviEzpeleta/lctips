"use client"

import { DetailTransfer } from "@/lib/types"
import { useCallback, useEffect, useRef, useState } from "react"
import toast from "react-hot-toast"

const PAGES_PER_BURST = 5
const FETCH_TIMEOUT_MS = 30_000

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
      const burstStart = performance.now()

      let notFound = false
      let anyDone = false
      let lastGoodPage = 0

      // Pages run serially to avoid saturating the downstream RPC
      // (getTransactionReceipt). See app/api/detail-transfers-page/route.ts
      // for the RPC semaphore that backs this up server-side.
      for (let i = 0; i < PAGES_PER_BURST; i++) {
        if (controller.signal.aborted) return
        const pageNum = firstPage + i
        const r = await fetchPageRaw(pageNum, controller.signal)
        if (controller.signal.aborted || r.kind === "aborted") return

        if (r.kind === "notFound") {
          notFound = true
          break
        }
        if (r.kind === "error") {
          toast.error(`Page ${r.page} failed: ${r.message}`)
          console.error(`❌ [transfers] Page ${r.page}: ${r.message}`)
          break
        }
        if (r.kind === "empty") {
          if (r.profile) setProfileData(r.profile)
          anyDone = true
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
          break
        }
      }

      if (notFound) {
        toast.error(`Profile @${handle} not found`)
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
        toast.success(`All transfers loaded (${total} total)`)
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
  }
}
