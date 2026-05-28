import { getCachedLensProfileByAddress } from "@/lib/lensProfileCache"
import {
  RequestValidationError,
  createFixedWindowRateLimiter,
  getClientIp,
  isEvmAddress,
  parseJsonObject,
} from "@/lib/server-security"
import { NextResponse } from "next/server"

const limiter = createFixedWindowRateLimiter({ limit: 240, windowMs: 60_000 })

export async function POST(req: Request) {
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
    const body = await parseJsonObject(req, 512)
    const address = body.address
    if (!isEvmAddress(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 })
    }

    const profile = await getCachedLensProfileByAddress(address)

    if (!profile) {
      return NextResponse.json(
        {
          error: "Profile not found",
        },
        { status: 404 }
      )
    }
    return NextResponse.json({
      profile,
    })
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error("Error processing address:", error)
    return NextResponse.json(
      { error: "Failed to process address" },
      { status: 500 }
    )
  }
}
