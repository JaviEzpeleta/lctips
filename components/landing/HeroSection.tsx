"use client"

import { motion } from "framer-motion"
import { VideoText } from "@/components/ui/video-text"
import { Typewriter } from "@/components/ui/typewriter-text"
import SearchForUser from "@/components/search/SearchForUser"
import { Mouse } from "lucide-react"

export default function HeroSection() {
  return (
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-4">
      {/* VideoText title */}
      <motion.div
        initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, delay: 0.1 }}
      >
        <VideoText
          src="/videos/0.mp4"
          fontSize="16vw"
          playbackRate={0.6}
          className="select-none"
        >
          LCTips
        </VideoText>
      </motion.div>

      {/* Tagline + Typewriter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4 }}
        className="text-center mt-4 space-y-3"
      >
        <p className="text-zinc-300 text-sm sm:text-lg max-w-md mx-auto">
          Discover who&apos;s tipping who on{" "}
          <span className="text-yellow-300 font-semibold">Lens Chain</span>
        </p>
        <div className="text-zinc-500 text-xs sm:text-sm h-6">
          <Typewriter
            text={[
              "Search any Lens handle...",
              "Track GHO tips...",
              "Explore BONSAI rewards...",
              "Visualize tipping patterns...",
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
        <div className="relative">
          <SearchForUser hideTitle={true} />
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
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
      </motion.div>
    </section>
  )
}
