"use client"

import { useEffect, useState } from "react"
import {
  CachedProfile,
  getCachedProfile,
  loadProfile,
  subscribeProfile,
} from "@/lib/profileCache"

export const useProfileByAddress = (address?: string | null) => {
  const [profile, setProfile] = useState<CachedProfile | undefined>(() =>
    address ? getCachedProfile(address) : undefined
  )

  useEffect(() => {
    if (!address) {
      setProfile(undefined)
      return
    }

    setProfile(getCachedProfile(address))

    const unsubscribe = subscribeProfile(address, () => {
      setProfile(getCachedProfile(address))
    })

    loadProfile(address).then((p) => setProfile(p))

    return () => {
      unsubscribe()
    }
  }, [address])

  return profile
}
