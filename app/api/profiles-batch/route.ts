import { getCachedLensProfileByAddress } from "@/lib/lensProfileCache"
import {
  RequestValidationError,
  createFixedWindowRateLimiter,
  getClientIp,
  isEvmAddress,
  parseJsonObject,
} from "@/lib/server-security"
import { NextResponse } from "next/server"

const MAX_BATCH = 64
const limiter = createFixedWindowRateLimiter({ limit: 120, windowMs: 60_000 })

export async function POST(req: Request) {
  let addresses: unknown
  const rateLimit = limiter.check(getClientIp(req.headers))
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)),
        },
      }
    )
  }

  try {
    const body = await parseJsonObject(req, 4096)
    addresses = body.addresses
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

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
        .filter(isEvmAddress)
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
