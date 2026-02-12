import BlurryEntranceSuperFast from "./BlurryEntranceSuperFast"
import TipFromUserRow from "./TipFromUserRow"

const TipsReceived = ({ transfers }: { transfers: any }) => {
  const orderedTransfers = transfers.sort(
    (a: any, b: any) => b.totals - a.totals
  )

  return (
    <div>
      <BlurryEntranceSuperFast>
        <div className="text-3xl font-bold">Top GHO Tippers</div>
      </BlurryEntranceSuperFast>

      <div className="flex flex-col gap-2 pt-4">
        {orderedTransfers.length > 0 ? (
          orderedTransfers.map((transfer: any, index: any) => (
            <TipFromUserRow
              key={transfer.from}
              index={index}
              transfer={transfer}
            />
          ))
        ) : (
          <div className="text-center text-zinc-500 py-4">
            No tips received yet.
          </div>
        )}
      </div>
    </div>
  )
}

export default TipsReceived
