"use client"

import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts"
import { format } from "date-fns"
import { formatGHOAmount } from "@/lib/utils"

interface RewardData {
  value: string
  to: string
  timestamp: string
  transactionHash: string
  batchId: number
  batchTotal: string
  percentageOfBatch: number
  batchDate: string
}

interface ChartDataPoint {
  date: string
  amount: number
  percentage: number
  timestamp: string
  hash: string
  batchId: number
  percentageOfBatch: number
  batchTotal: number
}

interface TransactionChartProps {
  transactions: RewardData[]
  isSmall?: boolean
  className?: string
  showDualLines?: boolean
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ChartDataPoint
    return (
      <div className="bg-zinc-900/10 backdrop-blur-xs p-3 rounded-lg shadow-xl border border-zinc-700">
        <p className="text-xs text-white/90 mb-2">
          {format(new Date(data.timestamp), "MMM d")}
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border border-emerald-600 bg-emerald-500"></div>
            <p className="text-sm font-medium text-white flex items-center gap-1">
              <img
                src="/gho-icon.png"
                className="inline-block w-3.5 h-3.5 rounded-full"
              />
              <span>{formatGHOAmount(data.amount)} GHO</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border border-blue-700 bg-blue-600"></div>
            <p className="text-xs text-blue-600 font-medium">
              {data.percentage.toFixed(2)}% of{" "}
              {formatGHOAmount(data.batchTotal / 10 ** 18)}
            </p>
          </div>
        </div>
        {/* <div className="mt-3 pt-3 border-t border-zinc-700">
          <p className="text-xs text-zinc-500">Batch #{data.batchId}</p>
          <p className="text-xs text-zinc-500">
            Total: {formatGHOAmount(data.batchTotal / 10 ** 18)} GHO
          </p>
        </div> */}
      </div>
    )
  }
  return null
}

export default function TransactionChart({
  transactions,
  isSmall = false,
  className = "",
  showDualLines = false,
}: TransactionChartProps) {
  // Sort transactions by timestamp and convert to chart data
  const chartData: ChartDataPoint[] = transactions
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    .map((tx) => ({
      date: format(new Date(tx.timestamp), "MMM d"),
      amount: Number(tx.value) / 10 ** 18,
      percentage: tx.percentageOfBatch,
      timestamp: tx.timestamp,
      hash: tx.transactionHash,
      batchId: tx.batchId,
      percentageOfBatch: tx.percentageOfBatch,
      batchTotal: Number(tx.batchTotal),
    }))

  // Determine chart color based on trend (comparing last two values)
  const chartColor = (() => {
    if (chartData.length < 2) {
      return "#10B981" // Green as default
    }
    const lastValue = chartData[chartData.length - 1].amount
    const previousValue = chartData[chartData.length - 2].amount
    return lastValue >= previousValue ? "#10B981" : "#EF4444" // Green if up/equal, red if down
  })()

  const height = isSmall ? 40 : 200

  return (
    <div className={`w-full ${className} cursor-pointer`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={
            isSmall
              ? { top: 5, right: 5, left: 5, bottom: 5 }
              : { top: 20, right: 50, left: 20, bottom: 20 }
          }
        >
          {!isSmall && <Tooltip content={<CustomTooltip />} />}
          {!isSmall && (
            <>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#6B7280" }}
              />
              <YAxis
                yAxisId="amount"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#10B981" }}
                tickFormatter={(value) => `${value.toFixed(0)}`}
                width={38}
              />
              {showDualLines && (
                <YAxis
                  yAxisId="percentage"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#3B82F6" }}
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                  width={45}
                />
              )}
              {showDualLines && (
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{
                    paddingBottom: "10px",
                  }}
                />
              )}
            </>
          )}
          <Line
            yAxisId="amount"
            type="monotone"
            dataKey="amount"
            stroke={showDualLines ? "#10B981" : chartColor}
            strokeWidth={isSmall ? 2 : 3}
            name="GHO Amount"
            dot={
              isSmall
                ? {
                    stroke: showDualLines ? "#10B981" : chartColor,
                    strokeWidth: 0,
                    r: 0,
                  }
                : showDualLines
                ? { fill: "#10B981", strokeWidth: 2, stroke: "#FFFFFF", r: 3 }
                : {}
            }
            activeDot={
              isSmall
                ? false
                : {
                    r: 6,
                    stroke: showDualLines ? "#10B981" : chartColor,
                    strokeWidth: 2,
                    fill: "#FFFFFF",
                  }
            }
            animationDuration={800}
            animationEasing="ease-out"
          />
          {showDualLines && !isSmall && (
            <Line
              yAxisId="percentage"
              type="monotone"
              dataKey="percentage"
              stroke="#3B82F6"
              strokeWidth={3}
              strokeDasharray="5 5"
              name="% of Batch"
              dot={{ fill: "#3B82F6", strokeWidth: 2, stroke: "#FFFFFF", r: 3 }}
              activeDot={{
                r: 6,
                stroke: "#3B82F6",
                strokeWidth: 2,
                fill: "#FFFFFF",
              }}
              animationDuration={800}
              animationEasing="ease-out"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
