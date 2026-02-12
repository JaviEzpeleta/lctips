import AuroraBackground from "@/components/landing/AuroraBackground"
import ClickSpark from "@/components/ClickSpark"
import HeroSection from "@/components/landing/HeroSection"
import TokenShowcase from "@/components/landing/TokenShowcase"
import FeaturesSection from "@/components/landing/FeaturesSection"
import LinksSection from "@/components/landing/LinksSection"
import DarkVeil from "@/components/DarkVeil"

export const generateMetadata = async () => {
  const ogImage = `https://lctips.xyz/thumbnail.png`

  const images = [ogImage]

  const appName = "LCTips.xyz"
  const theTitle = `LCTips`
  const theDescription = "Visualize tips on Lens Chain. Discover new profiles through tipping!"

  return {
    title: theTitle,
    description: theDescription,
    applicationName: appName,
    referrer: "origin-when-cross-origin",
    keywords: ["lens", "lens protocol", "lens chain", "tips", "visualize", "discover", "profiles"],
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
    <div className="w-full overflow-hidden">
      <AuroraBackground />
      <div className="z-0 absolute top-0 left-0 w-[100vw] h-full pointer-events-none opacity-30">
        <DarkVeil
          hueShift={58}
          noiseIntensity={0}
          scanlineIntensity={0}
          speed={1}
          scanlineFrequency={0}
          warpAmount={0}
        />
      </div>
      <div className="z-10 absolute top-0 left-0 w-full h-full pointer-events-none">
        <ClickSpark
          sparkColor="#ffffff"
          sparkSize={10}
          sparkRadius={15}
          sparkCount={8}
          duration={400}
          easing="ease-out"
          extraScale={1}
        />
      </div>
      <div className="relative z-[1]">
        <HeroSection />
        <TokenShowcase />
        <FeaturesSection />
        <LinksSection />
      </div>
    </div>
  )
}

export default Home
