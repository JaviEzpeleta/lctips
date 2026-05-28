"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import Link from "next/link"

const AddressOrProfile = ({
  address,
  reward,
  isFirstPlace = false,
}: {
  address: string
  reward: any
  isFirstPlace?: boolean
}) => {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/profile-data-by-address", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address }),
        })
        if (!response.ok) return
        const data = await response.json()
        setProfile(data.profile)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [address])

  if (loading) return <div>Loading...</div>

  if (!profile.username) return null

  return (
    <>
      <Link
        href={`https://palus.app/u/${profile.username.localName}`}
        target="_blank"
        className="relative"
      >
        <Avatar
          className={` ${
            isFirstPlace ? "h-20 w-20" : "h-14 w-14"
          }  rounded-lg shadow-sm border transition-all active:scale-95 ${
            isFirstPlace
              ? "shadow-yellow-500/50 border-2 border-yellow-500 hover:border-yellow-400 hover:scale-110"
              : "shadow-black border-black hover:border-indigo-300 hover:scale-105"
          }`}
        >
          {profile.metadata && profile.metadata.picture && (
            <AvatarImage
              src={profile.metadata.picture}
              alt={profile.username.localName}
            />
          )}

          <AvatarFallback>
            {reward.address.slice(2, 4).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex-1">
        <div>
          <h3 className="font-semibold text-base">
            <Link
              href={`https://palus.app/u/${profile.username.localName}`}
              target="_blank"
              className="text-sm text-indigo-500 hover:!text-indigo-400 w-40 sm:w-56 truncate text-ellipsis block"
            >
              @{profile.username.localName}
            </Link>
            <div className="text-xs text-gray-500 w-40 sm:w-56 truncate text-ellipsis">
              {profile.metadata.name}
            </div>
          </h3>
        </div>
      </div>
    </>
  )
}

export default AddressOrProfile
