"use client"

import { motion } from "framer-motion"
import Image from "next/image"

const tokens = [
  {
    name: "GHO",
    description: "The primary tipping token on Lens Chain. Reliable and stable af!",
    logo: "/gho-icon.png",
    gradient: "from-cyan-400/20 to-cyan-600/0",
  },
  {
    name: "BONSAI",
    description: "Most Lens clients no longer support Bonsai tipping. Historical tips are still tracked here!",
    logo: "/img/bonsai-logo.webp",
    gradient: "from-green-400/20 to-green-600/0",
  },
  {
    name: "POINTLESS",
    description: "The best tipping token on Lens Chain. Becoming a millionaire was never so easy!",
    logo: "/img/pointless-logo.webp",
    gradient: "from-purple-400/20 to-purple-600/0",
  },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
}

export default function TokenShowcase() {
  return (
    <section className="py-20 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">
          Track Tips Across Tokens
        </h2>
        <p className="text-zinc-500 mt-2 text-sm sm:text-base">
          See the full picture of tipping activity on Lens
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="flex flex-col sm:flex-row items-center justify-center gap-6 max-w-4xl mx-auto"
      >
        {tokens.map((token, i) => (
          <motion.div
            key={token.name}
            variants={cardVariants}
            animate={{ y: [0, -6, 0] }}
            transition={{
              y: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 },
            }}
            className="group relative w-full sm:w-64 rounded-2xl bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 p-6 flex flex-col items-center gap-4 cursor-default"
          >
            {/* Hover gradient overlay */}
            <div
              className={`absolute inset-0 rounded-2xl bg-gradient-to-b ${token.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
            />
            <div className="relative z-[1] flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-zinc-800/60 flex items-center justify-center overflow-hidden">
                <Image
                  src={token.logo}
                  alt={token.name}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              </div>
              <h3 className="text-lg font-bold text-zinc-100">{token.name}</h3>
              <p className="text-zinc-500 text-sm text-center leading-relaxed text-balance">
                {token.description}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
