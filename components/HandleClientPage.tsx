"use client"

import { DotLoader } from "@/components/ui/dot-loader"
import SearchDialog from "@/components/SearchDialog"
import ProfileNotFound from "@/components/ProfileNotFound"

import { useEffect, useRef, useState } from "react"
import Title from "./Title"
import TipsReceived from "./TipsReceived"
import TipsSent from "./TipsSent"
import TipsBonsaiReceived from "./TipsBonsaiReceived"
import TipsBonsaiSent from "./TipsBonsaiSent"
import TipsPointlessReceived from "./TipsPointlessReceived"
import TipsPointlessSent from "./TipsPointlessSent"
import DefaultLoadingMini from "./DefaultLoadingMini"
import { GroupedTotal } from "@/app/api/profile/route"
import TipFromUserRow from "./TipFromUserRow"
import { ethers } from "ethers"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import axios from "axios"
import NumberFlow from "@number-flow/react"
import Link from "next/link"
import { motion } from "framer-motion"
import toast from "react-hot-toast"
import { Typewriter } from "./ui/typewriter-text"
import BlurryEntrance from "./BlurryEntrance"
import TheShader2 from "@/components/TheShader2"
import { formatLargeNumber } from "@/lib/utils"
import ProfileHeader from "./ProfileHeader"

const game = [
  [14, 7, 0, 8, 6, 13, 20],
  [14, 7, 13, 20, 16, 27, 21],
  [14, 20, 27, 21, 34, 24, 28],
  [27, 21, 34, 28, 41, 32, 35],
  [34, 28, 41, 35, 48, 40, 42],
  [34, 28, 41, 35, 48, 42, 46],
  [34, 28, 41, 35, 48, 42, 38],
  [34, 28, 41, 35, 48, 30, 21],
  [34, 28, 41, 48, 21, 22, 14],
  [34, 28, 41, 21, 14, 16, 27],
  [34, 28, 21, 14, 10, 20, 27],
  [28, 21, 14, 4, 13, 20, 27],
  [28, 21, 14, 12, 6, 13, 20],
  [28, 21, 14, 6, 13, 20, 11],
  [28, 21, 14, 6, 13, 20, 10],
  [14, 6, 13, 20, 9, 7, 21],
]

