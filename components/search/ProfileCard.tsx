"use client"

import { Account } from "@lens-protocol/react"
import { X } from "lucide-react"

import Link from "next/link"
import { Button } from "../ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"

const ProfileCard = ({
  profile,
  setSelectedProfile,
}: {
  profile: Account
  setSelectedProfile: (profile: Account | null) => void
}) => {
  return (
    <div className="mb-4 relative h-60 flex flex-col justify-between p-2 border rounded-md overflow-hidden bg-card text-card-foreground shadow">
      <div className="absolute inset-0 pointer-events-none -z-0 overflow-hidden">
        <img
          src={profile.metadata?.picture}
          alt={profile.metadata?.name || ""}
          className="w-full h-full object-contain blur-[4px] scale-[300%] opacity-40"
        />
      </div>
      <div className="flex justify-end absolute top-2 right-2 z-20">
        <Button
          variant="outline"
          className="cursor-pointer hover:opacity-60"
          onClick={() => setSelectedProfile(null)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="z-10 flex flex-col gap-2 flex-1 justify-between">
        <div className="flex items-center w-full gap-3 z-10">
          <Avatar className="h-16 w-16 border-2 border-black/60 shadow-lg shadow-black/30">
            {profile.metadata?.picture && (
              <AvatarImage
                src={profile.metadata?.picture}
                alt={profile.metadata?.name || ""}
              />
            )}
            <AvatarFallback>
              {(profile.metadata?.name || "UP")?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="z-10 space-y-0">
            <div className="text-3xl font-semibold w-80 truncate text-ellipsis">
              {profile.metadata?.name || "Unnamed"}
            </div>
            <div className="text-xl leading-5 opacity-70">
              @{profile.username?.localName}
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-2">
          <Link
            href={`https://explorer.lens.xyz/address/${profile.owner}`}
            target="_blank"
            className="bg-transparent opacity-80 hover:opacity-100 active:opacity-40 active:scale-95 duration-200 active:duration-100 hover:bg-indigo-400/20 transition-all p-2 px-4 rounded-lg text-sm"
          >
            View on Explorer
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ProfileCard
