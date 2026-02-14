import { ethers } from "ethers"
import { getLensAddressByOwnerAddress } from "./lens-api"

export const getTransfers = async (address: string, page: number) => {
  const limit = 100
  const toDate = new Date().toISOString()

  // Only show tips from 2026 onwards
  const fromDate = new Date("2026-01-01T00:00:00.000Z")

  const theURL = `https://explorer-api.lens.xyz/address/${address}/transfers?fromDate=${fromDate.toISOString()}&toDate=${toDate}&limit=${limit}&page=${page}`

  const t0 = performance.now()
  console.log(`🔍 [lens-explorer] Fetching transfers for ${address.slice(0, 10)}... page ${page}...`)

  try {
    const response = await fetch(theURL, { signal: AbortSignal.timeout(15_000) })

    if (!response.ok) {
      console.error(`🔍❌ [lens-explorer] HTTP ${response.status} for ${address.slice(0, 10)}... page ${page}`)
      return []
    }

    const data = await response.json()
    const elapsed = (performance.now() - t0).toFixed(0)
    console.log(`🔍✅ [lens-explorer] Got ${data.items?.length ?? 0} transfers in ${elapsed}ms`)
    return data.items
  } catch (error: any) {
    const elapsed = (performance.now() - t0).toFixed(0)
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      console.error(`🔍⏱️ [lens-explorer] TIMEOUT after ${elapsed}ms fetching page ${page} for ${address.slice(0, 10)}...`)
    } else {
      console.error(`🔍❌ [lens-explorer] Error fetching page ${page} for ${address.slice(0, 10)}... (${elapsed}ms):`, error)
    }
    return []
  }
}

export const getOutcomeTransfers = async (address: string, page: number) => {
  const limit = 100
  const toDate = new Date().toISOString()

  // Only show tips from 2026 onwards
  const fromDate = new Date("2026-01-01T00:00:00.000Z")

  const theURL = `https://explorer-api.lens.xyz/address/${address}/transfers?fromDate=${fromDate.toISOString()}&toDate=${toDate}&limit=${limit}&page=${page}`

  try {
    const response = await fetch(theURL, { signal: AbortSignal.timeout(15_000) })
    if (!response.ok) {
      console.error(`🔍❌ [lens-explorer] getOutcomeTransfers HTTP ${response.status}`)
      return []
    }
    const data = await response.json()
    return data.items
  } catch (error: any) {
    console.error(`🔍❌ [lens-explorer] getOutcomeTransfers error:`, error)
    return []
  }
}

export const getSenderFromTx = async (hash: string) => {
  const theURL = `https://explorer-api.lens.xyz/transactions/${hash}`

  try {
    const response = await fetch(theURL)
    const data = await response.json()
    return data.to
  } catch (error) {
    console.error(error)
    return false
  }
}

export const getReceiverFromTx = async (hash: string) => {
  const theURL = `https://explorer-api.lens.xyz/transactions/${hash}`
  try {
    const response = await fetch(theURL)
    const data = await response.json()

    const provider = new ethers.JsonRpcProvider("https://rpc.lens.xyz")

    const txReceipt = await provider.getTransactionReceipt(data.hash)
    const iface = new ethers.Interface([
      "event Transfer(address indexed from, address indexed to, uint256 value)",
    ])
    const TRANSFER_TOPIC = ethers.id("Transfer(address,address,uint256)")

    let finalDestination = false

    if (txReceipt) {
      const transfers = txReceipt.logs
      for (const log of transfers) {
        if (log.topics[0] !== TRANSFER_TOPIC) continue

        if (log.data === "0x") continue

        let logDescription
        try {
          logDescription = iface.parseLog(log)
        } catch {
          continue
        }
        if (!logDescription) continue
        const { args } = logDescription
        const amountWei = args.value as bigint

        const amountInEth = ethers.formatUnits(amountWei, 18)
        if (log.index === 7) {
          finalDestination = args.to
          break
        }
      }
    }

    if (finalDestination) {
      return finalDestination
    }

    return false
  } catch (error) {
    console.error(error)
    return false
  }
}

export const decodeTxData = (data: string, abi: any) => {
  const iface = new ethers.Interface(abi)

  try {
    const parsed = iface.parseTransaction({ data })
    if (!parsed) {
      return { error: "Failed to decode", reason: "parsed is null" }
    }

    return {
      method: parsed.name,
      args: parsed.args,
      signature: parsed.signature,
    }
  } catch (err) {
    return { error: "Failed to decode", reason: err }
  }
}
