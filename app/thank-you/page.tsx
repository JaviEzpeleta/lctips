"use client"

import dynamic from "next/dynamic"

const ThankYouStudio = dynamic(
  () => import("@/components/thankyou/ThankYouStudio"),
  {
    ssr: false,
    loading: () => (
      <div className="max-w-3xl mx-auto w-full px-3 py-10 text-sm text-zinc-400">
        Loading studio…
      </div>
    ),
  }
)

export default function ThankYouPage() {
  return <ThankYouStudio />
}
