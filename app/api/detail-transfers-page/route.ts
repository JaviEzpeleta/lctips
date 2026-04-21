import { getLensProfileByHandle } from "@/lib/lens-api"
import { getTransfers } from "@/lib/lens-explorer"
import { DetailTransfer } from "@/lib/types"
import { ethers } from "ethers"
import { LRUCache } from "lru-cache"
import { NextRequest, NextResponse } from "next/server"

const provider = new ethers.JsonRpcProvider("https://rpc.lens.xyz")
const TRANSFER_TOPIC = ethers.id("Transfer(address,address,uint256)")
const transferIface = new ethers.Interface([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
])

const RPC_TIMEOUT_MS = 20_000

// Cap concurrent RPC calls across ALL in-flight requests hitting this
// function instance. Previously a single page fired ~100 concurrent
// getTransactionReceipt calls in Promise.all, which saturated the Lens RPC
// and produced timeouts. On Fluid Compute / warm instances this semaphore
// throttles across concurrent users too.
const RPC_CONCURRENCY = 4

let rpcActive = 0
const rpcQueue: Array<() => void> = []

function acquireRpc(): Promise<void> {
  if (rpcActive < RPC_CONCURRENCY) {
    rpcActive++
    return Promise.resolve()
  }
  return new Promise<void>((resolve) => {
    rpcQueue.push(() => {
      rpcActive++
      resolve()
    })
  })
}

function releaseRpc() {
  rpcActive--
  const next = rpcQueue.shift()
  if (next) next()
}

async function limitedGetTransactionReceipt(
  txHash: string
): Promise<ethers.TransactionReceipt | null> {
  await acquireRpc()
  try {
    return await provider.getTransactionReceipt(txHash)
  } finally {
    releaseRpc()
  }
}

// Tx receipts are immutable on a finalized chain, so resolved counterparties
// for a given (txHash, direction, profileAddress) tuple never change. Cache
// across requests — on Fluid Compute this is shared between concurrent users
// hitting the same warm function instance.
// LRU generic requires a non-null value type, so we box the null case.
const counterpartyCache = new LRUCache<string, { v: string | null }>({
  max: 10_000,
  ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
})

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | null = null
  const timeoutPromise = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      console.warn(`⏱️ [detail-page] TIMEOUT: ${label} after ${ms}ms`)
      timer = null
      resolve(null)
    }, ms)
  })
  return Promise.race([promise, timeoutPromise]).finally(() => {
    // Clear the timer if the underlying promise won the race, so we don't
    // emit a phantom TIMEOUT log 15s after a successful call.
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  })
}

async function resolveActualCounterparty(
  txHash: string,
  profileAddress: string,
  direction: "income" | "outcome"
): Promise<string | null> {
  const cacheKey = `${txHash}:${direction}:${profileAddress.toLowerCase()}`
  const cachedEntry = counterpartyCache.get(cacheKey)
  if (cachedEntry !== undefined) return cachedEntry.v

  let result: string | null = null
  let cacheable = false

  try {
    const receipt = await withTimeout(
      limitedGetTransactionReceipt(txHash),
      RPC_TIMEOUT_MS,
      `getTransactionReceipt(${txHash.slice(0, 10)}...)`
    )
    if (!receipt) {
      // Don't cache timeouts/missing receipts — they may succeed on retry.
      return null
    }

    cacheable = true
    const profileAddr = profileAddress.toLowerCase()

    const fromAddrs = new Set<string>()
    const toAddrs = new Set<string>()
    const amountsByAddr = new Map<string, bigint>()

    for (const log of receipt.logs) {
      if (log.topics[0] !== TRANSFER_TOPIC || log.data === "0x") continue

      let parsed
      try {
        parsed = transferIface.parseLog(log)
      } catch {
        continue
      }
      if (!parsed) continue

      const from = (parsed.args.from as string).toLowerCase()
      const to = (parsed.args.to as string).toLowerCase()
      const value = parsed.args.value as bigint

      fromAddrs.add(from)
      toAddrs.add(to)

      if (direction === "outcome") {
        const current = amountsByAddr.get(to) ?? BigInt(0)
        if (value > current) amountsByAddr.set(to, value)
      } else {
        const current = amountsByAddr.get(from) ?? BigInt(0)
        if (value > current) amountsByAddr.set(from, value)
      }
    }

    if (direction === "outcome") {
      const candidates = [...amountsByAddr.entries()]
        .filter(
          ([addr]) =>
            toAddrs.has(addr) && !fromAddrs.has(addr) && addr !== profileAddr
        )
        .sort((a, b) => (b[1] > a[1] ? 1 : b[1] < a[1] ? -1 : 0))

      result = candidates.length > 0 ? candidates[0][0] : null
    } else {
      const candidates = [...amountsByAddr.entries()]
        .filter(
          ([addr]) =>
            fromAddrs.has(addr) && !toAddrs.has(addr) && addr !== profileAddr
        )
        .sort((a, b) => (b[1] > a[1] ? 1 : b[1] < a[1] ? -1 : 0))

      result = candidates.length > 0 ? candidates[0][0] : null
    }
  } catch (error) {
    console.error(`🔗❌ [detail-page] Failed to resolve counterparty for tx ${txHash}:`, error)
    return null
  }

  if (cacheable) counterpartyCache.set(cacheKey, { v: result })
  return result
}

