import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number for GHO amount display with custom decimal rules:
 * - If < 1: shows 5 decimals
 * - If >= 1: shows 2 decimals
 * - If decimals are .00, shows just the whole number
 */
export function formatGHOAmount(amount: number): string {
  if (amount < 1) {
    // For amounts less than 1, show 5 decimals
    return amount.toFixed(5)
  } else {
    // For amounts >= 1, show 2 decimals
    const formatted = amount.toFixed(2)

    // If decimals are .00, remove them
    if (formatted.endsWith(".00")) {
      return formatted.slice(0, -3)
    }

    return formatted
  }
}

/**
 * Formats large numbers with K/M abbreviation:
 * - If >= 1,000,000: shows as "X.XM" (1 decimal)
 * - If >= 10,000: shows as "X.XK" (1 decimal)
 * - If < 10,000: shows with commas and 2 decimals
 * Examples: 2612600 → "2.6M", 19949.86 → "19.9K", 2542.94 → "2,542.94", 439.15 → "439.15"
 */
export function formatLargeNumber(amount: number): string {
  if (amount >= 1000000) {
    const m = amount / 1000000
    return `${m.toFixed(1)}M`
  } else if (amount >= 10000) {
    const k = amount / 1000
    return `${k.toFixed(1)}K`
  } else {
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }
}
