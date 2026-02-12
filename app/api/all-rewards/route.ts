import { NextRequest, NextResponse } from "next/server"
import { unstable_cache } from "next/cache"

const REWARDS_WALLET = "0x2a705184A6Bb7Dd185E4534d79E441B3edA1082c"

// Cached function to fetch all rewards - refreshes every 1 hour
const getCachedAllRewards = unstable_cache(
  async () => {
    const allRewards = []

    // Fetch all outgoing transactions from the rewards wallet
    const allTransactions = await fetchAllTransfers()

    // Parse each transaction to extract internal token transfers
    for (const transaction of allTransactions) {
      if (transaction.from.toLowerCase() === REWARDS_WALLET.toLowerCase()) {
        // Skip transactions to the excluded smart contract address
        if (
          transaction.to.toLowerCase() !==
          "0xDA1F6A04fDF31b9B9AD4F6E4cc85Dcf1D5365DA6".toLowerCase()
        ) {
          const newTX = {
            value: transaction.amount,
            to: transaction.to,
            timestamp: transaction.timestamp,
            transactionHash: transaction.transactionHash,
          }
          allRewards.push(newTX)
        }
      }
    }

    return allRewards
  },
  ["all-rewards"],
  {
    revalidate: 3600, // 1 hour in seconds
  }
)

interface RewardWithBatch {
  value: string
  to: string
  timestamp: string
  transactionHash: string
  batchId: number
  batchTotal: string
  percentageOfBatch: number
  batchDate: string
}

function detectBatchesAndCalculatePercentages(rewards: any[]): RewardWithBatch[] {
  if (rewards.length === 0) return []

  // Sort rewards by timestamp
  const sortedRewards = [...rewards].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  // Group rewards into batches based on time clustering
  const batches: { [batchId: number]: any[] } = {}
  let currentBatchId = 1
  let currentBatchStart = new Date(sortedRewards[0].timestamp).getTime()

  batches[currentBatchId] = [sortedRewards[0]]

  // Group rewards within 6 hours of each other as same batch
  const BATCH_WINDOW_MS = 6 * 60 * 60 * 1000 // 6 hours in milliseconds

  for (let i = 1; i < sortedRewards.length; i++) {
    const currentTime = new Date(sortedRewards[i].timestamp).getTime()
    const timeSinceLastBatch = currentTime - currentBatchStart

    if (timeSinceLastBatch <= BATCH_WINDOW_MS) {
      // Same batch
      batches[currentBatchId].push(sortedRewards[i])
    } else {
      // New batch
      currentBatchId++
      currentBatchStart = currentTime
      batches[currentBatchId] = [sortedRewards[i]]
    }
  }

  // Calculate batch totals and percentages
  const rewardsWithBatches: RewardWithBatch[] = []

  for (const [batchId, batchRewards] of Object.entries(batches)) {
    // Calculate total for this batch
    const batchTotal = batchRewards.reduce(
      (sum, reward) => sum + BigInt(reward.value),
      BigInt(0)
    )

    // Get batch date (use first transaction timestamp)
    const batchDate = batchRewards[0].timestamp

    // Add batch info to each reward
    for (const reward of batchRewards) {
      const rewardValue = BigInt(reward.value)
      const percentageOfBatch = Number(
        (rewardValue * BigInt(10000) / batchTotal)
      ) / 100 // Calculate percentage with 2 decimal places

      rewardsWithBatches.push({
        ...reward,
        batchId: parseInt(batchId),
        batchTotal: batchTotal.toString(),
        percentageOfBatch,
        batchDate,
      })
    }
  }

  return rewardsWithBatches
}

export async function GET(req: NextRequest) {
  try {
    // Use cached function that refreshes every hour
    const allRewards = await getCachedAllRewards()

    // Detect batches and calculate percentages
    const rewardsWithBatches = detectBatchesAndCalculatePercentages(allRewards)

    return NextResponse.json({ rewards: rewardsWithBatches })
  } catch (error) {
    console.error("Error fetching rewards:", error)

    return NextResponse.json(
      { error: "Failed to fetch rewards" },
      { status: 500 }
    )
  }
}

async function fetchAllTransfers() {
  let allTransactions: any[] = []
  let page = 1

  while (true) {
    try {
      const limit = 100
      const toDate = new Date().toISOString()
      const url = `https://explorer-api.lens.xyz/address/${REWARDS_WALLET}/transfers?toDate=${toDate}&limit=${limit}&page=${page}`

      const response = await fetch(url)
      const data = await response.json()

      if (!data.items || data.items.length === 0) {
        break
      }

      allTransactions = allTransactions.concat(data.items)
      page += 1
    } catch (error) {
      console.error(`Error fetching transactions on page ${page}:`, error)
      break
    }
  }

  return allTransactions
}
