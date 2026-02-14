import { getLensProfileByHandle } from "@/lib/lens-api"
import { getTransfers } from "@/lib/lens-explorer"
import { DetailTransfer } from "@/lib/types"
import { ethers } from "ethers"
import { NextRequest, NextResponse } from "next/server"

const provider = new ethers.JsonRpcProvider("https://rpc.lens.xyz")
const TRANSFER_TOPIC = ethers.id("Transfer(address,address,uint256)")
const transferIface = new ethers.Interface([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
])

async function resolveActualCounterparty(
  txHash: string,
  profileAddress: string,
  direction: "income" | "outcome"
): Promise<string | null> {
  try {
    const receipt = await provider.getTransactionReceipt(txHash)
    if (!receipt) return null

    const profileAddr = profileAddress.toLowerCase()

    // Collect all Transfer event participants and amounts
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

      // Track largest amount per address in the relevant role
      if (direction === "outcome") {
        // We want terminal recipients: appear as `to` but never as `from`
        const current = amountsByAddr.get(to) ?? BigInt(0)
        if (value > current) amountsByAddr.set(to, value)
      } else {
        // We want terminal senders: appear as `from` but never as `to`
        const current = amountsByAddr.get(from) ?? BigInt(0)
        if (value > current) amountsByAddr.set(from, value)
      }
    }

    if (direction === "outcome") {
      // Terminal recipients: appear as `to` but never as `from`, excluding profile
      const candidates = [...amountsByAddr.entries()]
        .filter(
          ([addr]) =>
            toAddrs.has(addr) && !fromAddrs.has(addr) && addr !== profileAddr
        )
        .sort((a, b) => (b[1] > a[1] ? 1 : b[1] < a[1] ? -1 : 0))

      return candidates.length > 0 ? candidates[0][0] : null
    } else {
      // Terminal senders: appear as `from` but never as `to`, excluding profile
      const candidates = [...amountsByAddr.entries()]
        .filter(
          ([addr]) =>
            fromAddrs.has(addr) && !toAddrs.has(addr) && addr !== profileAddr
        )
        .sort((a, b) => (b[1] > a[1] ? 1 : b[1] < a[1] ? -1 : 0))

      return candidates.length > 0 ? candidates[0][0] : null
    }
  } catch (error) {
    console.error(`Failed to resolve counterparty for tx ${txHash}:`, error)
    return null
  }
}

export async function POST(req: NextRequest) {
  const { handle } = await req.json()

  try {
    const profile = await getLensProfileByHandle(handle)
    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      )
    }

    const fetchAllTransfers = async () => {
      let allTransfers = [] as any[]
      let page = 1
      while (true) {
        try {
          const newTransfers = await getTransfers(profile.address, page)
          if (!newTransfers || newTransfers.length === 0) break
          allTransfers = allTransfers.concat(newTransfers)
          page += 1
        } catch (error) {
          console.error(`Error fetching transfers page ${page}:`, error)
          break
        }
      }
      return allTransfers
    }

    const rawTransfers = await fetchAllTransfers()

    const validTransfers = rawTransfers.filter((t: any) => t.token)
    const profileAddr = profile.address.toLowerCase()

    // Income: transfers where the profile is the receiver
    const incomeTransfers = validTransfers.filter(
      (t: any) =>
        t.to?.toLowerCase() === profileAddr &&
        t.from?.toLowerCase() !== profileAddr
    )

    // Outcome: transfers where the profile is the sender
    const outcomeTransfers = validTransfers.filter(
      (t: any) =>
        t.from?.toLowerCase() === profileAddr &&
        t.to?.toLowerCase() !== profileAddr
    )

    // Cache resolved counterparties by txHash+direction to avoid duplicate RPC calls
    const resolveCache = new Map<string, Promise<string | null>>()

    function getCachedResolve(
      txHash: string,
      direction: "income" | "outcome"
    ): Promise<string | null> {
      const key = `${txHash}:${direction}`
      if (!resolveCache.has(key)) {
        resolveCache.set(
          key,
          resolveActualCounterparty(txHash, profile.address, direction)
        )
      }
      return resolveCache.get(key)!
    }

    // Resolve all transfers in parallel
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
        from: profile.address,
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

    // Combine and sort by timestamp (newest first)
    const allTransfers = [
      ...incomeDetails,
      ...outcomeDetails,
    ].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    // Extract unique dates with tips
    const datesWithTips = [
      ...new Set(
        allTransfers.map((t) => {
          const d = new Date(t.timestamp)
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
        })
      ),
    ]

    return NextResponse.json({
      profile,
      transfers: allTransfers,
      datesWithTips,
    })
  } catch (error) {
    console.error("Error processing detail transfers:", error)
    return NextResponse.json(
      { error: "Failed to process detail transfers" },
      { status: 500 }
    )
  }
}
