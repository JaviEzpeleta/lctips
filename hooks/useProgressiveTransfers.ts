"use client"

import { DetailTransfer } from "@/lib/types"
import { useCallback, useEffect, useRef, useState } from "react"
import toast from "react-hot-toast"

const PAGES_PER_BURST = 5
const FETCH_TIMEOUT_MS = 30_000

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

  const fetchPage = useCallback(
    async (pageNum: number, signal: AbortSignal) => {
      setIsLoadingPage(true)
      const startTime = performance.now()
      console.log(`📡 [transfers] Fetching page ${pageNum} for @${handle}...`)

      try {
        // Combine the caller's abort signal with a 30s timeout
        const timeoutController = new AbortController()
        const timeoutId = setTimeout(() => timeoutController.abort(), FETCH_TIMEOUT_MS)

        const combinedSignal = AbortSignal.any([signal, timeoutController.signal])

        const res = await fetch("/api/detail-transfers-page", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle, page: pageNum }),
          signal: combinedSignal,
        })

        clearTimeout(timeoutId)

        if (signal.aborted) return null

        if (res.status === 404) {
          toast.error(`Profile @${handle} not found`)
          setProfileNotFound(true)
          setIsDone(true)
          setIsLoadingPage(false)
          return null
        }

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: "Unknown error" }))
          const errorMsg = errorData.error || `HTTP ${res.status}`
          toast.error(`Page ${pageNum} failed: ${errorMsg}`)
          console.error(`❌ [transfers] Page ${pageNum} error: ${errorMsg}`)
          setIsLoadingPage(false)
          return null
        }

        const data = await res.json()

        if (data.profile) {
          setProfileData(data.profile)
        }

        if (!data.transfers || data.transfers.length === 0) {
          const elapsed = (performance.now() - startTime).toFixed(0)
          const totalTransfers = dedupMapRef.current.size
          console.log(`🎉 [transfers] Page ${pageNum} empty in ${elapsed}ms — done. Total: ${totalTransfers} transfers`)
          toast.success(`All transfers loaded (${totalTransfers} total)`)
          setIsDone(true)
          setIsLoadingPage(false)
          return null
        }

        // Merge into dedup map
        for (const t of data.transfers as DetailTransfer[]) {
          const key = `${t.transactionHash}:${t.direction}:${t.symbol}`
          const existing = dedupMapRef.current.get(key)
          if (existing) {
            const sum = parseFloat(existing.amount) + parseFloat(t.amount)
            dedupMapRef.current.set(key, { ...existing, amount: sum.toString() })
          } else {
            dedupMapRef.current.set(key, t)
          }
        }

        rebuildFromMap()
        setCurrentPage(pageNum)
        setIsLoadingPage(false)

        const elapsed = (performance.now() - startTime).toFixed(0)
        console.log(
          `✅ [transfers] Page ${pageNum}: ${data.transfers.length} transfers, hasMore=${data.hasMore}, ${elapsed}ms`
        )

        if (!data.hasMore) {
          const totalTransfers = dedupMapRef.current.size
          toast.success(`All transfers loaded (${totalTransfers} total)`)
          setIsDone(true)
          return null
        }

        return pageNum + 1
      } catch (error: any) {
        if (error?.name === "AbortError") {
          // Distinguish timeout from user-initiated abort
          if (!signal.aborted) {
            toast.error(`Page ${pageNum} timed out after ${FETCH_TIMEOUT_MS / 1000}s`)
            console.error(`⏱️ [transfers] Page ${pageNum} timed out after ${FETCH_TIMEOUT_MS}ms`)
            setIsLoadingPage(false)
          }
          return null
        }
        toast.error(`Network error loading page ${pageNum}`)
        console.error(`❌ [transfers] Network error on page ${pageNum}:`, error)
        setIsLoadingPage(false)
        return null
      }
    },
    [handle, rebuildFromMap]
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

    const loadBurst = async () => {
      let nextPage = 1
      let remaining = PAGES_PER_BURST
      const burstStart = performance.now()
      let pagesLoaded = 0

      while (remaining > 0 && !controller.signal.aborted) {
        const result = await fetchPage(nextPage, controller.signal)
        if (result === null) break
        nextPage = result
        remaining--
        pagesLoaded++
      }

      if (!controller.signal.aborted) {
        const burstElapsed = (performance.now() - burstStart).toFixed(0)
        console.log(
          `🏁 [transfers] Initial burst complete: ${pagesLoaded} pages loaded in ${burstElapsed}ms, total transfers: ${dedupMapRef.current.size}`
        )
        setAutoLoadRemaining(0)
      }
    }

    loadBurst()

    return () => {
      controller.abort()
    }
  }, [handle, fetchPage])

  const loadMorePages = useCallback(() => {
    if (isDone || isLoadingPage) return

    const controller = new AbortController()
    abortRef.current = controller
    setAutoLoadRemaining(PAGES_PER_BURST)

    const loadBurst = async () => {
      let nextPage = currentPage + 1
      let remaining = PAGES_PER_BURST
      const burstStart = performance.now()
      let pagesLoaded = 0

      while (remaining > 0 && !controller.signal.aborted) {
        const result = await fetchPage(nextPage, controller.signal)
        if (result === null) break
        nextPage = result
        remaining--
        pagesLoaded++
      }

      const burstElapsed = (performance.now() - burstStart).toFixed(0)
      console.log(
        `🏁 [transfers] Load-more burst complete: ${pagesLoaded} pages loaded in ${burstElapsed}ms, total transfers: ${dedupMapRef.current.size}`
      )
      setAutoLoadRemaining(0)
    }

    loadBurst()
  }, [isDone, isLoadingPage, currentPage, fetchPage])

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
