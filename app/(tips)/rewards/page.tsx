import RewardsPage from "@/components/RewardsPage"

export const generateMetadata = async () => {
  const appName = "LCTips.xyz"
  const theTitle = `LCTips - Rewards`
  const theDescription = `Rewards on Lens Chain, visualized.`

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
      url: `https://lctips.xyz/rewards`,
      siteName: appName,
      locale: "en_US",
      type: "website",
    },
  }
}

const LensRewardsPage = async () => {
  return <RewardsPage />
}

export default LensRewardsPage
