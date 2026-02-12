const ENDPOINT = "https://api.lens.xyz/graphql"

import {
  MAX_PUBLICATIONS_WHEN_PARSING_PROFILE,
  PROFILE_PAGES_TO_PARSE,
} from "./constants"
import { profileByAddress } from "./graphql/profileByAddress"
import {
  StandardPublication,
  SavedUser,
} from "./types"

const cleanHandle = (handle: string) => {
  const cleaned = handle.startsWith("lens/")
    ? handle.replace("lens/", "")
    : handle
  return cleaned.toLowerCase().trim()
}

// Define the type for publication items
export type Publication = {
  id: string
  createdAt: string
  stats: {
    reactions: number
    comments: number
  }
  metadata: {
    id: string
    content: string
    asset?: {
      image: {
        optimized: {
          uri: string
        }
      }
    }
  }
}

export const getLensPosts = async () => {
  const graphqlQuery = {
    query: `
      query {
        posts(request: { pageSize: TEN }) {
          items {
            id
            author {
              username {
                value
              }
            }
            metadata {
              ... on TextOnlyMetadata {
                content
              }
            }
          }
          pageInfo {
            prev
            next
          }
        }
      }
    `,
  }

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(graphqlQuery),
  })

  const data = await response.json()

  return data
}

export const getMultiplePublicationsByProfileId = async (
  handle: string,
  pages = PROFILE_PAGES_TO_PARSE
) => {
  const getPaginatedPosts = async (cursor?: string) => {
    const cleanedHandle = cleanHandle(handle)

    const graphqlQuery = {
      query: `
        query PublicationsByHandle {
          publications(request: {
            where: {
              from: "${cleanedHandle}",
              publicationTypes: [POST, QUOTE, MIRROR]
            },
            ${cursor ? `cursor: "${cursor}"` : ""}
          }) {
            items {
              ... on Post {
                id
                createdAt
                stats {
                  reactions
                  comments
                }
                metadata {
                  ... on ImageMetadataV3 {
                    id
                    content
                    asset {
                      image {
                        optimized {
                          uri
                        }
                      }
                    }
                  }
                  ... on TextOnlyMetadataV3 {
                    id
                    content
                  }
                }
              }
            }
            pageInfo {
              next
            }
          }
        }
      `,
      variables: {},
    }

    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(graphqlQuery),
    })

    return response.json()
  }

  try {
    let allItems: Publication[] = []
    let cursor

    for (let i = 0; i < pages; i++) {
      const data = await getPaginatedPosts(cursor)

      const items = data.data.publications.items
      cursor = data.data.publications.pageInfo.next

      allItems = [...allItems, ...items]


      if (!cursor) {
        break
      }
    }


    const filteredItems = allItems.filter((item) => {
      if (item.id && item.metadata.content) return item.id
      else {
        return false
      }
    })


    // order by createdAt DESC:
    const sortedItems = filteredItems.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })


    const maxxedItems = sortedItems.slice(
      0,
      MAX_PUBLICATIONS_WHEN_PARSING_PROFILE
    )


    return maxxedItems
  } catch (e) {
    console.error("Error fetching multiple publications:", e)
    return []
  }
}

export const getLensProfileByHandle = async (handle: string) => {
  const query = `
query GetProfileByHandle {
  account(request: { username: { localName: "${handle}" } }) {
    score
    address
    createdAt 
    owner
    metadata {
      id
      name
      picture 
      bio
      coverPicture
      attributes {
        key
        type
        value
      }
    }
  }
}
`
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  })

  const data = await response.json()
  return { ...data.data.account, handle }
}

export const getLensProfileByAddress = async (address: string) => {

  const query = `
query GetProfileByAddress {
  account(request: { address: "${address}" } ) {
    score
    address
    createdAt 
    owner
    username {
      localName
    }
    metadata {
      id
      name
      picture 
      bio
      coverPicture
      attributes {
        key
        type
        value
      }
    }
  }
}
`
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  })

  const data = await response.json()
  if (data && data.data && data.data.account)
    return { ...data.data.account, address }
  else return false
}

export const getLensAddressByOwnerAddress = async (address: string) => {

  const query = `
query GetProfileByAddress {
   accountsBulk(request: { ownedBy: ["${address}"] }) {
    address
    username {
      value
    }
    metadata {
      name
      picture
    }
  }
}
`
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  })

  const data = await response.json()
  return data.data.accountsBulk[0]?.address
}

