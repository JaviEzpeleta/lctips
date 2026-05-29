"use client"

import { motion } from "framer-motion"
import { Search, Trophy, ExternalLink } from "lucide-react"
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
        "Look up any Lens user by handle to see their tips made on 2026 — both sent and received, grouped by token: $GHO, $BONSAI and $POINTLESS. Find who's tipping your favorite people and discover new accounts!",
      onClick: () => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", metaKey: true })
        )
      },
    },
    {
      icon: Trophy,
      title: "Discover Top Rewards Recipients",
      description:
        "During a part of 2025 Lens Chain had a Rewards Program. This section shows the top recipients of these rewards.",
      onClick: () => {
        router.push("/rewards")
      },
    },
    {
      image: "/orb-logo.jpg",
      title: "Orb × Lens Tipping Experiment",
      description:
        "Last weekend (May 22–24), every Orb user got $5 of GHO to tip people on Lens. Type a handle to see every tip in and out — in GHO and POINTLESS — plus the weekend leaderboards.",
      href: "https://lctips-weekend.vercel.app/",
    },
  ]

  return (
    <section className="py-20 px-4">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="flex flex-wrap justify-center gap-6 max-w-4xl mx-auto"
      >
        {features.map((feature) => {
          const cardClass =
            "group rounded-2xl bg-zinc-950/40 border border-zinc-800/50 p-6 flex flex-col gap-4 cursor-pointer text-left w-full sm:w-[calc(50%-0.75rem)] max-w-sm"
          const isLink = "href" in feature
          const hasImage = "image" in feature

          const inner = (
            <>
              {hasImage ? (
                <div className="w-10 h-10 rounded-lg overflow-hidden">
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-zinc-800/60 group-hover:bg-yellow-500/10 flex items-center justify-center transition-colors duration-300">
                  <feature.icon className="w-5 h-5 text-zinc-400 group-hover:text-yellow-300 transition-colors duration-300" />
                </div>
              )}
              <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                {feature.title}
                {isLink && (
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-600 group-hover:text-yellow-300 transition-colors duration-300" />
                )}
              </h3>
              <p className="text-zinc-500 text-sm leading-relaxed text-balance">
                {feature.description}
              </p>
            </>
          )

          if (isLink) {
            return (
              <motion.a
                key={feature.title}
                variants={cardVariants}
                href={feature.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cardClass}
              >
                {inner}
              </motion.a>
            )
          }

          return (
            <motion.button
              key={feature.title}
              variants={cardVariants}
              onClick={feature.onClick}
              className={cardClass}
            >
              {inner}
            </motion.button>
          )
        })}
      </motion.div>
    </section>
  )
}
