import SearchForUser from "@/components/search/SearchForUser"

export const generateMetadata = async () => {
  const ogImage = `https://lctips.xyz/thumbnail.png`

  const images = [ogImage]

  const appName = "LCTips.xyz"
  const theTitle = `LCTips`
  const theDescription = "Visualize tips on Lens Chain"

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
      url: `https://lctips.xyz`,
      siteName: appName,
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: theTitle,
      description: theDescription,
      images: [ogImage],
      creator: "LCTips",
    },
  }
}

const Home = async () => {
  return (
    <div className="max-w-3xl mx-auto w-full space-y-6">
      <div className="flex flex-col items-center justify-center space-y-2 w-full">
        <div className="font-extrabold tracking-tight text-3xl sm:text-5xl">
          LCTips
        </div>
        <div className="text-center text-zinc-300 text-sm sm:text-base max-w-md pt-6 space-y-3">
          <div>Discover who's tipping who on Lens Chain.</div>
          <div>
            Search for any Lens user by handle to see their tip history: both
            tips they've sent and received.
          </div>
        </div>
      </div>
      <div className="">
        <SearchForUser hideTitle={true} />
      </div>
    </div>
  )
}

export default Home
