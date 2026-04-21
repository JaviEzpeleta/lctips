import { getCachedLensProfileByAddress } from "@/lib/lensProfileCache"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { address } = await req.json()
  try {
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
    console.error("Error processing address:", error)
    return NextResponse.json(
      { error: "Failed to process address" },
      { status: 500 }
    )
  }
}
