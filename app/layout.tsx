import { Manrope } from "next/font/google"
import "./globals.css"
const manrope = Manrope({
  subsets: ["latin"], // Specify subsets if needed
  // Add other options like weight, display, etc.
  // weight: ['400', '700'],
  // display: 'swap',
})

// add geist mono font:
import { Geist_Mono } from "next/font/google"
const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-geist-mono",
})

import Footer from "@/components/Footer"
import NoiseLayer from "@/components/NoiseLayer"
import { Web3Provider } from "@/components/Web3Provider"
import { Toaster } from "react-hot-toast"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      {/* Apply the font class to the body or a parent element */}
      <body
        className={`${geistMono.variable} ${manrope.className} bg-zinc-900 text-zinc-100 relative min-h-[100dvh] flex flex-col`}
      >
        <Toaster
          toastOptions={{
            position: "bottom-right",
            className:
              "bg-black text-primary font-shantell shadow-md px-2 py-1 text-sm font-bold rounded-full",
            style: {
              backgroundColor: "black",
              color: "#47ec93",
              border: "1.5px solid #47ec93",
              borderRadius: "300px",
              maxWidth: 500,
            },
          }}
        />
        <NoiseLayer />
        <Web3Provider network="mainnet">
          <div className="p-0 sm:p-4 flex-1 flex flex-col pb-8">{children}</div>
          <Footer />
        </Web3Provider>
      </body>
    </html>
  )
}
