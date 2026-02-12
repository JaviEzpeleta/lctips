"use client"

import { motion } from "framer-motion"
import { Github, ExternalLink } from "lucide-react"

const projects = [
  {
    name: "lensie.xyz",
    url: "https://lensie.xyz",
    description: "Lens Protocol client",
  },
  {
    name: "0xfm.com",
    url: "https://0xfm.com",
    description: "Onchain radio",
  },
  {
    name: "asklc.xyz",
    url: "https://asklc.xyz",
    description: "Ask Lens Chain",
  },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export default function LinksSection() {
  return (
    <section className="py-16 px-4 pb-32">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="flex flex-col items-center gap-8 max-w-2xl mx-auto"
      >
        {/* GitHub link */}
        <motion.a
          variants={itemVariants}
          href="https://github.com/JaviEzpeleta/lctips"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-3 rounded-xl border border-zinc-800/50 bg-zinc-950/40 px-5 py-3 transition-colors hover:border-zinc-700 hover:bg-zinc-900/60"
        >
          <Github className="w-5 h-5 text-zinc-400 group-hover:text-zinc-100 transition-colors" />
          <span className="text-sm text-zinc-400 group-hover:text-zinc-100 transition-colors">
            View source on GitHub
          </span>
        </motion.a>

        {/* Other projects */}
        <motion.div variants={itemVariants} className="flex flex-col items-center gap-3">
          <p className="text-xs text-zinc-600 uppercase tracking-widest">
            More projects
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {projects.map((project) => (
              <a
                key={project.name}
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 rounded-lg border border-zinc-800/40 bg-zinc-950/30 px-4 py-2 transition-colors hover:border-zinc-700 hover:bg-zinc-900/50"
              >
                <span className="text-sm text-zinc-500 group-hover:text-zinc-200 transition-colors">
                  {project.name}
                </span>
                <ExternalLink className="w-3 h-3 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
              </a>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}
