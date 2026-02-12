"use client"

import { motion } from "framer-motion"
import { Search, BarChart3, Users } from "lucide-react"
import { useRouter } from "next/navigation"

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export default function FeaturesSection() {
  const router = useRouter()

  const features = [
    {
      icon: Search,
      title: "Search Any Handle",
      description:
        "Look up any Lens user by handle to see their tips made on 2026 — both sent and received, grouped by token: $GHO, $BONSAI and $POINTLESS.",
      action: () => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", metaKey: true })
        )
      },
    },
    {
      icon: Users,
      title: "Discover Top Rewards Recipients",
      description:
        "During a part of 2025 Lens Chain hada Rewards Program. This section shows the top recipients of these rewards.",
      action: () => {
        router.push("/rewards")
      },
    },
  ]

  return (
    <section className="py-20 px-4 pb-32">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="flex flex-wrap justify-center gap-6 max-w-4xl mx-auto"
      >
        {features.map((feature) => (
          <motion.button
            key={feature.title}
            variants={cardVariants}
            onClick={feature.action}
            className="group rounded-2xl bg-zinc-950/40 border border-zinc-800/50 p-6 flex flex-col gap-4 cursor-pointer text-left w-full sm:w-[calc(50%-0.75rem)] max-w-sm"
          >
            <div className="w-10 h-10 rounded-lg bg-zinc-800/60 group-hover:bg-yellow-500/10 flex items-center justify-center transition-colors duration-300">
              <feature.icon className="w-5 h-5 text-zinc-400 group-hover:text-yellow-300 transition-colors duration-300" />
            </div>
            <h3 className="text-base font-semibold text-zinc-100">
              {feature.title}
            </h3>
            <p className="text-zinc-500 text-sm leading-relaxed text-balance">
              {feature.description}
            </p>
          </motion.button>
        ))}
      </motion.div>
    </section>
  )
}
