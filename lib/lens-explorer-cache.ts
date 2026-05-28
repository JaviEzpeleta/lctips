import { LRUCache } from "lru-cache"

type TransferPageCacheKey = {
  address: string
  page: number
}

type TransferPageCacheEntry<T> = {
  expiresAt: number
  promise: Promise<T[]>
}

type TransferPageCacheOptions = {
  ttlMs: number
  max: number
  now?: () => number
}

const getCacheKey = ({ address, page }: TransferPageCacheKey) =>
  `${address.toLowerCase()}:${page}`

export const createTransferPageCache = <T>({
  ttlMs,
  max,
  now = Date.now,
}: TransferPageCacheOptions) => {
  const cache = new LRUCache<string, TransferPageCacheEntry<T>>({ max })

  return {
    getOrFetch: (
      key: TransferPageCacheKey,
      fetchPage: () => Promise<T[]>
    ): Promise<T[]> => {
      const cacheKey = getCacheKey(key)
      const currentTime = now()
      const cached = cache.get(cacheKey)
      if (cached && cached.expiresAt > currentTime) {
        return cached.promise
      }

      let promise: Promise<T[]>
      promise = Promise.resolve()
        .then(fetchPage)
        .catch((error) => {
          if (cache.get(cacheKey)?.promise === promise) {
            cache.delete(cacheKey)
          }
          throw error
        })

      cache.set(cacheKey, {
        expiresAt: currentTime + ttlMs,
        promise,
      })

      return promise
    },
    clear: () => cache.clear(),
  }
}
