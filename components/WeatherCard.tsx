'use client'

import type { WeatherData } from '@/lib/types'
import { formatTemp } from '@/lib/weather-codes'

interface WeatherCardProps {
  weather: WeatherData
  city: string
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function WeatherCard({ weather, city }: WeatherCardProps) {
  return (
    <div
      className="glass rounded-3xl p-6 reveal reveal-delay-2"
      style={{ border: '1px solid rgba(255, 228, 180, 0.5)' }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: 'var(--ink-faint)' }}>
            Current Weather
          </p>
          <p className="text-sm font-medium" style={{ color: 'var(--ink-muted)' }}>
            📍 {city}
          </p>
        </div>
        <div className="weather-icon text-5xl leading-none">{weather.icon}</div>
      </div>

      {/* Temperature */}
      <div className="flex items-end gap-3 mb-1">
        <span
          className="font-display leading-none"
          style={{ fontSize: '4rem', color: 'var(--clay-700)' }}
        >
          {Math.round(weather.temperature)}°
        </span>
        <div className="pb-2">
          <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
            {weather.description}
          </p>
          <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>
            Feels {formatTemp(weather.feelsLike)}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div
        className="grid grid-cols-3 gap-3 mt-4 pt-4"
        style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
      >
        {[
          { label: 'Humidity', value: `${weather.humidity}%`, icon: '💧' },
          { label: 'Wind', value: `${Math.round(weather.windSpeed)} km/h`, icon: '🌬️' },
          { label: 'UV Index', value: String(weather.uvIndex), icon: '☀️' },
        ].map(stat => (
          <div key={stat.label} className="text-center">
            <p className="text-base mb-0.5">{stat.icon}</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              {stat.value}
            </p>
            <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* 5-day forecast */}
      {weather.forecast.length > 0 && (
        <div
          className="mt-4 pt-4"
          style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
        >
          <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: 'var(--ink-faint)' }}>
            5-Day Forecast
          </p>
          <div className="flex gap-2">
            {weather.forecast.slice(0, 5).map((day, i) => {
              const d = new Date(day.date)
              const label = i === 0 ? 'Today' : WEEKDAYS[d.getDay()]
              return (
                <div
                  key={day.date}
                  className="flex-1 text-center py-2 px-1 rounded-xl"
                  style={{
                    background: i === 0 ? 'rgba(249,115,22,0.1)' : 'rgba(0,0,0,0.03)',
                  }}
                >
                  <p className="text-xs mb-1" style={{ color: 'var(--ink-faint)' }}>{label}</p>
                  <p className="text-sm mb-1">
                    {day.weatherCode <= 2 ? '☀️' : day.weatherCode <= 48 ? '⛅' : '🌧️'}
                  </p>
                  <p className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>
                    {Math.round(day.maxTemp)}°
                  </p>
                  <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>
                    {Math.round(day.minTemp)}°
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