async function processTransferPage(
  address: string,
  pageNum: number
): Promise<{ transfers: DetailTransfer[]; hasMore: boolean }> {
  const t0 = performance.now()

  console.log(`📡 [detail-page] Fetching transfers page ${pageNum} for ${address.slice(0, 10)}...`)
  const rawTransfers = await withTimeout(
    getTransfers(address, pageNum),
    15_000,
    `getTransfers(page ${pageNum})`
  )
  const t1 = performance.now()
  console.log(`📡 [detail-page] Got ${rawTransfers?.length ?? 0} raw transfers in ${(t1 - t0).toFixed(0)}ms`)

  if (!rawTransfers || rawTransfers.length === 0) {
    return { transfers: [], hasMore: false }
  }

  const validTransfers = rawTransfers.filter((t: any) => t.token)
  const profileAddr = address.toLowerCase()

  const incomeTransfers = validTransfers.filter(
    (t: any) =>
      t.to?.toLowerCase() === profileAddr &&
      t.from?.toLowerCase() !== profileAddr
  )

  const outcomeTransfers = validTransfers.filter(
    (t: any) =>
      t.from?.toLowerCase() === profileAddr &&
      t.to?.toLowerCase() !== profileAddr
  )

  const resolveCache = new Map<string, Promise<string | null>>()

  function getCachedResolve(
    txHash: string,
    direction: "income" | "outcome"
  ): Promise<string | null> {
    const key = `${txHash}:${direction}`
    if (!resolveCache.has(key)) {
      resolveCache.set(
        key,
        resolveActualCounterparty(txHash, address, direction)
      )
    }
    return resolveCache.get(key)!
  }

  console.log(`🔗 [detail-page] Resolving counterparties for ${validTransfers.length} transfers...`)
  const t2 = performance.now()

  const incomePromises = incomeTransfers.map(async (transfer: any) => {
    const resolved = await getCachedResolve(
      transfer.transactionHash,
      "income"
    )
    const formattedAmount =
      transfer.amount != null ? ethers.formatEther(transfer.amount) : "0"
    return {
      timestamp: transfer.timestamp,
      from: transfer.from,
      to: transfer.to,
      amount: formattedAmount,
      symbol: transfer.token.symbol,
      transactionHash: transfer.transactionHash,
      direction: "income" as const,
      counterpartyAddress: resolved || transfer.from,
    }
  })

  const outcomePromises = outcomeTransfers.map(async (transfer: any) => {
    const resolved = await getCachedResolve(
      transfer.transactionHash,
      "outcome"
    )
    const formattedAmount =
      transfer.amount != null ? ethers.formatEther(transfer.amount) : "0"
    return {
      timestamp: transfer.timestamp,
      from: address,
      to: resolved || transfer.to,
      amount: formattedAmount,
      symbol: transfer.token.symbol,
      transactionHash: transfer.transactionHash,
      direction: "outcome" as const,
      counterpartyAddress: resolved || transfer.to,
    }
  })

  const [incomeDetails, outcomeDetails] = await Promise.all([
    Promise.all(incomePromises),
    Promise.all(outcomePromises),
  ])

  const t3 = performance.now()
  console.log(`🔗✅ [detail-page] Counterparties resolved in ${(t3 - t2).toFixed(0)}ms`)

  // Dedup within page
  const deduped = [...incomeDetails, ...outcomeDetails].reduce((acc, t) => {
    const key = `${t.transactionHash}:${t.direction}:${t.symbol}`
    if (!acc.has(key)) {
      acc.set(key, { ...t })
    } else {
      const existing = acc.get(key)!
      const sum = parseFloat(existing.amount) + parseFloat(t.amount)
      existing.amount = sum.toString()
    }
    return acc
  }, new Map<string, DetailTransfer>())

  const transfers = [...deduped.values()].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  const totalMs = (performance.now() - t0).toFixed(0)
  console.log(`✅ [detail-page] Page ${pageNum} complete: ${transfers.length} transfers, hasMore=${rawTransfers?.length === 100}, total ${totalMs}ms`)

  return { transfers, hasMore: rawTransfers?.length === 100 }
}


export async function POST(req: NextRequest) {
  let handle: string
  let page: number
  try {
    const body = await req.json()
    handle = body.handle
    page = body.page
  } catch {
    return NextResponse.json({ error: "Invalid or empty request body" }, { status: 400 })
  }

  if (!handle || page == null) {
    return NextResponse.json({ error: "Missing handle or page" }, { status: 400 })
  }

  const requestStart = performance.now()

  try {
    console.log(`👤 [detail-page] Fetching profile for @${handle}...`)
    const profileStart = performance.now()
    const profile = await withTimeout(
      getLensProfileByHandle(handle),
      10_000,
      `getLensProfileByHandle(@${handle})`
    )
    const profileMs = (performance.now() - profileStart).toFixed(0)

    if (!profile) {
      console.log(`👤❌ [detail-page] Profile @${handle} not found or timed out (${profileMs}ms)`)
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      )
    }

    console.log(`👤✅ [detail-page] Profile resolved in ${profileMs}ms, address: ${profile.address}`)

    const { transfers, hasMore } = await processTransferPage(
      profile.address,
      page
    )

    const totalMs = (performance.now() - requestStart).toFixed(0)
    console.log(`✅🎉 [detail-page] Request complete for @${handle} page ${page} in ${totalMs}ms`)

    return NextResponse.json({
      profile,
      transfers,
      hasMore,
      page,
    })
  } catch (error: any) {
    const totalMs = (performance.now() - requestStart).toFixed(0)
    const errorMsg = error?.message || "Unknown error"
    console.error(`❌ [detail-page] Error processing @${handle} page ${page} after ${totalMs}ms:`, error)
    return NextResponse.json(
      { error: `Failed to process detail transfers: ${errorMsg}` },
      { status: 500 }
    )
  }
}
