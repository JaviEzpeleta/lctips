import { getLensProfileByHandle } from "@/lib/lens-api"
import {
  getTransfers,
  getOutcomeTransfers,
  getSenderFromTx,
  getReceiverFromTx,
} from "@/lib/lens-explorer"
import { ethers } from "ethers"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { handle } = await req.json()

  try {
    const profile = await getLensProfileByHandle(handle)
    if (!profile) {
      return NextResponse.json(
        {
          error: "Profile not found",
        },
        { status: 404 }
      )
    }

    // Parallelize income and outcome transfers fetching
    const fetchIncomeTransfers = async () => {
      let allIncomeTransfers = [] as any[]
      let page = 1
      let newTransfers
      while (true) {
        try {
          newTransfers = await getTransfers(profile.address, page)
          if (!newTransfers || newTransfers.length === 0) {
            break
          }
          allIncomeTransfers = allIncomeTransfers.concat(newTransfers)
          page += 1
        } catch (error) {
          console.error(
            `Error fetching income transfers on page ${page}:`,
            error
          )
          break
        }
      }
      return allIncomeTransfers
    }

    const fetchOutcomeTransfers = async () => {
      let allOutcomeTransfers = [] as any[]
      let pageOutcome = 1
      let newTransfersOutcome
      while (true) {
        try {
          newTransfersOutcome = await getOutcomeTransfers(
            profile.address,
            pageOutcome
          )
          if (newTransfersOutcome.length === 0) {
            break
          }
          allOutcomeTransfers = allOutcomeTransfers.concat(newTransfersOutcome)
          pageOutcome += 1
        } catch (error) {
          console.error(
            `Error fetching outcome transfers on page ${pageOutcome}:`,
            error
          )
          break
        }
      }
      return allOutcomeTransfers
    }

    // Fetch both income and outcome transfers in parallel
    const [rawIncomeTransfers, rawOutcomeTransfers] = await Promise.all([
      fetchIncomeTransfers(),
      fetchOutcomeTransfers(),
    ])

    // filter out transfers without token
    const allIncomeTransfers = rawIncomeTransfers.filter(
      (transfer) => transfer.token
    )
    let allOutcomeTransfers = rawOutcomeTransfers

    // Parallelize ETH transaction processing for income transfers
    const ethTransfers = allIncomeTransfers.filter(
      (t) => t.token?.symbol === "ETH"
    )
    const nonEthTransfers = allIncomeTransfers.filter(
      (t) => t.token?.symbol !== "ETH"
    )

    // Process ETH transfers in parallel
    const ethTransferPromises = ethTransfers.map(async (transfer) => {
      const { amount, from, timestamp, token } = transfer
      const sender = await getSenderFromTx(transfer.transactionHash)
      if (!sender) {
        return null
      }
      const formattedAmount = amount != null ? ethers.formatEther(amount) : "0"
      return {
        amount: formattedAmount,
        from: sender,
        timestamp,
        symbol: token.symbol,
      }
    })

    // Process non-ETH transfers synchronously (no API calls needed)
    const nonEthTransfersWithDetails = nonEthTransfers.map((transfer) => {
      const { amount, from, timestamp, token } = transfer
      const formattedAmount = amount != null ? ethers.formatEther(amount) : "0"
      return {
        amount: formattedAmount,
        from,
        timestamp,
        symbol: token.symbol,
      }
    })

    // Wait for all ETH transfers to complete
    const ethTransfersWithDetails = await Promise.all(ethTransferPromises)

    // Combine all transfers
    const allIncomeTransfersWithDetails = [
      ...nonEthTransfersWithDetails,
      ...ethTransfersWithDetails,
    ]

    allOutcomeTransfers = allOutcomeTransfers.filter(
      (transfer) =>
        transfer.from === profile.address && transfer.type === "transfer"
    )

    // Filter out transfers without token first
    const validOutcomeTransfers = allOutcomeTransfers.filter((transfer) => {
      if (!transfer.token) {
        return false
      }
      return true
    })

    // Parallelize ETH transaction processing for outcome transfers
    const ethOutcomeTransfers = validOutcomeTransfers.filter(
      (t) => t.token.symbol === "ETH"
    )
    const nonEthOutcomeTransfers = validOutcomeTransfers.filter(
      (t) => t.token.symbol !== "ETH"
    )

    // Process ETH transfers in parallel
    const ethOutcomePromises = ethOutcomeTransfers.map(async (transfer) => {
      const { amount, to, timestamp, token } = transfer
      const receiver = await getReceiverFromTx(transfer.transactionHash)
      const formattedAmount = amount != null ? ethers.formatEther(amount) : "0"
      return {
        amount: formattedAmount,
        to: receiver,
        timestamp,
        symbol: token.symbol,
      }
    })

    // Process non-ETH transfers synchronously (no API calls needed)
    const nonEthOutcomeDetails = nonEthOutcomeTransfers.map((transfer) => {
      const { amount, to, timestamp, token } = transfer
      const formattedAmount = amount != null ? ethers.formatEther(amount) : "0"
      return {
        amount: formattedAmount,
        to,
        timestamp,
        symbol: token.symbol,
      }
    })

    // Wait for all ETH transfers to complete
    const ethOutcomeDetails = await Promise.all(ethOutcomePromises)

    // Combine all transfers
    const allOutcomeTransfersWithDetails = [
      ...nonEthOutcomeDetails,
      ...ethOutcomeDetails,
    ]

    const filteredOutcomeTransfers = allOutcomeTransfers.filter(
      (transfer) => transfer
    )

    // Parallelize all grouping operations
    const [
      groupedIncomeTransfers,
      groupedOutcomeTransfers,
      groupedBonsaiIncomeTransfers,
      groupedBonsaiOutcomeTransfers,
      groupedPointlessIncomeTransfers,
      groupedPointlessOutcomeTransfers,
    ] = await Promise.all([
      Promise.resolve(
        groupAndSumGHOTransactions(
          allIncomeTransfersWithDetails as any,
          profile.address
        )
      ),
      Promise.resolve(
        groupAndSumGHOOutcomeTransactions(
          allOutcomeTransfersWithDetails as any,
          profile.address
        )
      ),
      Promise.resolve(
        groupAndSumBonsaiTransactions(
          allIncomeTransfersWithDetails as any,
          profile.address
        )
      ),
      Promise.resolve(
        groupAndSumBonsaiOutcomeTransactions(
          allOutcomeTransfersWithDetails as any,
          profile.address
        )
      ),
      Promise.resolve(
        groupAndSumPointlessTransactions(
          allIncomeTransfersWithDetails as any,
          profile.address
        )
      ),
      Promise.resolve(
        groupAndSumPointlessOutcomeTransactions(
          allOutcomeTransfersWithDetails as any,
          profile.address
        )
      ),
    ])

    return NextResponse.json({
      profile,
      groupedIncomeTransfers: groupedIncomeTransfers.map((transfer) => ({
        ...transfer,
        totals: ethers.formatEther(transfer.totals.toString()),
      })),
      groupedOutcomeTransfers: groupedOutcomeTransfers.map((transfer) => ({
        ...transfer,
        totals: ethers.formatEther(transfer.totals.toString()),
      })),
      groupedBonsaiIncomeTransfers: groupedBonsaiIncomeTransfers.map(
        (transfer) => ({
          ...transfer,
          totals: ethers.formatEther(transfer.totals.toString()),
        })
      ),
      groupedBonsaiOutcomeTransfers: groupedBonsaiOutcomeTransfers.map(
        (transfer) => ({
          ...transfer,
          totals: ethers.formatEther(transfer.totals.toString()),
        })
      ),
      groupedPointlessIncomeTransfers: groupedPointlessIncomeTransfers.map(
        (transfer) => ({
          ...transfer,
          totals: ethers.formatEther(transfer.totals.toString()),
        })
      ),
      groupedPointlessOutcomeTransfers: groupedPointlessOutcomeTransfers.map(
        (transfer) => ({
          ...transfer,
          totals: ethers.formatEther(transfer.totals.toString()),
        })
      ),
    })
  } catch (error) {
    console.error("Error processing profile:", error)
    return NextResponse.json(
      { error: "Failed to process profile" },
      { status: 500 }
    )
  }
}

