const ScoreRenderer = ({ score }: { score: number }) => {
  const scoreFrom1To100 = Math.floor(score / 100)

  let color = "text-gray-400"
  let border = "border-gray-400/70"
  let background = "bg-gray-800/40"
  if (scoreFrom1To100 > 80) {
    color = "text-green-400/85"
    border = "border-green-600/70"
    background = "bg-green-800"
  } else if (scoreFrom1To100 < 20) {
    color = "text-red-300/85"
    border = "border-red-600/70"
    background = "bg-red-800"
  } else if (scoreFrom1To100 > 20 && scoreFrom1To100 < 80) {
    color = "text-cyan-400/85"
    border = "border-cyan-600/70"
    background = "bg-cyan-800"
  }
  return (
    <div
      className={`${color} ${background} rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-semibold`}
    >
      {scoreFrom1To100}
    </div>
  )
}

export default ScoreRenderer
