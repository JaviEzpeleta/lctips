import { getCachedLensProfileByAddress } from "@/lib/lensProfileCache"
import { NextResponse } from "next/server"

const MAX_BATCH = 64

export async function POST(req: Request) {
  let addresses: unknown
  try {
    const body = await req.json()
    addresses = body.addresses
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  if (!Array.isArray(addresses) || addresses.length === 0) {
    return NextResponse.json({ profiles: {} })
  }

  const unique = Array.from(
    new Set(
      (addresses as unknown[])
        .filter((a): a is string => typeof a === "string")
        .map((a) => a.toLowerCase())
    )
  ).slice(0, MAX_BATCH)

  const results = await Promise.all(
    unique.map(async (addr) => {
      try {
        const profile = await getCachedLensProfileByAddress(addr)
        return [addr, profile ?? null] as const
      } catch {
        return [addr, null] as const
      }
    })
  )

  const profiles: Record<string, unknown> = {}
  for (const [addr, profile] of results) profiles[addr] = profile
  return NextResponse.json({ profiles })
}
