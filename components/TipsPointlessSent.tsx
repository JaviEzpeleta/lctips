import BlurryEntranceSuperFast from "./BlurryEntranceSuperFast"
import TipFromUserRow from "./TipFromUserRow"

const TipsPointlessSent = ({ transfers }: { transfers: any }) => {
  return (
    <div>
      <BlurryEntranceSuperFast>
        <div className="text-3xl font-bold flex items-center gap-2">
          Top pointless Tipped{" "}
          <img
            src="/img/pointless-logo.webp"
            className="w-7 h-7 rounded-full"
            alt="POINTLESS"
          />
        </div>
      </BlurryEntranceSuperFast>

      <div className="flex flex-col gap-2 pt-4">
        {transfers.length > 0 ? (
          transfers.map((transfer: any, index: any) => (
            <TipFromUserRow
              key={transfer.from}
              index={index}
              transfer={transfer}
              tokenSymbol="POINTLESS"
            />
          ))
        ) : (
          <div className="text-center text-zinc-500 py-4">
            No POINTLESS tips sent yet.
          </div>
        )}
      </div>
    </div>
  )
}

export default TipsPointlessSent
