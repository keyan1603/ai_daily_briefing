// ============================================================
// AGENT 2: NEWS AGENT
// Priority: NewsData.io API → AI-generated news → static demo
// Works fully without a NewsData key by using Gemini/Claude
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { askClaude, parseJSON } from '@/lib/anthropic'
import type { NewsArticle } from '@/lib/types'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const country = (searchParams.get('country') ?? 'in').toLowerCase()
  const city    = searchParams.get('city') ?? 'Chennai'
  const state   = searchParams.get('state') ?? 'Tamil Nadu'

  const newsApiKey = process.env.NEWSDATA_API_KEY

  try {
    // ── Path A: Real news from NewsData.io ───────────────────────────────
    if (newsApiKey && newsApiKey !== 'your_newsdata_api_key_here') {
      const url = new URL('https://newsdata.io/api/1/news')
      url.searchParams.set('apikey', newsApiKey)
      url.searchParams.set('country', country)
      url.searchParams.set('language', 'en')
      url.searchParams.set('size', '10')

      const res = await fetch(url.toString(), { next: { revalidate: 1800 } })
      if (res.ok) {
        const data = await res.json()
        const rawArticles = data.results ?? []

        if (rawArticles.length > 0) {
          const aiPrompt = `You are a news relevance agent for ${city}, ${state}, India.
Rank the top 3 most relevant articles for a local resident's morning briefing.
Prioritise: local/${city} news > ${state} state news > national India news > weather/safety > business.
For each detect sentiment (positive/negative/neutral) and category.

Articles:
${JSON.stringify(rawArticles.slice(0, 10).map((a: Record<string, unknown>) => ({
  title: a.title,
  description: a.description,
  source_id: a.source_id,
  pubDate: a.pubDate,
  link: a.link,
})))}

Respond ONLY with a valid JSON array, no markdown:
[{"title":"...","description":"...","url":"...","source":"...","publishedAt":"...","sentiment":"positive|negative|neutral","category":"...","relevanceScore":0}]`

          const aiResponse = await askClaude(aiPrompt, undefined, 1500)
          const articles = parseJSON<NewsArticle[]>(aiResponse, [])
          if (articles.length > 0) {
            return NextResponse.json({ success: true, data: articles.slice(0, 3), source: 'newsdata' })
          }
        }
      }
    }

    // ── Path B: AI-generated contextual news (no NewsData key needed) ────
    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const aiNewsPrompt = `You are a local news agent for ${city}, ${state}, India. Today is ${today}.

Generate 3 realistic, plausible local news articles that a resident of ${city} would care about this morning.
Base them on real, ongoing topics relevant to ${city} and ${state} — infrastructure, politics, weather, economy, civic issues, events.
Do NOT use fictional names. Use real institutions, landmarks, and organisations from ${city}.
Each article must have a distinct category. Include one positive, one neutral, one cautionary story.

Respond ONLY with a valid JSON array, no markdown, no explanation:
[
  {
    "title": "realistic headline",
    "description": "2-3 sentence realistic article summary",
    "url": "#",
    "source": "real Indian news source name",
    "publishedAt": "${new Date().toISOString()}",
    "sentiment": "positive|negative|neutral",
    "category": "local|politics|weather|transport|economy|health",
    "relevanceScore": 90
  }
]`

    const aiArticles = await askClaude(aiNewsPrompt, undefined, 1200)
    const generated = parseJSON<NewsArticle[]>(aiArticles, [])

    if (generated.length > 0) {
      return NextResponse.json({ success: true, data: generated.slice(0, 3), source: 'ai-generated' })
    }

    // ── Path C: Static fallback ──────────────────────────────────────────
    return NextResponse.json({ success: true, data: getStaticFallback(city), source: 'static' })

  } catch (error) {
    console.error('[NewsAgent]', error)
    return NextResponse.json({ success: true, data: getStaticFallback(city), source: 'static-error' })
  }
}

function getStaticFallback(city: string): NewsArticle[] {
  return [
    {
      title: `${city} Corporation Fast-Tracks Stormwater Drain Upgrades Ahead of Monsoon`,
      description: `The Greater ${city} Corporation has approved an emergency tender to repair and expand stormwater drainage across 12 flood-prone wards before the onset of the southwest monsoon season.`,
      url: '#',
      source: 'The Hindu',
      publishedAt: new Date().toISOString(),
      sentiment: 'positive',
      category: 'local',
      relevanceScore: 95,
    },
    {
      title: 'IMD Issues Yellow Alert: Heavy Rain and Thunderstorms Likely This Week',
      description: `The India Meteorological Department has issued a yellow alert for the region, forecasting heavy to very heavy rainfall with gusty winds. Residents are advised to avoid low-lying areas and unnecessary outdoor activity.`,
      url: '#',
      source: 'NDTV',
      publishedAt: new Date(Date.now() - 3600000).toISOString(),
      sentiment: 'neutral',
      category: 'weather',
      relevanceScore: 92,
    },
    {
      title: 'State Budget Allocates ₹3,200 Crore for Metro Phase III Expansion',
      description: `The state government has earmarked ₹3,200 crore in the revised budget for the Phase III metro rail expansion, adding 23 new stations and connecting major IT corridors to the city centre.`,
      url: '#',
      source: 'Times of India',
      publishedAt: new Date(Date.now() - 7200000).toISOString(),
      sentiment: 'positive',
      category: 'transport',
      relevanceScore: 88,
    },
  ]
}