const groupAndSumGHOTransactions = (
  transactions: Transaction[],
  profileAddress: string
): GroupedTotal[] => {
  const aggregation: { [fromAddress: string]: bigint } = {}

  transactions.forEach((tx) => {
    if (!tx) {
      return
    }
    const { from, symbol, amount } = tx

    if (from === profileAddress) {
      return
    }

    // Only include WGHO and ETH
    if (symbol !== "WGHO" && symbol !== "ETH") {
      return
    }

    let numericAmount: bigint
    try {
      const decimalAmount = Number(amount).toFixed(18)
      numericAmount = ethers.parseEther(decimalAmount)
    } catch (error) {
      console.error(
        `Invalid amount "${amount}" from ${from}, skipping.`
      )
      return
    }

    if (!aggregation[from]) {
      aggregation[from] = BigInt(0)
    }

    aggregation[from] = aggregation[from] + numericAmount
  })

  const result: GroupedTotal[] = Object.keys(aggregation).map((fromAddress) => {
    return {
      from: fromAddress,
      totals: aggregation[fromAddress],
    }
  })

  const filteredResults = result.filter((transfer) => {
    const newTotals = ethers.formatEther(transfer.totals.toString())
    return Number(newTotals) >= 0.01
  })

  // now i want to sort the filteredResults by totals
  filteredResults.sort((a, b) => Number(b.totals - a.totals))

  return filteredResults
}
const groupAndSumGHOOutcomeTransactions = (
  transactions: Transaction[],
  profileAddress: string
): GroupedTotal[] => {
  const aggregation: { [toAddress: string]: bigint } = {}

  transactions.forEach((tx) => {
    const { to, symbol, amount } = tx

    if (to === profileAddress) {
      return
    }

    // Only include WGHO and ETH
    if (symbol !== "WGHO" && symbol !== "ETH") {
      return
    }

    let numericAmount: bigint
    try {
      const decimalAmount = Number(amount).toFixed(18)
      numericAmount = ethers.parseEther(decimalAmount)
    } catch (error) {
      console.error(
        `Invalid amount "${amount}" to ${to}, skipping.`
      )
      return
    }

    if (!aggregation[to]) {
      aggregation[to] = BigInt(0)
    }

    aggregation[to] = aggregation[to] + numericAmount
  })

  const result: GroupedTotal[] = Object.keys(aggregation).map((fromAddress) => {
    return {
      from: fromAddress,
      totals: aggregation[fromAddress],
    }
  })

  const filteredResults = result
    .filter((transfer) => {
      if (!transfer.from.startsWith("0x")) {
        return false
      }

      const newTotals = ethers.formatEther(transfer.totals.toString())
      return Number(newTotals) >= 0.01
    })
    .filter((transfer) => transfer)

  // now i want to sort the filteredResults by totals
  filteredResults.sort((a, b) => Number(b.totals - a.totals))

  return filteredResults
}

