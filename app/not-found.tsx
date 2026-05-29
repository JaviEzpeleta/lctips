"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { HomeIcon, Search, Trophy } from "lucide-react"
import AuroraBackground from "@/components/landing/AuroraBackground"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="relative flex-1 w-full overflow-hidden flex items-center justify-center px-4 py-16">
      <AuroraBackground />

      <div className="relative z-[1] w-full max-w-2xl flex flex-col items-center text-center">
        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 justify-center pb-6"
        >
          <Link
            href="/"
            // className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-zinc-800 bg-zinc-950/60 text-zinc-200 font-medium transition-colors duration-200 hover:border-zinc-700 hover:bg-zinc-900/60 active:opacity-70"
          >
            <Button variant="secondary">
              <HomeIcon className="w-4 h-4" />
              Home
            </Button>
          </Link>

          <Link
            href="/rewards"
            // className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#47ec93] text-zinc-950 font-semibold transition-all duration-200 shadow-lg shadow-emerald-500/20 hover:opacity-90 active:opacity-70"
          >
            <Button>
              <Trophy className="w-4 h-4" />
              Explore Rewards
            </Button>
          </Link>
        </motion.div>

        {/* Big 404 with brand-green glow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 140 }}
          className="relative"
        >
          <div className="absolute -inset-8 bg-gradient-radial from-[#47ec93]/25 via-emerald-500/10 to-transparent blur-3xl animate-glow-pulse pointer-events-none" />
          <h1 className="relative text-7xl sm:text-8xl md:text-9xl font-bold leading-none tracking-tight text-zinc-100 select-none">
            4<span className="text-[#47ec93]">0</span>4
          </h1>
        </motion.div>

        {/* Copy */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 space-y-2"
        >
          <p className="text-xl sm:text-2xl font-semibold text-zinc-100">
            This page wandered off-chain
          </p>
          <p className="text-sm sm:text-base text-zinc-400 max-w-md mx-auto text-balance">
            We couldn&apos;t find what you were looking for, but you can still
            search for any{" "}
            <span className="text-yellow-300 font-medium">Lens</span> user
            below.
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="relative w-full mt-6"
        >
          {/* Glow behind the search */}
          <div className="absolute -inset-4 bg-gradient-radial from-emerald-500/15 via-yellow-500/5 to-transparent rounded-3xl blur-2xl animate-glow-pulse pointer-events-none" />
          {/* Fake search box — opens the global search modal (⌘K) */}
          <button
            type="button"
            onClick={() =>
              document.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", metaKey: true })
              )
            }
            aria-label="Search for a Lens user"
            className="relative w-full flex items-center gap-3 rounded-2xl border-2 border-zinc-800 bg-zinc-950/60 px-5 py-4 text-left text-base text-zinc-500 transition-colors hover:border-zinc-700 hover:bg-zinc-900/60 cursor-pointer"
          >
            <Search className="h-5 w-5 shrink-0 text-zinc-500" />
            <span className="flex-1">Search for a Lens user</span>
            <kbd className="pointer-events-none hidden select-none rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 sm:inline-block">
              ⌘K
            </kbd>
          </button>
        </motion.div>
      </div>
    </div>
  )
}
