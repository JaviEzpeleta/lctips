"use client"

import { useState } from "react"
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
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react"

interface TipCalendarProps {
  currentMonth: Date
  setCurrentMonth: (date: Date) => void
  selectedDate: string | null
  setSelectedDate: (date: string | null) => void
  datesWithTips: Set<string>
  showPrevMonthByDefault?: boolean
}

const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

const formatDateKey = (d: Date) => format(d, "yyyy-MM-dd")

function getMonthDays(month: Date): Date[] {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const days: Date[] = []
  let day = calendarStart
  while (day <= calendarEnd) {
    days.push(day)
    day = addDays(day, 1)
  }
  return days
}

const MonthGrid = ({
  month,
  selectedDate,
  setSelectedDate,
  datesWithTips,
}: {
  month: Date
  selectedDate: string | null
  setSelectedDate: (date: string | null) => void
  datesWithTips: Set<string>
}) => {
  const days = getMonthDays(month)

  return (
    <>
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
          const isCurrentMonth = isSameMonth(d, month)
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
    </>
  )
}

const TipCalendar = ({
  currentMonth,
  setCurrentMonth,
  selectedDate,
  setSelectedDate,
  datesWithTips,
  showPrevMonthByDefault = true,
}: TipCalendarProps) => {
  const prevMonth = subMonths(currentMonth, 1)
  const [showPrevMonth, setShowPrevMonth] = useState(showPrevMonthByDefault)

  return (
    <div className="border-2 border-zinc-950 bg-black/30 rounded-xl p-3 mb-4">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-1 hover:bg-zinc-800 rounded-md transition-colors active:opacity-50"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-sm font-semibold">
          {showPrevMonth
            ? `${format(prevMonth, "MMM")} – ${format(currentMonth, "MMM yyyy")}`
            : format(currentMonth, "MMMM yyyy")}
        </div>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-1 hover:bg-zinc-800 rounded-md transition-colors active:opacity-50"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Previous month (collapsible) */}
      <AnimatePresence initial={false}>
        {showPrevMonth && (
          <motion.div
            key="prev-month"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="text-[10px] font-medium text-zinc-500 mb-1 px-0.5">
              {format(prevMonth, "MMMM yyyy")}
            </div>
            <MonthGrid
              month={prevMonth}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              datesWithTips={datesWithTips}
            />
            <div className="border-t border-zinc-800/60 my-2.5" />
            <div className="text-[10px] font-medium text-zinc-500 mb-1 px-0.5">
              {format(currentMonth, "MMMM yyyy")}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current month */}
      <MonthGrid
        month={currentMonth}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        datesWithTips={datesWithTips}
      />

      {/* Toggle for prev month (only when not forced-visible) */}
      {!showPrevMonthByDefault && (
        <button
          onClick={() => setShowPrevMonth((v) => !v)}
          className="mt-2 w-full flex items-center justify-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 py-1.5 rounded-md hover:bg-zinc-800/40 transition-colors"
        >
          <ChevronDown
            className={`w-3 h-3 transition-transform ${showPrevMonth ? "rotate-180" : ""}`}
          />
          {showPrevMonth ? `Hide ${format(prevMonth, "MMMM")}` : `Show ${format(prevMonth, "MMMM")}`}
        </button>
      )}

      {selectedDate && (
        <button
          onClick={() => setSelectedDate(null)}
          className="mt-2 w-full text-xs text-center py-1.5 rounded-md bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors text-zinc-300"
        >
          Show all tips
        </button>
      )}
    </div>
  )
}

export default TipCalendar
