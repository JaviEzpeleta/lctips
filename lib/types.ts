export interface ProfileFetchedFromGraphQL {
  id: string
  ownedBy: string
  handle: string
  displayName: string
  coverPicture?: string
  picture?: string
  followers?: string
  bio?: string
}

export type LensSavedProfile = {
  id: string
  address: string
  handle: string
  display_name: string
  profile_picture: string
  cover_picture: string
  bio: string
  facts: string[]
}

export type SavedUser = {
  id: string
  address: string
  handle: string
  display_name: string
  profile_picture?: string
  cover_picture?: string
  bio?: string
  followers?: string
  social_network: "lens" | "twitter"
}

export type StandardPublication = {
  id: string
  profile_id: string
  handle: string
  social_network: string
  content: string
  posted_at: string
}

export interface DetailTransfer {
  timestamp: string
  from: string
  to: string
  amount: string
  symbol: string
  transactionHash: string
  direction: "income" | "outcome"
  counterpartyAddress: string
}
