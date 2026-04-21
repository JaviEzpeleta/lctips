import { unstable_cache } from "next/cache"
import { getLensProfileByAddress, getLensProfileByHandle } from "@/lib/lens-api"

const REVALIDATE_SECONDS = 3600

const addressWrappers = new Map<string, () => Promise<any>>()
const handleWrappers = new Map<string, () => Promise<any>>()

export const profileAddressTag = (address: string) =>
  `lens-profile:${address}`
export const profileHandleTag = (handle: string) =>
  `lens-profile-handle:${handle}`

export const getCachedLensProfileByAddress = (address: string) => {
  const key = address.toLowerCase()
  let fn = addressWrappers.get(key)
  if (!fn) {
    fn = unstable_cache(
      () => getLensProfileByAddress(key),
      ["lens-profile-by-address", key],
      { revalidate: REVALIDATE_SECONDS, tags: [profileAddressTag(key)] }
    )
    addressWrappers.set(key, fn)
  }
  return fn()
}

export const getCachedLensProfileByHandle = (handle: string) => {
  const key = handle.toLowerCase()
  let fn = handleWrappers.get(key)
  if (!fn) {
    fn = unstable_cache(
      () => getLensProfileByHandle(key),
      ["lens-profile-by-handle", key],
      { revalidate: REVALIDATE_SECONDS, tags: [profileHandleTag(key)] }
    )
    handleWrappers.set(key, fn)
  }
  return fn()
}
