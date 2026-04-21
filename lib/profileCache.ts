export type CachedProfile = {
  username: { localName: string }
  metadata: { name?: string; picture?: string }
} | null

const store = new Map<string, CachedProfile>()
const inFlight = new Map<string, Promise<CachedProfile>>()
const listenersByAddress = new Map<string, Set<() => void>>()
const globalListeners = new Set<() => void>()

const normalize = (address: string) => address.toLowerCase()

export const getCachedProfile = (address: string): CachedProfile | undefined => {
  return store.get(normalize(address))
}

export const subscribeProfile = (address: string, listener: () => void) => {
  const key = normalize(address)
  let set = listenersByAddress.get(key)
  if (!set) {
    set = new Set()
    listenersByAddress.set(key, set)
  }
  set.add(listener)
  return () => {
    set!.delete(listener)
    if (set!.size === 0) listenersByAddress.delete(key)
  }
}

export const subscribeProfileCache = (listener: () => void) => {
  globalListeners.add(listener)
  return () => {
    globalListeners.delete(listener)
  }
}

const notify = (address: string) => {
  listenersByAddress.get(address)?.forEach((l) => l())
  globalListeners.forEach((l) => l())
}

export const loadProfile = async (address: string): Promise<CachedProfile> => {
  const key = normalize(address)
  if (store.has(key)) return store.get(key)!
  const pending = inFlight.get(key)
  if (pending) return pending

  const promise = (async (): Promise<CachedProfile> => {
    try {
      const res = await fetch("/api/profile-data-by-address", {
        method: "POST",
        body: JSON.stringify({ address }),
      })
      const data = await res.json()
      const profile =
        data?.profile?.username && data?.profile?.metadata ? data.profile : null
      store.set(key, profile)
      return profile
    } catch {
      store.set(key, null)
      return null
    } finally {
      inFlight.delete(key)
      notify(key)
    }
  })()

  inFlight.set(key, promise)
  return promise
}

export const seedProfile = (address: string, profile: CachedProfile) => {
  const key = normalize(address)
  store.set(key, profile)
  notify(key)
}
