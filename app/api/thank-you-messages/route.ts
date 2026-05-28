import { NextResponse } from "next/server"
import { getLensProfileByHandle, getLensV3PostsByAddress } from "@/lib/lens-api"
import {
  RequestValidationError,
  createFixedWindowRateLimiter,
  getClientIp,
  isEvmAddress,
  normalizeLensHandle,
  parseJsonObject,
} from "@/lib/server-security"

// One recipient lookup + up to 10 supporter post fetches + one Gemini call —
// give the function room beyond the default serverless timeout.
export const maxDuration = 60

const GEMINI_MODEL = "gemini-2.5-flash-lite"
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const MAX_SUPPORTERS = 10
const POSTS_PER_SUPPORTER = 12
const POSTS_FOR_RECIPIENT = 18
const MAX_POST_CHARS = 280
const MAX_NAME_CHARS = 80
const limiter = createFixedWindowRateLimiter({ limit: 10, windowMs: 60_000 })

type SupporterInput = { address: string; handle: string; name: string }

const isPost = (p: unknown): p is { content: string } =>
  !!p &&
  typeof p === "object" &&
  typeof (p as { content?: unknown }).content === "string"

// Flattens a Lens post list into a short numbered digest for the prompt.
const postsDigest = (posts: unknown, limit: number): string => {
  if (!Array.isArray(posts)) return ""
  return posts
    .filter(isPost)
    .map((p) => p.content.replace(/\s+/g, " ").trim())
    .filter((c) => c.length > 0)
    .slice(0, limit)
    .map((c, i) => `${i + 1}. ${c.slice(0, MAX_POST_CHARS)}`)
    .join("\n")
}

const buildPrompt = (
  recipientHandle: string,
  recipientName: string,
  recipientPosts: string,
  supporterBlocks: string
) => `You are helping @${recipientHandle} (${recipientName}) record a cute, heartfelt "thank you" video for the friends who tipped them the most on Lens (a web3 social network).

For EACH supporter below, write ONE short handwritten-style note that ${recipientName} would say to that friend. It must:
- nod to something genuine and specific from THAT friend's recent posts (a project they're building, a topic they love, a vibe they give off) — never generic;
- feel warm, admiring and uplifting — spread real positivity, love and admiration;
- be first person, as ${recipientName} speaking directly to that friend;
- be at most 14 words, written all in lowercase for a casual handwritten feel;
- if it joins two thoughts, link them with a comma or em-dash so it reads smoothly;
- do NOT end with any punctuation (no period, no exclamation mark, no ellipsis) and never wrap it in quotes;
- use at most one emoji, no hashtags;
- be written in the language ${recipientName} mostly posts in (see their posts below) — if unclear, use English.

If a friend has no recent posts, write a warm, sincere generic line for them instead.

## ${recipientName}'s own recent posts (use these for their voice, language and shared interests)
${recipientPosts || "(no recent posts found)"}

## Supporters to write a note for
${supporterBlocks}

Return a JSON array, one object per supporter, in the same order: {"handle": "<handle without @>", "note": "<the note>"}.`

