"use client"

import { motion } from "framer-motion"
import React from "react"

function BlurryEntranceSuperFast({
  children,
  delay = 0,
  wFull = false,
  hFull = false,
  ...props
}: {
  children: React.ReactNode
  delay?: number
  wFull?: boolean
  hFull?: boolean
  [key: string]: any
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 20,
        filter: "blur(10px)",
        // scale: 0.7,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
      }}
      transition={{
        delay,
        duration: 0.11,
        ease: "easeOut",
      }}
      viewport={{ once: true }}
      className={`${wFull && "w-full"} ${hFull && "h-full"}`}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export default BlurryEntranceSuperFast