const HandleClientPage = ({ handle }: { handle: string }) => {
  const [isHovering, setIsHovering] = useState(false)
  const [profileData, setProfileData] = useState<any>(null)
  const [totalIncomeAmount, setTotalIncomeAmount] = useState(0)
  const [totalOutcomeAmount, setTotalOutcomeAmount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [profileNotFound, setProfileNotFound] = useState(false)
  const [allGoodIncomeTransfers, setAllGoodIncomeTransfers] = useState<
    GroupedTotal[]
  >([])
  const [allGoodOutcomeTransfers, setAllGoodOutcomeTransfers] = useState<
    GroupedTotal[]
  >([])
  const [
    allUnidentifiableIncomeTransfers,
    setAllUnidentifiableIncomeTransfers,
  ] = useState<GroupedTotal[]>([])

  const [
    allUnidentifiableOutcomeTransfers,
    setAllUnidentifiableOutcomeTransfers,
  ] = useState<GroupedTotal[]>([])

  // BONSAI state
  const [allGoodBonsaiIncomeTransfers, setAllGoodBonsaiIncomeTransfers] =
    useState<GroupedTotal[]>([])
  const [allGoodBonsaiOutcomeTransfers, setAllGoodBonsaiOutcomeTransfers] =
    useState<GroupedTotal[]>([])
  const [totalBonsaiIncomeAmount, setTotalBonsaiIncomeAmount] = useState(0)
  const [totalBonsaiOutcomeAmount, setTotalBonsaiOutcomeAmount] = useState(0)

  // Pointless state
  const [allGoodPointlessIncomeTransfers, setAllGoodPointlessIncomeTransfers] =
    useState<GroupedTotal[]>([])
  const [
    allGoodPointlessOutcomeTransfers,
    setAllGoodPointlessOutcomeTransfers,
  ] = useState<GroupedTotal[]>([])
  const [totalPointlessIncomeAmount, setTotalPointlessIncomeAmount] =
    useState(0)
  const [totalPointlessOutcomeAmount, setTotalPointlessOutcomeAmount] =
    useState(0)

  const loadedRef = useRef(false)
  const totalIncomeRef = useRef(0)
  const totalBonsaiIncomeRef = useRef(0)
  const totalPointlessIncomeRef = useRef(0)

  const [basicProfileData, setBasicProfileData] = useState<any>(null)

  const basicProfileDataRef = useRef(false)
  useEffect(() => {
    const fetchBasicProfileData = async () => {
      const data = await fetch(`/api/basic-profile`, {
        method: "POST",
        body: JSON.stringify({ handle }),
      })
      const resObject = await data.json()
      setBasicProfileData(resObject.profile)
    }
    if (handle) {
      if (!basicProfileDataRef.current) {
        basicProfileDataRef.current = true
        fetchBasicProfileData()
      }
    }
  }, [handle])

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    const fetchProfileData = async () => {
      const data = await fetch(`/api/profile`, {
        method: "POST",
        body: JSON.stringify({ handle }),
      })
      const resObject = await data.json()

      setIsLoading(false)

      // Check if profile was not found
      if (resObject.error === "Profile not found" || !resObject.profile) {
        setProfileNotFound(true)
        return
      }

      setProfileData(resObject.profile)

      setAllGoodIncomeTransfers([])
      setAllUnidentifiableIncomeTransfers([])
      setTotalIncomeAmount(0)
      totalIncomeRef.current = 0

      resObject.groupedIncomeTransfers.forEach((transfer: any) => {
        axios
          .post("/api/profile-data-by-address", {
            address: transfer.from,
          })
          .then((response) => {
            const profileData = response.data.profile
            if (
              !profileData ||
              !profileData.username ||
              !profileData.metadata
            ) {
              setAllUnidentifiableIncomeTransfers((prev) => [...prev, transfer])
            } else {
              setAllGoodIncomeTransfers((prev) => [
                ...prev,
                {
                  ...transfer,
                  profileData,
                },
              ])

              totalIncomeRef.current += Number(transfer.totals)
              setTotalIncomeAmount(Number(totalIncomeRef.current.toFixed(2)))
            }
          })
          .catch((error) => {
            console.error(
              `Error fetching profile data for address ${transfer.from}:`,
              error
            )
            setAllUnidentifiableIncomeTransfers((prev) => [...prev, transfer])
          })
      })

      // Process all transfer types in parallel
      const processGhoOutcome = async () => {
        let theTotalOutcomeAmount = 0
        for (const transfer of resObject.groupedOutcomeTransfers) {
          const response = await axios.post("/api/profile-data-by-address", {
            address: transfer.from,
          })
          const profileData = response.data.profile
          if (!profileData || !profileData.username || !profileData.metadata) {
            setAllUnidentifiableOutcomeTransfers((prev) => [...prev, transfer])
          } else {
            theTotalOutcomeAmount += Number(transfer.totals)
            setTotalOutcomeAmount(Number(theTotalOutcomeAmount.toFixed(2)))

            setAllGoodOutcomeTransfers((prev) => [
              ...prev,
              {
                ...transfer,
                profileData,
              },
            ])
          }
        }
      }

      const processBonsaiIncome = async () => {
        setAllGoodBonsaiIncomeTransfers([])
        setTotalBonsaiIncomeAmount(0)
        totalBonsaiIncomeRef.current = 0

        if (resObject.groupedBonsaiIncomeTransfers) {
          // Use Promise.all for parallel processing
          const promises = resObject.groupedBonsaiIncomeTransfers.map(
            async (transfer: any) => {
              try {
                const response = await axios.post(
                  "/api/profile-data-by-address",
                  {
                    address: transfer.from,
                  }
                )
                const profileData = response.data.profile
                if (
                  profileData &&
                  profileData.username &&
                  profileData.metadata &&
                  (!basicProfileData?.username ||
                    profileData.username.localName !==
                      basicProfileData.username.localName)
                ) {
                  setAllGoodBonsaiIncomeTransfers((prev) => [
                    ...prev,
                    {
                      ...transfer,
                      profileData,
                    },
                  ])

                  totalBonsaiIncomeRef.current += Number(transfer.totals)
                  setTotalBonsaiIncomeAmount(
                    Number(totalBonsaiIncomeRef.current.toFixed(2))
                  )
                }
              } catch (error) {
                console.error(
                  `Error fetching profile data for BONSAI address ${transfer.from}:`,
                  error
                )
              }
            }
          )
          await Promise.all(promises)
        }
      }

      const processBonsaiOutcome = async () => {
        let theTotalBonsaiOutcomeAmount = 0

        if (resObject.groupedBonsaiOutcomeTransfers) {
          for (const transfer of resObject.groupedBonsaiOutcomeTransfers) {
            const response = await axios.post("/api/profile-data-by-address", {
              address: transfer.from,
            })
            const profileData = response.data.profile
            if (
              profileData &&
              profileData.username &&
              profileData.metadata &&
              (!basicProfileData?.username ||
                profileData.username.localName !==
                  basicProfileData.username.localName)
            ) {
              theTotalBonsaiOutcomeAmount += Number(transfer.totals)
              setTotalBonsaiOutcomeAmount(
                Number(theTotalBonsaiOutcomeAmount.toFixed(2))
              )

              setAllGoodBonsaiOutcomeTransfers((prev) => [
                ...prev,
                {
                  ...transfer,
                  profileData,
                },
              ])
            }
          }
        }
      }

      const processPointlessIncome = async () => {
        setAllGoodPointlessIncomeTransfers([])
        setTotalPointlessIncomeAmount(0)
        totalPointlessIncomeRef.current = 0

        if (resObject.groupedPointlessIncomeTransfers) {
          // Use Promise.all for parallel processing
          const promises = resObject.groupedPointlessIncomeTransfers.map(
            async (transfer: any) => {
              try {
                const response = await axios.post(
                  "/api/profile-data-by-address",
                  {
                    address: transfer.from,
                  }
                )
                const profileData = response.data.profile
                if (
                  profileData &&
                  profileData.username &&
                  profileData.metadata &&
                  (!basicProfileData?.username ||
                    profileData.username.localName !==
                      basicProfileData.username.localName)
                ) {
                  setAllGoodPointlessIncomeTransfers((prev) => [
                    ...prev,
                    {
                      ...transfer,
                      profileData,
                    },
                  ])

                  totalPointlessIncomeRef.current += Number(transfer.totals)
                  setTotalPointlessIncomeAmount(
                    Number(totalPointlessIncomeRef.current.toFixed(2))
                  )
                }
              } catch (error) {
                console.error(
                  `Error fetching profile data for pointless address ${transfer.from}:`,
                  error
                )
              }
            }
          )
          await Promise.all(promises)
        }
      }

      const processPointlessOutcome = async () => {
        let theTotalPointlessOutcomeAmount = 0

        if (resObject.groupedPointlessOutcomeTransfers) {
          for (const transfer of resObject.groupedPointlessOutcomeTransfers) {
            const response = await axios.post("/api/profile-data-by-address", {
              address: transfer.from,
            })
            const profileData = response.data.profile
            if (
              profileData &&
              profileData.username &&
              profileData.metadata &&
              (!basicProfileData?.username ||
                profileData.username.localName !==
                  basicProfileData.username.localName)
            ) {
              theTotalPointlessOutcomeAmount += Number(transfer.totals)
              setTotalPointlessOutcomeAmount(
                Number(theTotalPointlessOutcomeAmount.toFixed(2))
              )

              setAllGoodPointlessOutcomeTransfers((prev) => [
                ...prev,
                {
                  ...transfer,
                  profileData,
                },
              ])
            }
          }
        }
      }

      // Run all processing in parallel
      await Promise.all([
        processGhoOutcome(),
        processBonsaiIncome(),
        processBonsaiOutcome(),
        processPointlessIncome(),
        processPointlessOutcome(),
      ])
    }
    if (handle) {
      fetchProfileData()
    }
  }, [handle])

  if (isLoading && !basicProfileData) {
    return (
      <div className="pb-24">
        <DefaultLoadingMini />
      </div>
    )
  }

  if (basicProfileData && isLoading) {
    return (
      <div className="pb-12 flex-1 flex flex-col justify-center items-center">
        <BlurryEntrance>
          <div className="flex items-center w-80 rounded-lg text-white justify-center">
            <div className="relative">
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="flex items-center flex-col w-80 gap-5 rounded-lg p-0 text-white">
                  <div className="">
                    <DotLoader
                      frames={game}
                      className="gap-0.5"
                      dotClassName="bg-white/15 [&.active]:bg-white size-1.5"
                    ></DotLoader>
                  </div>
                  <p className="font-medium">
                    <Typewriter
                      text={[
                        "Loading profile data...",
                        "Reading tips received...",
                        basicProfileData &&
                          basicProfileData.metadata &&
                          basicProfileData.metadata.name &&
                          "Wow " +
                            basicProfileData.metadata.name +
                            " is rich!?!",
                        "Should be ready very soon!",
                        "[available space for ads here]",
                        "just kidding",
                        "Thanks for waiting!",
                      ]}
                      speed={100}
                      loop={true}
                      className="text-sm font-medium"
                    />
                  </p>
                </div>
              </div>
              <TheShader2 />
            </div>
          </div>
        </BlurryEntrance>
      </div>
    )
  }

  // Show profile not found error
  if (profileNotFound) {
    return <ProfileNotFound handle={handle} />
  }

  return (
    <div className="p-2">
      <SearchDialog open={false} onOpenChange={() => {}} />
      {!profileData ? (
        <DefaultLoadingMini />
      ) : (
        <div>
          {profileData && profileData.metadata ? (
            <div className="">
              <ProfileHeader
                profileData={profileData}
                handle={handle}
                totalIncomeAmount={totalIncomeAmount}
                totalOutcomeAmount={totalOutcomeAmount}
                totalBonsaiIncomeAmount={totalBonsaiIncomeAmount}
                totalBonsaiOutcomeAmount={totalBonsaiOutcomeAmount}
                totalPointlessIncomeAmount={totalPointlessIncomeAmount}
                totalPointlessOutcomeAmount={totalPointlessOutcomeAmount}
                isHovering={isHovering}
                setIsHovering={setIsHovering}
              />
              <Tabs defaultValue="received" className="w-full dark">
                <TabsList className="w-full flex flex-row justify-start gap-2 overflow-x-auto scroll-smooth scrollbar-hide">
                  <TabsTrigger value="received" className="flex-none">
                    <div className="flex items-center gap-1">
                      <div className="tabular-nums tracking-tighter font-bold text-xs">
                        <NumberFlow
                          value={allGoodIncomeTransfers.length}
                          digits={{
                            // Record<number, { max?: number }>
                            6: { max: 6 },
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <img
                          src="/gho-icon.png"
                          className="w-3 h-3 rounded-full"
                          alt="GHO"
                        />{" "}
                        received
                      </div>
                    </div>
                  </TabsTrigger>
                  {allGoodOutcomeTransfers.length > 0 && (
                    <TabsTrigger value="sent" className="flex-none">
                      <div className="flex items-center gap-1 text-xs">
                        <div className="tabular-nums tracking-tighter font-bold">
                          <NumberFlow
                            value={allGoodOutcomeTransfers.length}
                            digits={{
                              6: { max: 6 },
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <img
                            src="/gho-icon.png"
                            className="w-3 h-3 rounded-full"
                            alt="GHO"
                          />{" "}
                          sent
                        </div>
                      </div>
                    </TabsTrigger>
                  )}

                  {allGoodPointlessIncomeTransfers.length > 0 && (
                    <TabsTrigger
                      value="pointless-received"
                      className="flex-none"
                    >
                      <div className="flex items-center gap-1 text-xs">
                        <div className="tabular-nums tracking-tighter font-bold">
                          <NumberFlow
                            value={allGoodPointlessIncomeTransfers.length}
                            digits={{
                              6: { max: 6 },
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <img
                            src="/img/pointless-logo.webp"
                            className="w-3 h-3 rounded-full"
                            alt="POINTLESS"
                          />{" "}
                          received
                        </div>
                      </div>
                    </TabsTrigger>
                  )}
                  {allGoodPointlessOutcomeTransfers.length > 0 && (
                    <TabsTrigger value="pointless-sent" className="flex-none">
                      <div className="flex items-center gap-1 text-xs">
                        <div className="tabular-nums tracking-tighter font-bold">
                          <NumberFlow
                            value={allGoodPointlessOutcomeTransfers.length}
                            digits={{
                              6: { max: 6 },
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          {" "}
                          <img
                            src="/img/pointless-logo.webp"
                            className="w-3 h-3 rounded-full"
                            alt="POINTLESS"
                          />
                          sent
                        </div>
                      </div>
                    </TabsTrigger>
                  )}

                  {allGoodBonsaiIncomeTransfers.length > 0 && (
                    <TabsTrigger value="bonsai-received" className="flex-none">
                      <div className="flex items-center gap-1 text-xs">
                        <div className="tabular-nums tracking-tighter font-bold">
                          <NumberFlow
                            value={allGoodBonsaiIncomeTransfers.length}
                            digits={{
                              6: { max: 6 },
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <img
                            src="/img/bonsai-logo.webp"
                            className="w-3 h-3"
                            alt="BONSAI"
                          />{" "}
                          received
                        </div>
                      </div>
                    </TabsTrigger>
                  )}
                  {allGoodBonsaiOutcomeTransfers.length > 0 && (
                    <TabsTrigger value="bonsai-sent" className="flex-none">
                      <div className="flex items-center gap-1 text-xs">
                        <div className="tabular-nums tracking-tighter font-bold">
                          <NumberFlow
                            value={allGoodBonsaiOutcomeTransfers.length}
                            digits={{
                              6: { max: 6 },
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <img
                            src="/img/bonsai-logo.webp"
                            className="w-3 h-3"
                            alt="BONSAI"
                          />{" "}
                          sent
                        </div>
                      </div>
                    </TabsTrigger>
                  )}
                </TabsList>
                <TabsContent value="received">
                  <TipsReceived transfers={allGoodIncomeTransfers} />
                </TabsContent>
                <TabsContent value="sent">
                  <TipsSent transfers={allGoodOutcomeTransfers} />
                </TabsContent>
                <TabsContent value="pointless-received">
                  <TipsPointlessReceived
                    transfers={allGoodPointlessIncomeTransfers}
                  />
                </TabsContent>
                <TabsContent value="pointless-sent">
                  <TipsPointlessSent
                    transfers={allGoodPointlessOutcomeTransfers}
                  />
                </TabsContent>
                <TabsContent value="bonsai-received">
                  <TipsBonsaiReceived
                    transfers={allGoodBonsaiIncomeTransfers}
                  />
                </TabsContent>
                <TabsContent value="bonsai-sent">
                  <TipsBonsaiSent transfers={allGoodBonsaiOutcomeTransfers} />
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <ProfileNotFound handle={handle} />
          )}
        </div>
      )}
    </div>
  )
}

export default HandleClientPage