export interface Transaction {
  amount: string
  from: string
  to: string
  timestamp: string
  symbol: string
}

export interface GroupedTotal {
  from: string
  totals: bigint
  profileData?: any
}

// BONSAI aggregation functions
const groupAndSumBonsaiTransactions = (
  transactions: Transaction[],
  profileAddress: string
): GroupedTotal[] => {
  const aggregation: { [fromAddress: string]: bigint } = {}

  transactions.forEach((tx) => {
    if (!tx) {
      return
    }
    const { from, symbol, amount } = tx

    if (from === profileAddress) {
      return
    }

    // Only include BONSAI
    if (symbol !== "BONSAI") {
      return
    }

    let numericAmount: bigint
    try {
      const decimalAmount = Number(amount).toFixed(18)
      numericAmount = ethers.parseEther(decimalAmount)
    } catch (error) {
      console.error(`Error processing BONSAI amount "${amount}" from ${from}`)
      return
    }

    if (!aggregation[from]) {
      aggregation[from] = BigInt(0)
    }

    aggregation[from] = aggregation[from] + numericAmount
  })

  const result: GroupedTotal[] = Object.keys(aggregation).map((fromAddress) => {
    return {
      from: fromAddress,
      totals: aggregation[fromAddress],
    }
  })

  const filteredResults = result.filter((transfer) => {
    const newTotals = ethers.formatEther(transfer.totals.toString())
    return Number(newTotals) >= 0.01
  })

  filteredResults.sort((a, b) => Number(b.totals - a.totals))

  return filteredResults
}

