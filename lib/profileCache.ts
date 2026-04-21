export type CachedProfile = {
  username: { localName: string }
  metadata: { name?: string; picture?: string }
} | null

const store = new Map<string, CachedProfile>()
const inFlight = new Map<string, Promise<CachedProfile>>()
const listeners = new Set<() => void>()

const normalize = (address: string) => address.toLowerCase()

export const getCachedProfile = (address: string): CachedProfile | undefined => {
  return store.get(normalize(address))
}

export const subscribeProfileCache = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const notify = () => listeners.forEach((l) => l())

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
      notify()
    }
  })()

  inFlight.set(key, promise)
  return promise
}
