// ============================================================
// AGENT 3: RECOMMENDATION AGENT (Orchestrator)
// Combines weather + news + holiday data
// Calls Claude to generate clothing, safety, and office advice
// This is the "brain" of the agent-to-agent architecture
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { askClaude, parseJSON } from '@/lib/anthropic'
import { getDayName, isWeekend } from '@/lib/weather-codes'
import type { WeatherData, NewsArticle, ClothingRecommendation, SafetyAssessment, AgentSources } from '@/lib/types'

export const maxDuration = 60

interface RecommendPayload {
  weather: WeatherData
  news: NewsArticle[]
  location: { city: string; state: string; country: string; countryCode: string }
  isHoliday: boolean
  holidayName?: string
}

export async function POST(req: NextRequest) {
  try {
    const body: RecommendPayload = await req.json()
    const { weather, news, location, isHoliday, holidayName } = body

    const dayName = getDayName()
    const weekend = isWeekend()
    const isOfficeDay = !weekend && !isHoliday

    // --- Sub-Agent A: Clothing Recommendation ---
    const clothingPrompt = `You are a personal wardrobe stylist agent for ${location.city}, India.
Today is ${dayName}. Weather: ${weather.temperature}°C (feels like ${weather.feelsLike}°C), 
${weather.description}, humidity ${weather.humidity}%, wind ${weather.windSpeed} km/h, UV index ${weather.uvIndex}.
${isHoliday ? `Today is a holiday: ${holidayName}` : isOfficeDay ? 'Today is a working day (office day).' : 'Today is a weekend.'}

Respond ONLY with valid JSON (no markdown):
{
  "outfit": "One-line outfit summary",
  "items": ["clothing item 1", "clothing item 2", "clothing item 3"],
  "accessories": ["accessory 1", "accessory 2"],
  "reasoning": "2-sentence reason based on weather",
  "colorPalette": "Suggested color palette description",
  "umbrella": true or false,
  "jacket": true or false,
  "raincoat": true or false
}`

    // --- Sub-Agent B: Safety Assessment ---
    const newsHeadlines = news.length > 0
      ? news.map(a => `- ${a.title} (sentiment: ${a.sentiment})`).join('\n')
      : 'No news headlines available — assess based on weather only.'
    const safetyPrompt = `You are a public safety assessment agent for ${location.city}, ${location.state}, India.
Today is ${dayName}.

WEATHER CONDITIONS:
- Temperature: ${weather.temperature}°C, feels like ${weather.feelsLike}°C
- Conditions: ${weather.description}
- UV Index: ${weather.uvIndex}
- Precipitation: ${weather.precipitation}mm
- Wind: ${weather.windSpeed} km/h
- Weather code: ${weather.weatherCode} (95+ = thunderstorm)

NEWS HEADLINES:
${newsHeadlines}

Based on BOTH weather and news, assess overall safety for a resident going out in ${location.city} today.
Generate 1-3 specific, actionable alerts based on actual conditions above.

Respond ONLY with valid JSON (no markdown):
{
  "isSafe": true or false,
  "level": "safe" or "caution" or "warning" or "danger",
  "summary": "One clear sentence about overall safety for ${location.city} today",
  "alerts": ["Specific alert based on conditions", "Another alert if warranted"]
}`

    // --- Sub-Agent C: Greeting & Day Context ---
    const greetingPrompt = `You are a warm, witty morning assistant for someone in ${location.city}, India.
Today is ${dayName}. Temperature is ${weather.temperature}°C with ${weather.description}.
${isHoliday ? `Today is ${holidayName} — a public holiday!` : isOfficeDay ? "It's a workday." : "It's the weekend!"}

Write a brief, warm personalised greeting (2 sentences max). Be cheerful, culturally aware of India.
Then write one line of "day context" (e.g. what kind of day it is energy-wise).
Respond ONLY as JSON: { "greeting": "...", "dayContext": "..." }`

    // --- Sub-Agent D: Office Advice ---
    const officePrompt = `You are a professional daily advisor. 
Today is ${dayName} in ${location.city}. ${isOfficeDay ? 'The person is going to the office.' : 'The person is NOT going to the office today.'}
Weather: ${weather.temperature}°C, ${weather.description}.
${weather.isRaining ? 'It is raining.' : ''}

Give one concise, actionable sentence of office/day advice. 
Respond ONLY with: { "officeAdvice": "..." }`

    // --- Sub-Agent E: News Summary ---
    const newsSummaryPrompt = `Summarise these ${location.city} news headlines in 2 sentences for a busy professional. 
Be factual, concise. No bullet points - flowing prose only.
Headlines: ${news.map(a => a.title).join('; ')}
Respond ONLY with: { "summary": "..." }`

    // Run all sub-agents in parallel using Promise.allSettled so a
    // credit/quota error on one agent never crashes the whole briefing.
    const [clothingResult, safetyResult, greetingResult, officeResult, summaryResult] = await Promise.allSettled([
      askClaude(clothingPrompt, undefined, 600),
      askClaude(safetyPrompt, undefined, 400),
      askClaude(greetingPrompt, undefined, 300),
      askClaude(officePrompt, undefined, 200),
      askClaude(newsSummaryPrompt, undefined, 300),
    ])

    const clothingRaw = clothingResult.status === 'fulfilled' ? clothingResult.value : ''
    const safetyRaw   = safetyResult.status   === 'fulfilled' ? safetyResult.value   : ''
    const greetingRaw = greetingResult.status === 'fulfilled' ? greetingResult.value : ''
    const officeRaw   = officeResult.status   === 'fulfilled' ? officeResult.value   : ''
    const summaryRaw  = summaryResult.status  === 'fulfilled' ? summaryResult.value  : ''

    // Log any agent failures for observability (but don't crash)
    if (clothingResult.status === 'rejected') console.warn('[ClothingAgent] fell back to rules:', clothingResult.reason?.message)
    if (safetyResult.status   === 'rejected') console.warn('[SafetyAgent] fell back to rules:',   safetyResult.reason?.message)
    if (greetingResult.status === 'rejected') console.warn('[GreetingAgent] fell back to rules:', greetingResult.reason?.message)
    if (officeResult.status   === 'rejected') console.warn('[OfficeAgent] fell back to rules:',   officeResult.reason?.message)
    if (summaryResult.status  === 'rejected') console.warn('[SummaryAgent] fell back to rules:',  summaryResult.reason?.message)

    const clothingFallback = getRuleBasedClothing(weather, isOfficeDay)
    const clothing = parseJSON<ClothingRecommendation>(clothingRaw, clothingFallback)
    const clothingIsAI = clothingRaw !== '' && clothing !== clothingFallback

    const safetyFallback = getRuleBasedSafety(weather, news)
    const safety = parseJSON<SafetyAssessment>(safetyRaw, safetyFallback)
    const safetyIsAI = safetyRaw !== '' && safety !== safetyFallback

    const greetingFallback = getRuleBasedGreeting(dayName, weather, isOfficeDay, isHoliday, holidayName)
    const greetingData = parseJSON<{ greeting: string; dayContext: string }>(greetingRaw, greetingFallback)
    const greetingIsAI = greetingRaw !== '' && greetingData !== greetingFallback

    const officeFallback = { officeAdvice: getRuleBasedOfficeAdvice(isOfficeDay, weather) }
    const officeData = parseJSON<{ officeAdvice: string }>(officeRaw, officeFallback)
    const officeIsAI = officeRaw !== '' && officeData !== officeFallback

    const newsSummaryFallback = getRuleBasedNewsSummary(news, location.city)
    const summaryData = parseJSON<{ summary: string }>(summaryRaw, { summary: '' })
    const newsSummary = summaryData.summary || newsSummaryFallback
    const summaryIsAI = summaryRaw !== '' && Boolean(summaryData.summary)

    const sources: AgentSources = {
      clothing:    clothingIsAI  ? 'ai' : 'fallback',
      safety:      safetyIsAI    ? 'ai' : 'fallback',
      greeting:    greetingIsAI  ? 'ai' : 'fallback',
      officeAdvice: officeIsAI   ? 'ai' : 'fallback',
      newsSummary: summaryIsAI   ? 'ai' : 'fallback',
      news:        'fallback', // overridden by orchestrator
    }

    return NextResponse.json({
      success: true,
      data: {
        ...greetingData,
        clothing,
        safety,
        officeAdvice: officeData.officeAdvice,
        newsSummary,
        sources,
        isOfficeDay,
        isHoliday,
        holidayName,
        dayName,
      },
    })
  } catch (error) {
    console.error('[RecommendAgent]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Recommendation failed' },
      { status: 500 }
    )
  }
}