const groupAndSumBonsaiOutcomeTransactions = (
  transactions: Transaction[],
  profileAddress: string
): GroupedTotal[] => {
  const aggregation: { [toAddress: string]: bigint } = {}

  transactions.forEach((tx) => {
    const { to, symbol, amount } = tx

    if (to === profileAddress) {
      return
    }

    // Only include BONSAI
    if (symbol !== "BONSAI") {
      return
    }

    let numericAmount: bigint
    try {
      const decimalAmount = Number(amount).toFixed(18)
      numericAmount = ethers.parseEther(decimalAmount)
    } catch (error) {
      console.error(`Error processing BONSAI amount "${amount}" to ${to}`)
      return
    }

    if (!aggregation[to]) {
      aggregation[to] = BigInt(0)
    }

    aggregation[to] = aggregation[to] + numericAmount
  })

  const result: GroupedTotal[] = Object.keys(aggregation).map((toAddress) => {
    return {
      from: toAddress,
      totals: aggregation[toAddress],
    }
  })

  const filteredResults = result
    .filter((transfer) => {
      if (!transfer.from.startsWith("0x")) {
        return false
      }

      const newTotals = ethers.formatEther(transfer.totals.toString())
      return Number(newTotals) >= 0.01
    })
    .filter((transfer) => transfer)

  filteredResults.sort((a, b) => Number(b.totals - a.totals))

  return filteredResults
}

// Pointless aggregation functions
const groupAndSumPointlessTransactions = (
  transactions: Transaction[],
  profileAddress: string
): GroupedTotal[] => {
  const aggregation: { [fromAddress: string]: bigint } = {}

  transactions.forEach((tx) => {
    if (!tx) {
      return
    }
    const { from, symbol, amount } = tx

    if (from === profileAddress) {
      return
    }

    // Only include pointless
    if (symbol !== "pointless") {
      return
    }

    let numericAmount: bigint
    try {
      const decimalAmount = Number(amount).toFixed(18)
      numericAmount = ethers.parseEther(decimalAmount)
    } catch (error) {
      console.error(`Error processing pointless amount "${amount}" from ${from}`)
      return
    }

    if (!aggregation[from]) {
      aggregation[from] = BigInt(0)
    }

    aggregation[from] = aggregation[from] + numericAmount
  })

  const result: GroupedTotal[] = Object.keys(aggregation).map((fromAddress) => {
    return {
      from: fromAddress,
      totals: aggregation[fromAddress],
    }
  })

  const filteredResults = result.filter((transfer) => {
    const newTotals = ethers.formatEther(transfer.totals.toString())
    return Number(newTotals) >= 0.01
  })

  filteredResults.sort((a, b) => Number(b.totals - a.totals))

  return filteredResults
}

const groupAndSumPointlessOutcomeTransactions = (
  transactions: Transaction[],
  profileAddress: string
): GroupedTotal[] => {
  const aggregation: { [toAddress: string]: bigint } = {}

  transactions.forEach((tx) => {
    const { to, symbol, amount } = tx

    if (to === profileAddress) {
      return
    }

    // Only include pointless
    if (symbol !== "pointless") {
      return
    }

    let numericAmount: bigint
    try {
      const decimalAmount = Number(amount).toFixed(18)
      numericAmount = ethers.parseEther(decimalAmount)
    } catch (error) {
      console.error(`Error processing pointless amount "${amount}" to ${to}`)
      return
    }

    if (!aggregation[to]) {
      aggregation[to] = BigInt(0)
    }

    aggregation[to] = aggregation[to] + numericAmount
  })

  const result: GroupedTotal[] = Object.keys(aggregation).map((toAddress) => {
    return {
      from: toAddress,
      totals: aggregation[toAddress],
    }
  })

  const filteredResults = result
    .filter((transfer) => {
      if (!transfer.from.startsWith("0x")) {
        return false
      }

      const newTotals = ethers.formatEther(transfer.totals.toString())
      return Number(newTotals) >= 0.01
    })
    .filter((transfer) => transfer)

  filteredResults.sort((a, b) => Number(b.totals - a.totals))

  return filteredResults
}
