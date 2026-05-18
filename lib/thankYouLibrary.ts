// Remembers thank-you JSONs the user has uploaded to the /thank-you studio so
// they don't have to re-export/re-upload every session. Stored in localStorage
// (no extra deps — same pattern as profileCache.ts). Deduped by recipient
// handle (newest wins), newest-first, capped to MAX_ENTRIES.
import { isThankYouExport, type ThankYouExport } from "@/lib/thankYouRanking"

export type ThankYouLibraryEntry = {
  savedAt: number
  data: ThankYouExport
}

const STORAGE_KEY = "lctips:thankYouLibrary:v1"
const MAX_ENTRIES = 8

const isBrowser = typeof window !== "undefined"

const handleKey = (e: ThankYouLibraryEntry) =>
  e.data.recipient.handle.toLowerCase()

const read = (): ThankYouLibraryEntry[] => {
  if (!isBrowser) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (e): e is ThankYouLibraryEntry =>
          e &&
          typeof e.savedAt === "number" &&
          isThankYouExport(e.data)
      )
      .sort((a, b) => b.savedAt - a.savedAt)
  } catch {
    return []
  }
}

const write = (entries: ThankYouLibraryEntry[]) => {
  if (!isBrowser) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Quota / serialization error — drop silently.
  }
}

export const listThankYouLibrary = (): ThankYouLibraryEntry[] => read()

export const saveToThankYouLibrary = (
  data: ThankYouExport
): ThankYouLibraryEntry[] => {
  const entry: ThankYouLibraryEntry = { savedAt: Date.now(), data }
  const key = entry.data.recipient.handle.toLowerCase()
  const next = [entry, ...read().filter((e) => handleKey(e) !== key)].slice(
    0,
    MAX_ENTRIES
  )
  write(next)
  return next
}

export const removeFromThankYouLibrary = (
  handle: string
): ThankYouLibraryEntry[] => {
  const key = handle.toLowerCase()
  const next = read().filter((e) => handleKey(e) !== key)
  write(next)
  return next
}
