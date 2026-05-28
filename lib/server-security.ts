export class RequestValidationError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message)
    this.name = "RequestValidationError"
  }
}

const LENS_HANDLE_RE = /^[a-z0-9_.-]{1,63}$/
const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/

export const normalizeLensHandle = (value: unknown): string | null => {
  if (typeof value !== "string") return null
  const handle = value.trim().replace(/^lens\//i, "").toLowerCase()
  if (!LENS_HANDLE_RE.test(handle)) return null
  return handle
}

export const isEvmAddress = (value: unknown): value is string =>
  typeof value === "string" && EVM_ADDRESS_RE.test(value)

export const parsePage = (value: unknown, maxPage: number): number | null => {
  const page =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN
  if (!Number.isInteger(page) || page < 1 || page > maxPage) return null
  return page
}

export const getClientIp = (headers: Headers): string => {
  const forwardedFor = headers.get("x-forwarded-for")
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim()
    if (first) return first
  }

  return headers.get("x-real-ip")?.trim() || "local"
}

type RateLimitEntry = {
  count: number
  resetAt: number
}

export const createFixedWindowRateLimiter = (_options: {
  limit: number
  windowMs: number
  now?: () => number
}) => {
  const { limit, windowMs, now = Date.now } = _options
  const hits = new Map<string, RateLimitEntry>()

  return {
    check: (key: string) => {
      const currentTime = now()
      const existing = hits.get(key)

      if (!existing || existing.resetAt <= currentTime) {
        hits.set(key, { count: 1, resetAt: currentTime + windowMs })
        return { ok: true, retryAfterMs: 0 }
      }

      if (existing.count >= limit) {
        return {
          ok: false,
          retryAfterMs: Math.max(existing.resetAt - currentTime, 0),
        }
      }

      existing.count += 1
      return { ok: true, retryAfterMs: 0 }
    },
  }
}

export const parseJsonObject = async (
  request: Request,
  maxBytes: number
): Promise<Record<string, unknown>> => {
  const contentLength = request.headers.get("content-length")
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new RequestValidationError("Request body too large", 413)
  }

  let body: string
  try {
    body = await request.text()
  } catch {
    throw new RequestValidationError("Invalid request body")
  }

  if (new TextEncoder().encode(body).byteLength > maxBytes) {
    throw new RequestValidationError("Request body too large", 413)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    throw new RequestValidationError("Invalid JSON body")
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new RequestValidationError("Expected a JSON object")
  }

  return parsed as Record<string, unknown>
}
