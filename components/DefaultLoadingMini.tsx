import React from "react"
import { CgSpinnerTwo } from "react-icons/cg"

import BlurryEntrance from "./BlurryEntrance"

function DefaultLoadingMini() {
  return (
    <div
      className="w-full max-w-2xl mx-auto flex 
  justify-center flex-col items-center p-12 md:py-20"
    >
      <BlurryEntrance delay={0.12}>
        <div className="animate-pulse">
          <CgSpinnerTwo className="animate-spin text-4xl text-indigo-400 dark:text-emerald-400" />
        </div>
      </BlurryEntrance>
    </div>
  )
}

export default DefaultLoadingMini
