import BlurryEntranceSuperFast from "./BlurryEntranceSuperFast"
import TipFromUserRow from "./TipFromUserRow"

const TipsSent = ({ transfers }: { transfers: any }) => {
  return (
    <div>
      <BlurryEntranceSuperFast>
        <div className="text-3xl font-bold">Top GHO Tipped</div>
      </BlurryEntranceSuperFast>

      <div className="flex flex-col gap-2 pt-4">
        {transfers.length > 0 ? (
          transfers
            .map((transfer: any, index: any) => (
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

export default TipsSent
