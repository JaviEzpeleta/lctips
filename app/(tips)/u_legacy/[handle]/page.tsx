import HandleClientPage from "@/components/HandleClientPage"
import { getLensProfileByHandle } from "@/lib/lens-api"

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ handle: string }>
}) => {
  const { handle } = await params

  const profile = await getLensProfileByHandle(handle)

  // console.table(profile)

  if (!profile || !profile.metadata?.name) {
    const appName = "LCTips.xyz"
    const theTitle = `@${handle} - Profile Not Found - LCTips`
    const theDescription = `Profile @${handle} not found on Lens Chain.`
    
    return {
      title: theTitle,
      description: theDescription,
      applicationName: appName,
    }
  }

  const appName = "LCTips.xyz"
  const theTitle = `${profile.metadata.name} (@${handle}) - LCTips`
  const theDescription = `@${handle}'s tips on Lens Chain, visualized.`

  const ogImage = `https://lctips.xyz/thumbnail.png`
  const images = [ogImage]

  return {
    title: theTitle,
    description: theDescription,
    applicationName: appName,
    referrer: "origin-when-cross-origin",
    keywords: ["lens", "lens protocol", "lens chain", "tips", "visualize"],
    authors: [{ name: "LCTips" }],
    creator: "LCTips",
    publisher: "LCTips",
    metadataBase: new URL("https://lctips.xyz"),
    openGraph: {
      images: images,
      title: theTitle,
      description: theDescription,
      url: `https://lctips.xyz/u_legacy/${handle}`,
      siteName: appName,
      locale: "en_US",
      type: "website",
    },
  }
}

const HandlePage = async ({
  params,
}: {
  params: Promise<{ handle: string }>
}) => {
  const { handle } = await params

  return <HandleClientPage handle={handle} />
}

export default HandlePage
