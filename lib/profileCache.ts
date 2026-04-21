export type CachedProfile = {
  username: { localName: string }
  metadata: { name?: string; picture?: string }
} | null

type StoredEntry = {
  profile: CachedProfile
  expiresAt: number
}

const STORAGE_KEY = "lctips:profileCache:v1"
const TTL_MS = 24 * 60 * 60 * 1000
const PERSIST_DEBOUNCE_MS = 1500
const MAX_PERSISTED_ENTRIES = 2000

const store = new Map<string, CachedProfile>()
const inFlight = new Map<string, Promise<CachedProfile>>()
const listenersByAddress = new Map<string, Set<() => void>>()
const globalListeners = new Set<() => void>()
const dirtyKeys = new Set<string>()
let persistHandle: ReturnType<typeof setTimeout> | null = null

const normalize = (address: string) => address.toLowerCase()

const normalizeProfile = (p: any): CachedProfile =>
  p && p.username && p.metadata ? (p as CachedProfile) : null

const now = () => Date.now()

const isBrowser = typeof window !== "undefined"

const hydrateFromStorage = () => {
  if (!isBrowser) return
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Record<string, StoredEntry>
    const t = now()
    for (const [key, entry] of Object.entries(parsed)) {
      if (!entry || entry.expiresAt < t) continue
      store.set(key, entry.profile)
    }
  } catch {
    // Ignore corrupt cache — it'll get rewritten.
  }
}

const schedulePersist = () => {
  if (!isBrowser) return
  if (persistHandle) return
  const runner = () => {
    persistHandle = null
    flushPersist()
  }
  const anyWin = window as any
  if (typeof anyWin.requestIdleCallback === "function") {
    persistHandle = anyWin.requestIdleCallback(runner, {
      timeout: PERSIST_DEBOUNCE_MS,
    })
  } else {
    persistHandle = setTimeout(runner, PERSIST_DEBOUNCE_MS)
  }
}

const flushPersist = () => {
  if (!isBrowser || dirtyKeys.size === 0) return
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const existing: Record<string, StoredEntry> = raw ? JSON.parse(raw) : {}
    const t = now()
    for (const key of dirtyKeys) {
      const profile = store.get(key)
      if (profile === undefined) continue
      existing[key] = { profile, expiresAt: t + TTL_MS }
    }
    // Prune expired + cap size (drop oldest by expiresAt).
    const entries = Object.entries(existing).filter(
      ([, v]) => v && v.expiresAt >= t
    )
    if (entries.length > MAX_PERSISTED_ENTRIES) {
      entries.sort((a, b) => b[1].expiresAt - a[1].expiresAt)
      entries.length = MAX_PERSISTED_ENTRIES
    }
    const next: Record<string, StoredEntry> = {}
    for (const [k, v] of entries) next[k] = v
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Quota exceeded or JSON error — drop the write silently.
  } finally {
    dirtyKeys.clear()
  }
}

const markDirty = (key: string) => {
  if (!isBrowser) return
  dirtyKeys.add(key)
  schedulePersist()
}

hydrateFromStorage()

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
      const profile = normalizeProfile(data?.profile)
      store.set(key, profile)
      markDirty(key)
      return profile
    } catch {
      store.set(key, null)
      markDirty(key)
      return null
    } finally {
      inFlight.delete(key)
      notify(key)
    }
  })()

  inFlight.set(key, promise)
  return promise
}

export const loadBatchProfiles = async (
  addresses: string[]
): Promise<void> => {
  const toFetch = Array.from(
    new Set(
      addresses
        .filter((a): a is string => typeof a === "string" && a.length > 0)
        .map(normalize)
    )
  ).filter((a) => !store.has(a) && !inFlight.has(a))

  if (toFetch.length === 0) return

  const batchPromise = (async () => {
    try {
      const res = await fetch("/api/profiles-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses: toFetch }),
      })
      const data = await res.json()
      const byAddr: Record<string, any> = data?.profiles ?? {}
      for (const addr of toFetch) {
        const profile = normalizeProfile(byAddr[addr])
        store.set(addr, profile)
        markDirty(addr)
      }
    } catch {
      for (const addr of toFetch) {
        store.set(addr, null)
        markDirty(addr)
      }
    } finally {
      for (const addr of toFetch) {
        inFlight.delete(addr)
        notify(addr)
      }
    }
  })()

  // Register per-address so concurrent loadProfile() calls dedupe onto the batch.
  for (const addr of toFetch) {
    inFlight.set(
      addr,
      batchPromise.then(() => store.get(addr) ?? null)
    )
  }

  await batchPromise
}

export const seedProfile = (address: string, profile: CachedProfile) => {
  const key = normalize(address)
  store.set(key, profile)
  markDirty(key)
  notify(key)
}
