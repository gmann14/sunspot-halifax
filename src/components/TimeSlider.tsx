'use client'

import { useMemo } from 'react'
import { getSunTimes, formatTimeAT } from '@/lib/suncalc-helpers'
import { FORECAST_SLOT_MINUTES } from '@/lib/constants'

interface TimeSliderProps {
  value: Date
  onChange: (time: Date) => void
  onNowClick: () => void
  isNow: boolean
}

export default function TimeSlider({
  value,
  onChange,
  onNowClick,
  isNow,
}: TimeSliderProps) {
  const { sunrise, sunset, goldenHour, slots, totalSlots } = useMemo(() => {
    const today = new Date()
    const times = getSunTimes(today)

    const start = new Date(times.sunrise)
    start.setMinutes(
      Math.ceil(start.getMinutes() / FORECAST_SLOT_MINUTES) * FORECAST_SLOT_MINUTES,
      0,
      0
    )

    const end = new Date(times.sunset)
    end.setMinutes(
      Math.floor(end.getMinutes() / FORECAST_SLOT_MINUTES) * FORECAST_SLOT_MINUTES,
      0,
      0
    )

    const count = Math.floor(
      (end.getTime() - start.getTime()) / (FORECAST_SLOT_MINUTES * 60 * 1000)
    )

    const slotsArr: Date[] = []
    for (let i = 0; i <= count; i++) {
      slotsArr.push(new Date(start.getTime() + i * FORECAST_SLOT_MINUTES * 60 * 1000))
    }

    return {
      sunrise: times.sunrise,
      sunset: times.sunset,
      goldenHour: times.goldenHour,
      slots: slotsArr,
      totalSlots: count,
    }
  }, [])

  const currentIndex = useMemo(() => {
    if (slots.length === 0) return 0
    const closest = slots.reduce((prev, curr, idx) => {
      const prevDiff = Math.abs(slots[prev].getTime() - value.getTime())
      const currDiff = Math.abs(curr.getTime() - value.getTime())
      return currDiff < prevDiff ? idx : prev
    }, 0)
    return closest
  }, [value, slots])

  // Golden hour position as percentage
  const goldenHourPct = useMemo(() => {
    if (slots.length < 2) return 100
    const start = slots[0].getTime()
    const end = slots[slots.length - 1].getTime()
    const range = end - start
    if (range === 0) return 100
    return Math.max(0, Math.min(100, ((goldenHour.getTime() - start) / range) * 100))
  }, [goldenHour, slots])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const idx = parseInt(e.target.value, 10)
    if (slots[idx]) {
      onChange(slots[idx])
    }
  }

  if (slots.length === 0) return null

  return (
    <div className="px-4 py-3 bg-white border-t border-b border-gray-100">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium text-gray-900">
          {formatTimeAT(value)}
        </span>
        {!isNow && (
          <button
            onClick={onNowClick}
            className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium hover:bg-amber-200 transition-colors"
          >
            Right now
          </button>
        )}
        {isNow && (
          <span className="text-xs text-gray-400">Now</span>
        )}
      </div>
      <div className="relative">
        <input
          type="range"
          min={0}
          max={totalSlots}
          value={currentIndex}
          onChange={handleChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
          aria-label="Time of day"
          aria-valuetext={formatTimeAT(value)}
        />
        {/* Golden hour marker */}
        <div
          className="absolute top-0 w-px h-2 bg-orange-400 pointer-events-none"
          style={{ left: `${goldenHourPct}%` }}
          title="Golden hour"
        >
          <span className="absolute -top-4 -translate-x-1/2 text-[10px] text-orange-500">
            ✦
          </span>
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
        <span>{formatTimeAT(sunrise)}</span>
        <span>{formatTimeAT(sunset)}</span>
      </div>
    </div>
  )
}
