'use client'

import { useEffect, useState } from 'react'
import type { WeatherData } from '@/types'

export default function WeatherBanner() {
  const [weather, setWeather] = useState<WeatherData | null>(null)

  useEffect(() => {
    async function fetchWeather() {
      try {
        const res = await fetch('/api/weather')
        if (res.ok) {
          const data = await res.json()
          setWeather(data)
        }
      } catch {
        // Silently fail — banner just won't show
      }
    }
    fetchWeather()
  }, [])

  if (!weather) return null

  const isMinimal = weather.condition_code === 'clear'

  return (
    <div
      className={`px-4 py-2 text-sm flex items-center gap-2 ${
        isMinimal
          ? 'bg-amber-50 text-amber-800'
          : weather.condition_code === 'poor'
            ? 'bg-gray-100 text-gray-700'
            : 'bg-blue-50 text-blue-800'
      }`}
      role="status"
      aria-live="polite"
    >
      <span className="text-base" aria-hidden="true">
        {weather.condition_code === 'clear' && '☀️'}
        {weather.condition_code === 'partly_cloudy' && '⛅'}
        {weather.condition_code === 'overcast' && '☁️'}
        {weather.condition_code === 'poor' && '🌧️'}
      </span>
      <span className="font-medium">{Math.round(weather.temperature)}°C</span>
      {!isMinimal && (
        <span className="text-xs opacity-80">
          {weather.condition_code === 'partly_cloudy' &&
            'Partly cloudy — sun predictions assume clear skies'}
          {weather.condition_code === 'overcast' &&
            'Overcast — sun positions shown for clear sky conditions'}
          {weather.condition_code === 'poor' &&
            `${weather.condition} — Sun positions shown for clear sky conditions`}
        </span>
      )}
      {weather.cached && (
        <span className="text-xs opacity-50 ml-auto">(cached)</span>
      )}
    </div>
  )
}