export const fetchLensProfileByAddress = async (address: string) => {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: profileByAddress, variables: { address } }),
  })
  const data = await response.json()
  const handle = data.data.profiles.items[0].handle.fullHandle
  return await getLensProfileByHandle(handle)
}

export const divideArrayIntoChunks = (array: any[], chunkSize: number) => {
  const chunks = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}

export const convertFetchedPublicationsToMinimalObjects = (
  publications: Publication[],
  profile: SavedUser,
  handle: string
) => {
  return publications.map((publication) => {
    return {
      id: publication.id,
      profile_id: profile.id,
      handle,
      social_network: "lens",
      content: publication.metadata.content,
      posted_at: publication.createdAt,
    }
  }) as StandardPublication[]
}

export const fetchAndSaveLensPublications = async ({
  handle,
  profile,
}: {
  handle: string
  profile: SavedUser
}): Promise<StandardPublication[] | false> => {
  handle = handle.startsWith("lens/")
    ? handle.toLowerCase()
    : `lens/${handle.toLowerCase()}`

  const fetchedPublications = await getMultiplePublicationsByProfileId(
    profile.id
  )

  if (!fetchedPublications) {
    return false
  }


  const minimalPublicationObjects = convertFetchedPublicationsToMinimalObjects(
    fetchedPublications,
    profile,
    handle
  ) as StandardPublication[]

  if (!minimalPublicationObjects || minimalPublicationObjects.length === 0) {
    return false
  }

  return minimalPublicationObjects
}

export const getLensV3PostsByAddress = async (lensProfile: {
  address: string
  handle: string
}) => {
  const theQuery = `
query PublicationsByHandle {
  posts(request: {
    filter:  {
       authors: ["${lensProfile.address.trim()}"]
    },
  }) {
    items {
      ... on Post {
        id
        timestamp
        isDeleted
        metadata {
          ... on AudioMetadata {
            content
            audio {
              item
              cover
              duration
              artist
              attributes {
                type
                value
              }
            }
          }
          ... on ArticleMetadata {
            content
          }
          ... on ImageMetadata {
            content
          }
          ... on LinkMetadata {
            content
          }
          ... on LivestreamMetadata {
            content
          }
          ... on MintMetadata {
            content
          }
          ... on SpaceMetadata {
            content
          }
          ... on StoryMetadata {
            content
          }
          ... on TextOnlyMetadata {
            content
          }
          ... on ThreeDMetadata {
            content
          }
          ... on TransactionMetadata {
            content
          }
          ... on VideoMetadata {
            content
          }
        }
        commentOn {
          id
        }
      }
    }
  }
}
`

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: theQuery }),
    })

    const data = await response.json()

    // Check for GraphQL errors
    if (data.errors) {
      console.error('GraphQL errors in getLensV3PostsByAddress:', data.errors)
      return []
    }

    // Check if data exists
    if (!data.data) {
      console.error('No data returned from GraphQL for address:', lensProfile.address)
      return []
    }

    // Check if posts field exists
    if (!data.data.posts) {
      console.error('No posts field in response for address:', lensProfile.address)
      return []
    }

    // Check if items array exists
    if (!data.data.posts.items) {
      console.error('No items array in posts for address:', lensProfile.address)
      return []
    }

    const postToReturn = data.data.posts.items.map((item: any) => {
      // id TEXT PRIMARY KEY,
      // social_network TEXT NOT NULL,
      // profile_id TEXT NOT NULL,
      // handle TEXT NOT NULL,
      // content TEXT NOT NULL,
      // posted_at TIMESTAMP WITH TIME ZONE,
      // created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

      if (!item.metadata) {
        return false
      }

      if (!item.metadata.content) {
        return false
      }

      return {
        id: item.id,
        social_network: "lens",
        profile_id: lensProfile.address,
        handle: lensProfile.handle,
        content: item.metadata.content,
        posted_at: item.timestamp,
        is_deleted: item.isDeleted,
        comment_on: item.commentOn?.id,
      }
    })

    const filteredPosts = postToReturn.filter(
      (post: any) => post !== false && !post.is_deleted && !post.comment_on
    )
    return filteredPosts
  } catch (e) {
    console.error("Error fetching posts:", e)
    return []
  }
}



