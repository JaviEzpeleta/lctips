import { getCachedLensProfileByHandle } from "@/lib/lensProfileCache"
import {
  RequestValidationError,
  createFixedWindowRateLimiter,
  getClientIp,
  normalizeLensHandle,
  parseJsonObject,
} from "@/lib/server-security"
import { NextRequest, NextResponse } from "next/server"

const limiter = createFixedWindowRateLimiter({ limit: 120, windowMs: 60_000 })

export async function POST(req: NextRequest) {
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
    const handle = normalizeLensHandle(body.handle)
    if (!handle) {
      return NextResponse.json({ error: "Invalid handle" }, { status: 400 })
    }

    const profile = await getCachedLensProfileByHandle(handle)

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

    console.error("Error processing basic profile:", error)
    return NextResponse.json(
      { error: "Failed to process profile" },
      { status: 500 }
    )
  }
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
  totals: number
  profileData?: any
}
