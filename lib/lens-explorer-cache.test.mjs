import assert from "node:assert/strict"
import test from "node:test"
import { createTransferPageCache } from "./lens-explorer-cache.ts"

test("deduplicates in-flight transfer page fetches and caches within the TTL", async () => {
  let now = 1_000
  let calls = 0
  const cache = createTransferPageCache({
    ttlMs: 60_000,
    max: 10,
    now: () => now,
  })

  const first = cache.getOrFetch(
    { address: "0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD", page: 1 },
    async () => {
      calls += 1
      return [{ id: "first" }]
    }
  )
  const second = cache.getOrFetch(
    { address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", page: 1 },
    async () => {
      calls += 1
      return [{ id: "second" }]
    }
  )

  assert.deepEqual(await Promise.all([first, second]), [
    [{ id: "first" }],
    [{ id: "first" }],
  ])
  assert.equal(calls, 1)

  now += 59_000
  assert.deepEqual(
    await cache.getOrFetch(
      { address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", page: 1 },
      async () => {
        calls += 1
        return [{ id: "cached" }]
      }
    ),
    [{ id: "first" }]
  )
  assert.equal(calls, 1)

  now += 2_000
  assert.deepEqual(
    await cache.getOrFetch(
      { address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", page: 1 },
      async () => {
        calls += 1
        return [{ id: "fresh" }]
      }
    ),
    [{ id: "fresh" }]
  )
  assert.equal(calls, 2)
})

test("does not cache failed transfer page fetches", async () => {
  const cache = createTransferPageCache({
    ttlMs: 60_000,
    max: 10,
    now: () => 1_000,
  })

  await assert.rejects(
    () =>
      cache.getOrFetch(
        { address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", page: 1 },
        async () => {
          throw new Error("upstream failed")
        }
      ),
    /upstream failed/
  )

  assert.deepEqual(
    await cache.getOrFetch(
      { address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", page: 1 },
      async () => [{ id: "retry" }]
    ),
    [{ id: "retry" }]
  )
})
