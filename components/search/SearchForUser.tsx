"use client"

import { useState, useEffect, useRef } from "react"
import { useAccounts, Account } from "@lens-protocol/react"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import DefaultLoadingMini from "../DefaultLoadingMini"
import ProfileCard from "./ProfileCard"
import { useRouter } from "next/navigation"

// Component to fetch and display results within the CommandList
function UserSearchResults({
  searchTerm,
  onSelect, // Callback when a user is selected
  selectedIndex,
  setSelectedIndex,
}: {
  searchTerm: string
  onSelect: (profile: Account | null) => void // Pass the selected profile back
  selectedIndex: number
  setSelectedIndex: (index: number) => void
}) {
  const filter = searchTerm
    ? {
        searchBy: {
          localNameQuery: searchTerm,
        },
      }
    : undefined

  const { data: profiles, loading } = useAccounts({
    filter,
  })

  const scrollContainerRef = useRef<HTMLDivElement>(null) // <-- Add ref for the scroll container

  // Effect to scroll the selected item into view
  useEffect(() => {
    if (scrollContainerRef.current && profiles?.items.length) {
      // Ensure the container and items exist
      const selectedItemElement = scrollContainerRef.current.querySelector(
        `#user-item-${selectedIndex}`
      )
      if (selectedItemElement) {
        selectedItemElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest", // Scrolls the minimum amount needed
        })
      }
    }
    // Depend on selectedIndex and the list of profiles (in case it reloads)
  }, [selectedIndex, profiles])

  useEffect(() => {
    // reset selected index when search term changes
    setSelectedIndex(0)
  }, [searchTerm])

  const [profilesToShow, setProfilesToShow] = useState<any[]>([])

  useEffect(() => {
    if (profiles) {
      setProfilesToShow([...profiles.items])
    }
  }, [profiles])

  if (profilesToShow.length === 0) {
    return (
      <div className="p-4 flex-1 flex items-center justify-center text-center text-sm opacity-70 h-full">
      </div>
    )
  }

  return (
    <div ref={scrollContainerRef} className="h-64 relative">
      <div className="text-xs opacity-70 px-2 pt-2">
        {profilesToShow.length !== 1
          ? profilesToShow.length + " suggestions"
          : "1 suggestion"}
      </div>
      <div className="flex flex-col gap-2 h-full pt-2 px-2 pr-1">
        {profilesToShow.map((profile, index) => {
          const isSelected = selectedIndex === index
          const displayName = profile.username?.localName || "Unnamed Profile"
          const pictureUrl = profile.metadata?.picture

          return (
            <div
              id={`user-item-${index}`} // <-- Add unique ID to each item
              key={profile.address} // Use address as key
              onClick={() => onSelect(profile)} // <-- Changed onSelect to onClick for clarity, assumed it was a click handler
              className={`gap-2 hover:opacity-60 border-2 cursor-pointer transition-all duration-100 flex items-center p-2  rounded-lg ${
                isSelected
                  ? "bg-yellow-100/20 border-yellow-100 text-yellow-300"
                  : "bg-zinc-950 border-transparent"
              }`}
            >
              <Avatar className="h-12 w-12">
                {pictureUrl && (
                  <AvatarImage src={pictureUrl} alt={displayName} />
                )}
                <AvatarFallback>
                  {displayName?.substring(0, 2).toUpperCase() || "UP"}
                </AvatarFallback>
              </Avatar>
              <div className="">
                {profile.metadata?.name && (
                  <p className="text-xl font-medium">{profile.metadata.name}</p>
                )}
                <p className="text-sm text-white/50">@{displayName}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

const SearchForUser = ({
  onClose,
  hideTitle = false,
}: {
  onClose?: () => void
  hideTitle?: boolean
}) => {
  const router = useRouter()
  const [inputValue, setInputValue] = useState("")
  const [selectedProfile, setSelectedProfile] = useState<Account | null>(null)
  const debouncedSearchTerm = useDebounce(inputValue, 300)
  const [showResults, setShowResults] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { data: profiles } = useAccounts({
    // <-- Get profiles here too to check bounds
    filter: debouncedSearchTerm
      ? { searchBy: { localNameQuery: debouncedSearchTerm } }
      : undefined,
  })

  const handleSelectProfile = (profile: Account | null) => {
    if (profile) {
      router.push(`/u/${profile.username?.localName}`)
      onClose?.() // Close the modal after navigation
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const resultsCount = profiles?.items.length ?? 0
    if (!resultsCount) return // Don't handle keys if no results

    if (e.key === "ArrowDown") {
      e.preventDefault() // Prevent default page scroll
      setSelectedIndex((prevIndex) => (prevIndex + 1) % resultsCount) // Cycle down
    } else if (e.key === "ArrowUp") {
      e.preventDefault() // Prevent default page scroll
      setSelectedIndex(
        (prevIndex) => (prevIndex - 1 + resultsCount) % resultsCount
      ) // Cycle up
    } else if (
      e.key === "Enter" &&
      selectedIndex >= 0 &&
      selectedIndex < resultsCount
    ) {
      // Handle Enter key to select the highlighted profile
      const selectedProfile = profiles?.items[selectedIndex]
      if (selectedProfile) {
        handleSelectProfile(selectedProfile)
      }
    }
  }

  return (
    <div className="mx-auto max-w-2xl w-full">
      <Card className="bg-transparent text-white border-none p-4">
        <CardContent className="h-96 space-y-4 flex flex-col p-0">
          {!hideTitle && (
            <div className="font-medium text-base sm:text-xl text-center opacity-60">
              Search for any Lens user
            </div>
          )}

          <div className="relative h-full flex-1 flex flex-col gap-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground" />
              </div>
              <Input
                ref={inputRef}
                placeholder="Search for a Lens user"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value)
                  setShowResults(!!e.target.value)
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowResults(!!inputValue)}
                onBlur={() => {
                  setTimeout(() => {
                    if (
                      resultsRef.current &&
                      !resultsRef.current.contains(document.activeElement)
                    ) {
                      setShowResults(false)
                    }
                  }, 150)
                }}
                className="w-full pl-10 sm:pl-12 !text-base
                transition-all duration-300 h-12 border-2 
                focus-visible:border-zinc-500/40 focus:border-yellow-100/40 
                active:border-yellow-100/40 !focus-within:border-yellow-200/40
                 !focus:border-yellow-200/40 border-black bg-zinc-950/60 shadow-sm shadow-black/50"
              />
            </div>

            {showResults ? (
              <div
                aria-label="Search results"
                className="bg-zinc-900 p-0 rounded-lg flex-1 flex flex-col"
              >
                {debouncedSearchTerm.trim() ? (
                  <div className="flex-1 flex flex-col h-40 overflow-y-auto">
                    <UserSearchResults
                      searchTerm={debouncedSearchTerm.trim()}
                      onSelect={handleSelectProfile}
                      selectedIndex={selectedIndex}
                      setSelectedIndex={setSelectedIndex}
                    />
                  </div>
                ) : (
                  <div className="p-4">
                    <p className="text-sm text-muted-foreground"></p>
                  </div>
                )}
              </div>
            ) : (
              <>
                {selectedProfile ? (
                  <ProfileCard
                    profile={selectedProfile}
                    setSelectedProfile={setSelectedProfile}
                  />
                ) : (
                  <div className="p-4 flex-1 flex items-center justify-center text-center text-sm opacity-70 h-full">
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SearchForUser
