"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Kbd from "./Kbd"
import { Button } from "./ui/button"
import SearchDialog from "./SearchDialog"
import { useSearchDialog } from "@/hooks/useSearchDialog"

const Footer = () => {
  const { open, onOpenChange, setOpen } = useSearchDialog()
  const pathname = usePathname()
  const isRewards = pathname === "/rewards"

  return (
    <>
      <div className="text-center text-sm bg-black/30 py-3 text-zinc-400 w-full">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-2">
          <div>
            <Link
              href="https://palus.app/posts/2x3jf9g38h37tec9knm"
              className="text-indigo-300 hover:text-indigo-400 active:opacity-50"
            >
              what is LCTips?
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={isRewards ? "/" : "/rewards"}
              className="text-indigo-300 hover:text-indigo-400 active:opacity-50"
            >
              {isRewards ? "Home" : "Rewards"}
            </Link>
          </div>
          <Button onClick={() => setOpen(true)}>
            <div className="flex items-center gap-2">
              <div className="text-xs text-white/70">Search</div>
              <div className="flex items-center gap-1">
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </div>
            </div>
          </Button>
        </div>
      </div>
      <SearchDialog open={open} onOpenChange={onOpenChange} />
    </>
  )
}

export default Footer
