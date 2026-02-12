import { getLensProfileByAddress } from "@/lib/lens-api"
import { NextResponse } from "next/server"
import { unstable_cache } from "next/cache"

const cacheMap = new Map()

const getCachedLensProfileByAddress = (address: string) => {
  if (!cacheMap.has(address)) {
    cacheMap.set(
      address,
      unstable_cache(
        () => getLensProfileByAddress(address),
        ["lens-profile-by-address", address],
        {
          revalidate: 3600,
        }
      )
    )
  }
  return cacheMap.get(address)()
}

export async function POST(req: Request) {
  const { address } = await req.json()
  try {
    // Use the cached function, passing address as part of the key derivation
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
