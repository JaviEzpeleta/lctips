import assert from "node:assert/strict"
import test from "node:test"
import {
  RequestValidationError,
  createFixedWindowRateLimiter,
  getClientIp,
  isEvmAddress,
  normalizeLensHandle,
  parseJsonObject,
  parsePage,
} from "./server-security"

test("normalizes safe Lens handles and rejects query-breaking input", () => {
  assert.equal(normalizeLensHandle("lens/Alice_1"), "alice_1")
  assert.equal(normalizeLensHandle(" bob.smith "), "bob.smith")
  assert.equal(normalizeLensHandle('alice" } } query Evil {'), null)
  assert.equal(normalizeLensHandle(""), null)
})

test("validates EVM addresses without accepting malformed strings", () => {
  assert.equal(isEvmAddress("0x0000000000000000000000000000000000000000"), true)
  assert.equal(isEvmAddress("0xabc"), false)
  assert.equal(isEvmAddress('0x0000000000000000000000000000000000000000"'), false)
})

test("parses bounded positive pages", () => {
  assert.equal(parsePage(1, 5), 1)
  assert.equal(parsePage("5", 5), 5)
  assert.equal(parsePage(0, 5), null)
  assert.equal(parsePage(6, 5), null)
  assert.equal(parsePage(1.5, 5), null)
})

test("extracts the first forwarded client IP", () => {
  const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })
  assert.equal(getClientIp(headers), "203.0.113.7")
})

test("enforces a fixed-window request limit per key", () => {
  let now = 1_000
  const limiter = createFixedWindowRateLimiter({
    limit: 2,
    windowMs: 1_000,
    now: () => now,
  })

  assert.equal(limiter.check("client").ok, true)
  assert.equal(limiter.check("client").ok, true)
  assert.equal(limiter.check("client").ok, false)

  now = 2_001
  assert.equal(limiter.check("client").ok, true)
})

test("parses JSON objects with a byte limit", async () => {
  const ok = new Request("https://lctips.test", {
    method: "POST",
    body: JSON.stringify({ handle: "alice" }),
  })
  assert.deepEqual(await parseJsonObject(ok, 64), { handle: "alice" })

  const tooLarge = new Request("https://lctips.test", {
    method: "POST",
    body: JSON.stringify({ payload: "x".repeat(128) }),
  })
  await assert.rejects(
    () => parseJsonObject(tooLarge, 16),
    (error) =>
      error instanceof RequestValidationError &&
      error.status === 413 &&
      error.message === "Request body too large"
  )
})
