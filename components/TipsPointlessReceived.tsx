import BlurryEntranceSuperFast from "./BlurryEntranceSuperFast"
import TipFromUserRow from "./TipFromUserRow"

const TipsPointlessReceived = ({ transfers }: { transfers: any }) => {
  const orderedTransfers = transfers.sort(
    (a: any, b: any) => b.totals - a.totals
  )

  return (
    <div>
      <BlurryEntranceSuperFast>
        <div className="text-3xl font-bold flex items-center gap-2">
          Top pointless Tippers{" "}
          <img
            src="/img/pointless-logo.webp"
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full"
            alt="POINTLESS"
          />
        </div>
      </BlurryEntranceSuperFast>

      <div className="flex flex-col gap-2 pt-4">
        {orderedTransfers.length > 0 ? (
          orderedTransfers.map((transfer: any, index: any) => (
            <TipFromUserRow
              key={transfer.from}
              index={index}
              transfer={transfer}
              tokenSymbol="POINTLESS"
            />
          ))
        ) : (
          <div className="text-center text-zinc-500 py-4">
            No POINTLESS tips received yet.
          </div>
        )}
      </div>
    </div>
  )
}

export default TipsPointlessReceived
