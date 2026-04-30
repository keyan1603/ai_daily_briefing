// ============================================================
// AGENT 1: WEATHER AGENT
// Fetches real-time weather from Open-Meteo (FREE, no key needed)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getWeatherInfo, isRainy } from '@/lib/weather-codes'
import type { WeatherData } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 })
  }

  try {
    // Open-Meteo: completely free, no API key
    const url = new URL('https://api.open-meteo.com/v1/forecast')
    url.searchParams.set('latitude', lat)
    url.searchParams.set('longitude', lon)
    url.searchParams.set('current', [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'wind_speed_10m',
      'weather_code',
      'uv_index',
      'precipitation',
    ].join(','))
    url.searchParams.set('daily', [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
    ].join(','))
    url.searchParams.set('timezone', 'auto')
    url.searchParams.set('forecast_days', '5')

    const res = await fetch(url.toString(), { next: { revalidate: 900 } }) // cache 15 min
    if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`)

    const raw = await res.json()
    const c = raw.current
    const daily = raw.daily

    const weatherCode = c.weather_code as number
    const info = getWeatherInfo(weatherCode)

    const forecast = (daily.time as string[]).map((date: string, i: number) => ({
      date,
      maxTemp: daily.temperature_2m_max[i],
      minTemp: daily.temperature_2m_min[i],
      precipitationChance: daily.precipitation_probability_max[i],
      weatherCode: daily.weather_code[i],
    }))

    const weather: WeatherData = {
      temperature: c.temperature_2m,
      feelsLike: c.apparent_temperature,
      humidity: c.relative_humidity_2m,
      windSpeed: c.wind_speed_10m,
      weatherCode,
      description: info.description,
      icon: info.icon,
      uvIndex: c.uv_index ?? 0,
      precipitation: c.precipitation ?? 0,
      isRaining: isRainy(weatherCode),
      forecast,
    }

    return NextResponse.json({ success: true, data: weather })
  } catch (error) {
    console.error('[WeatherAgent]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Weather fetch failed' },
      { status: 500 }
    )
  }
}
