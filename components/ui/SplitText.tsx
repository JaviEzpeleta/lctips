"use client"

import { useRef, useCallback, useEffect, useState } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"

interface SplitTextProps {
  text: string
  className?: string
  delay?: number
  duration?: number
  ease?: string
  splitType?: "chars" | "words" | "lines"
  from?: gsap.TweenVars
  to?: gsap.TweenVars
  threshold?: number
  rootMargin?: string
  textAlign?: "left" | "center" | "right"
  onLetterAnimationComplete?: () => void
  showCallback?: boolean
}

export function SplitText({
  text,
  className = "",
  delay = 50,
  duration = 0.6,
  ease = "power3.out",
  splitType = "chars",
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = "-50px",
  textAlign = "center",
  onLetterAnimationComplete,
  showCallback = false,
}: SplitTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const elementsRef = useRef<HTMLSpanElement[]>([])
  const [isVisible, setIsVisible] = useState(false)

  const setElementRef = useCallback((el: HTMLSpanElement | null, index: number) => {
    if (el) elementsRef.current[index] = el
  }, [])

  // IntersectionObserver to trigger animation when visible
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(container)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(container)
    return () => observer.disconnect()
  }, [threshold, rootMargin])

  // GSAP animation
  useGSAP(() => {
    if (!isVisible || elementsRef.current.length === 0) return

    gsap.fromTo(
      elementsRef.current,
      from,
      {
        ...to,
        duration,
        ease,
        stagger: delay / 1000,
        onComplete: () => {
          if (showCallback || onLetterAnimationComplete) {
            onLetterAnimationComplete?.()
          }
        },
      }
    )
  }, { dependencies: [isVisible], scope: containerRef })

  const splitElements = () => {
    if (splitType === "chars") {
      return text.split("").map((char, i) => (
        <span
          key={i}
          ref={(el) => setElementRef(el, i)}
          style={{ display: "inline-block", opacity: 0 }}
          aria-hidden="true"
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))
    }

    if (splitType === "words") {
      return text.split(" ").map((word, i, arr) => (
        <span
          key={i}
          ref={(el) => setElementRef(el, i)}
          style={{ display: "inline-block", opacity: 0 }}
          aria-hidden="true"
        >
          {word}
          {i < arr.length - 1 ? "\u00A0" : ""}
        </span>
      ))
    }

    // lines
    return text.split("\n").map((line, i) => (
      <span
        key={i}
        ref={(el) => setElementRef(el, i)}
        style={{ display: "inline-block", opacity: 0, width: "100%" }}
        aria-hidden="true"
      >
        {line}
      </span>
    ))
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ textAlign, perspective: 400 }}
      aria-label={text}
    >
      {splitElements()}
    </div>
  )
}
