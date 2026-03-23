'use client'

import type { VenueSunForecast } from '@/types'
import { formatTimeAT, getSunTimes } from '@/lib/suncalc-helpers'

interface ForecastBarProps {
  forecasts: VenueSunForecast[]
  compact?: boolean
}

export default function ForecastBar({ forecasts, compact = false }: ForecastBarProps) {
  if (forecasts.length === 0) return null

  const sorted = [...forecasts].sort(
    (a, b) => new Date(a.slot_starts_at).getTime() - new Date(b.slot_starts_at).getTime()
  )

  const { sunrise, sunset } = getSunTimes()
  const dayStart = sunrise.getTime()
  const dayEnd = sunset.getTime()
  const dayRange = dayEnd - dayStart

  if (dayRange <= 0) return null

  return (
    <div>
      <div
        className={`flex rounded overflow-hidden ${compact ? 'h-1.5' : 'h-3'}`}
        role="img"
        aria-label="Sun forecast timeline for today"
      >
        {sorted.map((f) => {
          const slotTime = new Date(f.slot_starts_at).getTime()
          const widthPct = (15 * 60 * 1000) / dayRange * 100

          if (slotTime < dayStart || slotTime > dayEnd) return null

          return (
            <div
              key={f.id}
              className={`${
                f.status === 'sun'
                  ? 'forecast-bar-sun'
                  : f.status === 'shade'
                    ? 'forecast-bar-shade'
                    : 'forecast-bar-unknown'
              }`}
              style={{ width: `${widthPct}%` }}
              title={`${formatTimeAT(new Date(f.slot_starts_at))}: ${f.status}`}
            />
          )
        })}
      </div>
      {!compact && (
        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
          <span>{formatTimeAT(sunrise)}</span>
          <span>{formatTimeAT(sunset)}</span>
        </div>
      )}
    </div>
  )
}