// ── Rule-based fallbacks (used when Claude API has no credits) ────────────

function getRuleBasedClothing(weather: WeatherData, isOfficeDay: boolean): ClothingRecommendation {
  const hot  = weather.temperature >= 30
  const cool = weather.temperature < 22
  const outfit = hot ? "Light, breathable cotton for the heat"
    : cool ? "Layer up — it's cool outside"
    : "Smart-casual for a comfortable day"
  const items = hot
    ? ["Light cotton shirt", "Linen or cotton trousers", "Breathable footwear"]
    : cool
    ? ["Full-sleeve shirt", isOfficeDay ? "Formal trousers" : "Jeans", "Light jacket", "Closed-toe shoes"]
    : ["Cotton shirt", isOfficeDay ? "Formal trousers" : "Chinos", "Comfortable shoes"]
  return {
    outfit,
    items,
    accessories: [
      ...(weather.uvIndex >= 6 ? ["Sunglasses", "Sunscreen SPF 50"] : []),
      ...(hot ? ["Water bottle"] : []),
    ],
    reasoning: `At ${Math.round(weather.temperature)}°C with ${weather.description.toLowerCase()}, ${hot ? "breathable fabrics keep you cool" : cool ? "layers keep you comfortable" : "light casuals work perfectly"}.`,
    colorPalette: hot ? "Light pastels, whites, soft neutrals" : cool ? "Deep blues, earthy tones, warm greys" : "Any colours — keep it fresh",
    umbrella: weather.isRaining || weather.precipitation > 2,
    jacket: weather.temperature < 22,
    raincoat: weather.isRaining && weather.precipitation > 5,
  }
}

