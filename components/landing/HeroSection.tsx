"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { SplitText } from "@/components/ui/SplitText"
import { Typewriter } from "@/components/ui/typewriter-text"
import { Mouse, Search } from "lucide-react"

export default function HeroSection() {
  return (
    <section className="relative min-h-0 py-20 lg:min-h-[85vh] flex flex-col items-center justify-center px-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full max-w-6xl">
        {/* Left column — hero content */}
        <div className="flex flex-col items-center lg:items-start">
          {/* SplitText title */}
          <SplitText
            text="LCTips"
            className="text-5xl sm:text-6xl md:text-7xl font-bold leading-none select-none text-zinc-100 mb-10"
            delay={80}
            duration={1.0}
            ease="power3.out"
            splitType="chars"
            from={{ opacity: 0, y: 50, rotateX: -40 }}
            to={{ opacity: 1, y: 0, rotateX: 0 }}
            threshold={0.1}
            rootMargin="-50px"
            textAlign="center"
            showCallback
          />

          {/* Tagline + Typewriter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="text-center lg:text-left mt-4 space-y-3"
          >
            <p className="text-zinc-300 text-sm sm:text-lg max-w-md mx-auto lg:mx-0">
              Discover who&apos;s tipping who on{" "}
              <span className="text-yellow-300 font-semibold">Lens Chain</span>
            </p>
            <p className="text-zinc-400 text-xs sm:text-sm max-w-md mx-auto lg:mx-0">
              See who tips the people you love — discover new profiles!
            </p>
            <div className="text-zinc-500 text-xs sm:text-sm h-6">
              <Typewriter
                text={[
                  "Search any Lens handle...",
                  "Track GHO tips...",
                  "Explore BONSAI rewards...",
                  "Visualize tipping patterns...",
                  "Discover new profiles...",
                ]}
                speed={60}
                deleteSpeed={30}
                delay={2000}
                loop
              />
            </div>
          </motion.div>

          {/* Search bar with glow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 }}
            className="relative w-full max-w-2xl mt-8"
          >
            {/* Glow effect behind the search */}
            <div className="absolute -inset-4 bg-gradient-radial from-emerald-500/20 via-yellow-500/10 to-transparent rounded-3xl blur-2xl animate-glow-pulse pointer-events-none" />
            <button
              onClick={() =>
                document.dispatchEvent(
                  new KeyboardEvent("keydown", { key: "k", metaKey: true })
                )
              }
              className="relative w-full flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-left text-sm text-zinc-500 transition-colors hover:border-zinc-700 hover:bg-zinc-900/60 cursor-pointer"
            >
              <Search className="h-4 w-4 shrink-0 text-zinc-500" />
              <span className="flex-1">Search for a Lens handle...</span>
              <kbd className="pointer-events-none hidden select-none rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 sm:inline-block">
                ⌘K
              </kbd>
            </button>
          </motion.div>
        </div>

        {/* Right column — screenshot */}
        <motion.div
          initial={{ opacity: 0, x: 80 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
          className="flex justify-center lg:justify-end"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            {/* Glow behind the screenshot */}
            <div className="absolute -inset-8 bg-gradient-radial from-emerald-500/15 via-yellow-500/5 to-transparent rounded-3xl blur-3xl pointer-events-none" />
            <div style={{ perspective: "1200px" }}>
              <Image
                src="/img/lctips-screenshot.webp"
                alt="LCTips app showing user tipping stats and Top GHO Tippers leaderboard"
                width={1920}
                height={1536}
                priority
                className="relative max-w-[360px] sm:max-w-[400px] lg:max-w-[540px] w-full h-auto rounded-2xl border border-zinc-700/50 shadow-2xl shadow-black/50"
                style={{
                  transform: "rotateY(-4deg) rotateX(2deg)",
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      {/* <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.5 }}
        className="absolute bottom-8 flex flex-col items-center gap-2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Mouse className="w-5 h-5 text-zinc-600" />
        </motion.div>
        <span className="text-zinc-600 text-xs">Scroll to explore</span>
      </motion.div> */}
    </section>
  )
}
