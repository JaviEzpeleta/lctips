import { getLensProfileByHandle } from "@/lib/lens-api"
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

    return NextResponse.json({
      profile,
    })
  } catch (error) {
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