function getRuleBasedSafety(weather: WeatherData, news: NewsArticle[]): SafetyAssessment {
  const negativeCount = news.filter(a => a.sentiment === "negative").length
  const severeWeather = weather.weatherCode >= 95
  const highUV = weather.uvIndex >= 9
  const level: SafetyAssessment["level"] =
    severeWeather ? "warning" : (negativeCount >= 2 || highUV) ? "caution" : "safe"
  const alerts: string[] = []
  if (highUV) alerts.push(`UV index is ${weather.uvIndex} — wear sunscreen and a hat`)
  if (weather.isRaining) alerts.push("Rain in the forecast — carry an umbrella")
  if (severeWeather) alerts.push("Severe weather possible — avoid unnecessary outdoor exposure")
  return {
    isSafe: level === "safe" || level === "caution",
    level,
    summary: level === "safe" ? "Conditions look normal — safe to venture out."
      : level === "caution" ? "Take some precautions before heading out today."
      : "Exercise caution — adverse conditions expected.",
    alerts,
  }
}

function getRuleBasedGreeting(
  dayName: string, weather: WeatherData,
  isOfficeDay: boolean, isHoliday: boolean, holidayName?: string
): { greeting: string; dayContext: string } {
  const hour = new Date().getHours()
  const salutation = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const greeting = isHoliday
    ? `${salutation}! Wishing you a joyful ${holidayName} — take the day to relax and celebrate.`
    : isOfficeDay
    ? `${salutation}! Here's your briefing for ${dayName} — have a focused and productive day.`
    : `${salutation}! It's the weekend — recharge and make the most of your time off.`
  const dayContext = weather.temperature >= 32
    ? "A warm day ahead — stay hydrated and seek shade when outdoors."
    : weather.isRaining ? "A rainy day — great for staying in and getting things done."
    : "Comfortable conditions today — a good day to be out and about."
  return { greeting, dayContext }
}

function getRuleBasedOfficeAdvice(isOfficeDay: boolean, weather: WeatherData): string {
  if (!isOfficeDay) return "It's your day off — unplug, recharge, and do something you enjoy."
  if (weather.isRaining) return "Rain can cause traffic delays — consider leaving a little earlier."
  if (weather.temperature >= 33) return "It's hot out — stay hydrated and avoid the midday sun."
  return "Start with your highest-priority task to set a strong, productive tone for the day."
}

function getRuleBasedNewsSummary(news: NewsArticle[], city: string): string {
  if (!news.length) return `Stay informed about the latest developments in and around ${city} today.`
  const titles = news.slice(0, 2).map(a => a.title).join("; and ")
  return `Key stories making headlines in ${city} today: ${titles}. Read the full summaries below.`
}
