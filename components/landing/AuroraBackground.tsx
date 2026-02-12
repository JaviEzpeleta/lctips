"use client"

import { motion } from "framer-motion"

export default function AuroraBackground() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 2 }}
      className="absolute inset-0 overflow-hidden pointer-events-none"
    >
      {/* Emerald blob — top left */}
      <div
        className="animate-aurora-1 absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-gradient-radial from-emerald-500/20 via-emerald-500/5 to-transparent blur-3xl"
      />
      {/* Amber blob — top right */}
      <div
        className="animate-aurora-2 absolute -top-[10%] -right-[15%] w-[50vw] h-[50vw] rounded-full bg-gradient-radial from-amber-500/15 via-yellow-500/5 to-transparent blur-3xl"
      />
      {/* Indigo blob — bottom center */}
      <div
        className="animate-aurora-3 absolute bottom-[5%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-gradient-radial from-indigo-500/10 via-indigo-500/5 to-transparent blur-3xl"
      />
    </motion.div>
  )
}
