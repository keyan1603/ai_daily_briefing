// ============================================================
// MASTER ORCHESTRATOR: /api/briefing
// Coordinates all agents and returns the complete daily briefing
// Demonstrates full agent-to-agent communication pipeline
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import type { BriefingResponse, Location, WeatherData, NewsArticle, AgentSources } from '@/lib/types'

const BASE_URL = process.env.APP_URL ?? 'http://localhost:3000'
const WEATHER_TIMEOUT_MS = Number(process.env.WEATHER_TIMEOUT_MS ?? 10000)
const NEWS_TIMEOUT_MS = Number(process.env.NEWS_TIMEOUT_MS ?? 30000)
const RECOMMEND_TIMEOUT_MS = Number(process.env.RECOMMEND_TIMEOUT_MS ?? 45000)

export const maxDuration = 60

// Fetch with timeout helper
async function fetchWithTimeout(url: string, options: RequestInit = {}, ms = 10000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    return res
  } finally {
    clearTimeout(timer)
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await req.json()
    const location: Location = body.location

    if (!location?.lat || !location?.lon) {
      return NextResponse.json({ error: 'Location is required' }, { status: 400 })
    }

    // ── Step 1: Fan out — fetch Weather + News in parallel ─────────────────
    const [weatherRes, newsRes, holidayRes] = await Promise.allSettled([
      fetchWithTimeout(
        `${BASE_URL}/api/weather?lat=${location.lat}&lon=${location.lon}`,
        {},
        WEATHER_TIMEOUT_MS
      ).then(r => r.json()),

      fetchWithTimeout(
        `${BASE_URL}/api/news?country=${location.countryCode.toLowerCase()}&city=${encodeURIComponent(location.city)}&state=${encodeURIComponent(location.state)}`,
        {},
        NEWS_TIMEOUT_MS
      ).then(r => r.json()),

      fetchCalendarific(location.countryCode),
    ])

    // ── Step 2: Extract results with graceful fallbacks ─────────────────────
    const weather: WeatherData =
      weatherRes.status === 'fulfilled' && weatherRes.value?.success
        ? weatherRes.value.data
        : getDefaultWeather()

    const news: NewsArticle[] =
      newsRes.status === 'fulfilled' && newsRes.value?.success
        ? newsRes.value.data
        : []

    const newsSource: AgentSources['news'] =
      (newsRes.status === 'fulfilled' && newsRes.value?.source === 'ai-generated') ? 'ai' : 'fallback'
    console.log(`[Orchestrator] News: ${newsRes.status}, source: ${newsRes.status === 'fulfilled' ? newsRes.value?.source : 'failed'}, count: ${news.length}`)

    const { isHoliday, holidayName } =
      holidayRes.status === 'fulfilled'
        ? holidayRes.value
        : { isHoliday: false, holidayName: undefined }

    // ── Step 3: Pass all context to the Recommendation Agent ───────────────
    const recommendRes = await fetchWithTimeout(`${BASE_URL}/api/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weather, news, location, isHoliday, holidayName }),
    }, RECOMMEND_TIMEOUT_MS)

    // If recommend agent fails (e.g. no API credits), use rule-based fallback
    let r = buildFallbackRecommendation(weather, news, location, isHoliday, holidayName)
    if (recommendRes.ok) {
      const recommendData = await recommendRes.json()
      if (recommendData.success && recommendData.data) {
        r = recommendData.data
      } else {
        console.warn('[Orchestrator] RecommendAgent had no data — using rule-based fallback')
      }
    } else {
      console.warn('[Orchestrator] RecommendAgent returned', recommendRes.status, '— using rule-based fallback')
    }

    // ── Step 4: Assemble the final briefing ────────────────────────────────
    const briefing: BriefingResponse = {
      greeting: r.greeting,
      dayContext: r.dayContext,
      weather,
      holiday: { isHoliday, holidayName },
      clothing: r.clothing,
      safety: r.safety,
      news,
      newsSummary: r.newsSummary,
      officeAdvice: r.officeAdvice,
      generatedAt: new Date().toISOString(),
      location,
      sources: { ...(r.sources ?? {}), news: newsSource },
    }

    const durationMs = Date.now() - startTime
    console.log(`[Orchestrator] Briefing ready in ${durationMs}ms`)

    return NextResponse.json({ success: true, data: briefing, durationMs })
  } catch (error) {
    console.error('[Orchestrator]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Briefing generation failed' },
      { status: 500 }
    )
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function fetchCalendarific(
  countryCode: string
): Promise<{ isHoliday: boolean; holidayName?: string }> {
  const apiKey = process.env.CALENDARIFIC_API_KEY

  if (!apiKey || apiKey === 'your_calendarific_api_key_here') {
    return { isHoliday: false }
  }

  try {
    const today = new Date()
    const url = new URL('https://calendarific.com/api/v2/holidays')
    url.searchParams.set('api_key', apiKey)
    url.searchParams.set('country', countryCode)
    url.searchParams.set('year', today.getFullYear().toString())
    url.searchParams.set('month', (today.getMonth() + 1).toString())
    url.searchParams.set('day', today.getDate().toString())

    const res = await fetch(url.toString())
    const data = await res.json()
    const holidays = data?.response?.holidays ?? []

    if (holidays.length > 0) {
      return { isHoliday: true, holidayName: holidays[0].name }
    }
    return { isHoliday: false }
  } catch {
    return { isHoliday: false }
  }
}

function getDefaultWeather(): WeatherData {
  return {
    temperature: 32,
    feelsLike: 36,
    humidity: 68,
    windSpeed: 12,
    weatherCode: 2,
    description: 'Partly cloudy',
    icon: '⛅',
    uvIndex: 7,
    precipitation: 0,
    isRaining: false,
    forecast: [],
  }
}

// Rule-based fallback when Claude API is unavailable
function buildFallbackRecommendation(
  weather: WeatherData,
  news: NewsArticle[],
  location?: { city: string },
  isHoliday?: boolean,
  holidayName?: string
) {
  const now = new Date()
  const hour = now.getHours()
  const dayName = now.toLocaleDateString('en-IN', { weekday: 'long' })
  const weekend = now.getDay() === 0 || now.getDay() === 6
  const isOfficeDay = !weekend && !isHoliday
  const hot = weather.temperature >= 30
  const cool = weather.temperature < 22
  const salutation = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const city = location?.city ?? 'your city'

  return {
    greeting: isHoliday
      ? `${salutation}! Wishing you a wonderful ${holidayName} — enjoy every moment.`
      : isOfficeDay
      ? `${salutation}! Ready to take on ${dayName}? Here's everything you need for a great day.`
      : `${salutation}! It's the weekend — make it restful, fun, and fully yours.`,
    dayContext: hot
      ? 'A warm day ahead — keep cool, stay hydrated, and pace yourself.'
      : weather.isRaining
      ? 'Rain is in the air — a perfect day to stay cosy and focused.'
      : 'Comfortable conditions today — a fine day to get things done.',
    clothing: {
      outfit: hot ? 'Light breathable cotton for the heat' : cool ? 'Comfortable layers for cooler air' : 'Smart-casual and comfortable',
      items: hot
        ? ['Light cotton shirt', 'Linen trousers', 'Breathable footwear']
        : cool
        ? ['Full-sleeve shirt', isOfficeDay ? 'Formal trousers' : 'Jeans', 'Light jacket']
        : ['Cotton shirt', isOfficeDay ? 'Formal trousers' : 'Chinos', 'Comfortable shoes'],
      accessories: [
        ...(weather.uvIndex >= 6 ? ['Sunglasses', 'Sunscreen SPF 50'] : []),
        ...(hot ? ['Water bottle'] : []),
      ],
      reasoning: `At ${Math.round(weather.temperature)}°C with ${weather.description.toLowerCase()}, ${hot ? 'breathable fabrics keep you cool all day' : cool ? 'layering gives you flexibility' : 'light casuals are perfect'}.`,
      colorPalette: hot ? 'Whites, pastels, light neutrals' : cool ? 'Blues, earthy tones, warm greys' : 'Fresh and clean — any palette works',
      umbrella: weather.isRaining || weather.precipitation > 2,
      jacket: weather.temperature < 22,
      raincoat: weather.isRaining && weather.precipitation > 5,
    },
    safety: {
      isSafe: weather.weatherCode < 95,
      level: (weather.weatherCode >= 95 ? 'warning' : weather.uvIndex >= 9 ? 'caution' : 'safe') as 'safe' | 'caution' | 'warning' | 'danger',
      summary: weather.weatherCode >= 95
        ? 'Severe weather expected — exercise caution outdoors.'
        : weather.uvIndex >= 9
        ? 'High UV levels today — take precautions in the sun.'
        : 'Conditions appear normal — safe to go about your day.',
      alerts: [
        ...(weather.uvIndex >= 8 ? [`High UV index (${weather.uvIndex}) — apply sunscreen`] : []),
        ...(weather.isRaining ? ['Rain expected — carry an umbrella'] : []),
        ...(weather.weatherCode >= 95 ? ['Thunderstorm possible — avoid open areas'] : []),
      ],
    },
    officeAdvice: !isOfficeDay
      ? "It's your day off — rest, explore, and recharge fully."
      : weather.isRaining
      ? 'Rain may slow traffic — leave a little earlier than usual today.'
      : hot
      ? 'Stay hydrated throughout the day and take short breaks to cool down.'
      : 'Tackle your most important work first thing — momentum compounds.',
    newsSummary: news.length
      ? `Today's headlines in ${city}: ${news.slice(0, 2).map(a => a.title).join('; ')}. Scroll below for full summaries.`
      : `Stay up to date with the latest news from ${city} and beyond today.`,
    isOfficeDay,
    isHoliday: isHoliday ?? false,
    holidayName,
    dayName,
    sources: {
      clothing: 'fallback' as const,
      safety: 'fallback' as const,
      greeting: 'fallback' as const,
      officeAdvice: 'fallback' as const,
      newsSummary: 'fallback' as const,
      news: 'fallback' as const,
    },
  }
}
