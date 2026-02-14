"use client"

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface TipCalendarProps {
  currentMonth: Date
  setCurrentMonth: (date: Date) => void
  selectedDate: string | null
  setSelectedDate: (date: string | null) => void
  datesWithTips: Set<string>
}

const TipCalendar = ({
  currentMonth,
  setCurrentMonth,
  selectedDate,
  setSelectedDate,
  datesWithTips,
}: TipCalendarProps) => {
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)

  const days: Date[] = []
  let day = calendarStart
  while (day <= calendarEnd) {
    days.push(day)
    day = addDays(day, 1)
  }

  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

  const formatDateKey = (d: Date) => format(d, "yyyy-MM-dd")

  return (
    <div className="border-2 border-zinc-950 bg-black/30 rounded-xl p-3 mb-4">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-1 hover:bg-zinc-800 rounded-md transition-colors active:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-sm font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </div>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-1 hover:bg-zinc-800 rounded-md transition-colors active:opacity-50"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {weekDays.map((wd) => (
          <div
            key={wd}
            className="text-center text-[10px] font-medium opacity-40 py-1"
          >
            {wd}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d, i) => {
          const dateKey = formatDateKey(d)
          const isCurrentMonth = isSameMonth(d, currentMonth)
          const hasTips = datesWithTips.has(dateKey)
          const isSelected = selectedDate === dateKey
          const isToday = isSameDay(d, new Date())

          return (
            <button
              key={i}
              onClick={() => {
                if (hasTips) {
                  setSelectedDate(isSelected ? null : dateKey)
                }
              }}
              disabled={!hasTips}
              className={`
                relative flex flex-col items-center justify-center py-1.5 rounded-md text-xs transition-all
                ${!isCurrentMonth ? "opacity-20" : ""}
                ${isSelected ? "bg-indigo-500/30 text-white font-bold" : ""}
                ${hasTips && !isSelected ? "hover:bg-zinc-800 cursor-pointer" : ""}
                ${!hasTips ? "cursor-default opacity-40" : ""}
                ${isToday && !isSelected ? "ring-1 ring-zinc-600" : ""}
              `}
            >
              <span>{format(d, "d")}</span>
              {hasTips && (
                <span className="tip-calendar-dot" />
              )}
            </button>
          )
        })}
      </div>

      {selectedDate && (
        <button
          onClick={() => setSelectedDate(null)}
          className="mt-3 w-full text-xs text-center py-1.5 rounded-md bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors text-zinc-300"
        >
          Show all tips
        </button>
      )}
    </div>
  )
}

export default TipCalendar