export async function POST(req: Request) {
  const rateLimit = limiter.check(getClientIp(req.headers))
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)),
        },
      }
    )
  }

  let recipientHandle: string | null = null
  let recipientName = "they"
  let supporters: SupporterInput[] = []
  try {
    const body = await parseJsonObject(req, 8192)
    const recipient =
      body.recipient && typeof body.recipient === "object" && !Array.isArray(body.recipient)
        ? (body.recipient as { handle?: unknown; name?: unknown })
        : undefined

    recipientHandle = normalizeLensHandle(recipient?.handle)
    recipientName =
      typeof recipient?.name === "string" && recipient.name.trim()
        ? recipient.name.trim().slice(0, MAX_NAME_CHARS)
        : recipientHandle || "they"

    supporters = Array.isArray(body.supporters)
      ? body.supporters
          .map((item): SupporterInput | null => {
            if (!item || typeof item !== "object" || Array.isArray(item)) return null
            const supporter = item as {
              address?: unknown
              handle?: unknown
              name?: unknown
            }
            const handle = normalizeLensHandle(supporter.handle)
            const address = supporter.address
            if (!handle || !isEvmAddress(address)) return null
            return {
              address,
              handle,
              name:
                typeof supporter.name === "string" && supporter.name.trim()
                  ? supporter.name.trim().slice(0, MAX_NAME_CHARS)
                  : handle,
            }
          })
          .filter((item): item is SupporterInput => item !== null)
      : []
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const top = supporters
    .filter(
      (s): s is SupporterInput =>
        !!s &&
        typeof s.address === "string" &&
        typeof s.handle === "string"
    )
    .slice(0, MAX_SUPPORTERS)

  if (!recipientHandle || top.length === 0) {
    return NextResponse.json({ notes: {} })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    // No key configured — degrade gracefully: the video just keeps the cute
    // hardcoded lines, no personal notes.
    console.warn(
      "[thank-you-messages] GEMINI_API_KEY not set — skipping personalization"
    )
    return NextResponse.json({ notes: {} })
  }

  try {
    // Resolve the recipient's address so we can read their own recent posts
    // (gives Gemini their voice, language and shared interests to draw on).
    const recipientProfile = await getLensProfileByHandle(recipientHandle).catch(
      () => null
    )
    const recipientAddress: string | undefined = recipientProfile?.address

    const [recipientPosts, supporterPostLists] = await Promise.all([
      recipientAddress
        ? getLensV3PostsByAddress({
            address: recipientAddress,
            handle: recipientHandle,
          }).catch(() => [])
        : Promise.resolve([]),
      Promise.all(
        top.map((s) =>
          getLensV3PostsByAddress({
            address: s.address,
            handle: s.handle,
          }).catch(() => [])
        )
      ),
    ])

    const supporterBlocks = top
      .map((s, i) => {
        const digest = postsDigest(supporterPostLists[i], POSTS_PER_SUPPORTER)
        return `### @${s.handle} (${s.name})\n${
          digest || "(no recent posts found)"
        }`
      })
      .join("\n\n")

    const prompt = buildPrompt(
      recipientHandle,
      recipientName,
      postsDigest(recipientPosts, POSTS_FOR_RECIPIENT),
      supporterBlocks
    )

    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 1,
          maxOutputTokens: 2048,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                handle: { type: "STRING" },
                note: { type: "STRING" },
              },
              required: ["handle", "note"],
            },
          },
        },
      }),
    })

    if (!geminiRes.ok) {
      console.error(
        "[thank-you-messages] Gemini error",
        geminiRes.status,
        await geminiRes.text().catch(() => "")
      )
      return NextResponse.json({ notes: {} })
    }

    const geminiJson = await geminiRes.json()
    const raw = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text
    if (typeof raw !== "string") {
      return NextResponse.json({ notes: {} })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return NextResponse.json({ notes: {} })
    }

    // Map each note back to a supporter address (keyed lowercase for the
    // client merge). Match on handle so order drift can't misattribute notes.
    const addressByHandle = new Map(
      top.map((s) => [s.handle.toLowerCase(), s.address.toLowerCase()])
    )
    const notes: Record<string, string> = {}
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (!item || typeof item !== "object") continue
        const handle = String((item as { handle?: unknown }).handle ?? "")
          .toLowerCase()
          .replace(/^@/, "")
          .trim()
        const note = (item as { note?: unknown }).note
        const address = addressByHandle.get(handle)
        if (address && typeof note === "string" && note.trim()) {
          notes[address] = note.trim()
        }
      }
    }

    return NextResponse.json({ notes })
  } catch (e) {
    console.error("[thank-you-messages] failed", e)
    return NextResponse.json({ notes: {} })
  }
}
