# 🏗️ Technical Implementation Plan — AI Daily Briefing

> **Feature:** 001-daily-briefing  
> **Plan Version:** 1.0  
> **Stack Decision Date:** 2026-05-09  
> **Status:** Approved

---

## Tech Stack

| Layer | Choice | Version | Rationale |
|---|---|---|---|
| Framework | Next.js (App Router) | 14.x | File-based routing maps directly to agent-per-route; RSC support; edge-ready |
| Language | TypeScript | 5.x (strict) | Type safety across agent boundaries; no `any` |
| Styling | Tailwind CSS + custom CSS | 3.x | Utility-first velocity; custom CSS for card-level bespoke designs |
| AI Provider | Anthropic Claude Sonnet | claude-sonnet-4-20250514 | Best instruction-following for structured JSON output; switchable via env |
| AI Fallback | Google Gemini 1.5 Flash | gemini-1.5-flash | Same JSON-output capability; toggled via `AI_PROVIDER=gemini` |
| Weather API | Open-Meteo | REST v1 | Free, no key, reliable; WMO weather code standard |
| News API | NewsData.io | REST v1 | 200 req/day free; country + language filtering |
| Holiday API | Calendarific | REST v2 | 1 000 req/month free; country + date filtering |
| Geocoding | Nominatim (OpenStreetMap) | REST | Free; reverse geocoding lat/lon → city/state/country |
| Hosting | Vercel | Free tier | Zero-config Next.js deploy; encrypted env vars; edge caching |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Browser                                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │  page.tsx  — UI shell, state, agent pipeline    │   │
│  │  components/AgentPipeline.tsx                   │   │
│  │  components/WeatherCard.tsx                     │   │
│  │  components/NewsCard.tsx                        │   │
│  │  components/ClothingCard.tsx                    │   │
│  │  components/SafetyCard.tsx                      │   │
│  └───────────────────┬─────────────────────────────┘   │
└──────────────────────│─────────────────────────────────┘
                       │  POST /api/briefing
                       ▼
┌──────────────────────────────────────────────────────────┐
│  /api/briefing  (Master Orchestrator)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ /api/weather │  │  /api/news   │  │ Calendarific │  │
│  │ Open-Meteo   │  │ NewsData.io  │  │  API         │  │
│  │ (no key)     │  │ + Claude AI  │  │  (optional)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│        └──────────────────┴──────────────────┘          │
│               Promise.allSettled (parallel)             │
│                          │                              │
│                          ▼                              │
│             POST /api/recommend                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │Sub-Agent │ │Sub-Agent │ │Sub-Agent │ │Sub-Agent │  │
│  │A:Clothing│ │B:Safety  │ │C:Greeting│ │D:Office  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│               ┌──────────┐                             │
│               │Sub-Agent │ Promise.allSettled          │
│               │E:Summary │ (all 5 parallel)            │
│               └──────────┘                             │
│                          │                             │
│                          ▼                             │
│             Final BriefingResponse JSON                │
└──────────────────────────────────────────────────────────┘
```

---

## File Structure

```
daily-briefing/
├── app/
│   ├── api/
│   │   ├── briefing/route.ts      # Master orchestrator (Step 3+4)
│   │   ├── weather/route.ts       # Agent 1: Open-Meteo fetch + normalise
│   │   ├── news/route.ts          # Agent 2: NewsData → AI rank → static
│   │   └── recommend/route.ts     # Agent 3: 5 Claude sub-agents in parallel
│   ├── layout.tsx                 # Root layout, metadata
│   ├── page.tsx                   # Main UI: state, fetch, render pipeline
│   └── globals.css                # Base styles + CSS custom properties
├── components/
│   ├── AgentPipeline.tsx          # Live status pipeline during load
│   ├── WeatherCard.tsx            # Weather display + 5-day forecast
│   ├── NewsCard.tsx               # Individual news article card
│   ├── ClothingCard.tsx           # Outfit recommendation card
│   ├── SafetyCard.tsx             # Safety level + alerts card
│   ├── ArchitectureDiagram.tsx    # Static architecture visual
│   └── AIBadge.tsx                # AI vs Fallback source badge
├── lib/
│   ├── anthropic.ts               # AI provider router (Claude / Gemini)
│   ├── types.ts                   # All shared TypeScript interfaces
│   └── weather-codes.ts           # WMO weather code → description + icon
├── .env.example                   # Documented env var template
├── .env.local                     # Secrets (git-ignored)
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Implementation Phases

### Phase 1 — Project Scaffold & Types

**Goal:** Establish the repo, config, and all shared types before any agent code.

1. Initialise Next.js 14 with TypeScript and Tailwind.
2. Configure `tsconfig.json` with `strict: true` and `@/` path alias.
3. Define all types in `lib/types.ts`: `Location`, `WeatherData`, `WeatherForecast`, `NewsArticle`, `HolidayInfo`, `ClothingRecommendation`, `SafetyAssessment`, `AgentSources`, `BriefingResponse`, `AgentMessage`.
4. Define `AISource = 'ai' | 'fallback'` union type.
5. Create `.env.example` with all variable names and placeholder values.
6. Create `.gitignore` with `.env.local` excluded.

**Checkpoint:** `npx tsc --noEmit` passes with zero errors.

---

### Phase 2 — AI Provider Abstraction (`lib/anthropic.ts`)

**Goal:** A single, provider-agnostic AI call surface before any agent uses it.

1. Implement `callAnthropic(messages, options)` using `fetch` to `/v1/messages`.
2. Implement `callGemini(messages, options)` using `fetch` to Generative Language API.
3. Implement `callClaude(messages, options)` router: reads `AI_PROVIDER` env var, delegates to the correct provider.
4. Implement `askClaude(prompt, system?, maxTokens?)` convenience wrapper.
5. Implement `parseJSON<T>(text, fallback)`: strips markdown fences, finds JSON bounds, parses safely.
6. Add `fetchWithTimeout(url, options, ms)` with `AbortController`.
7. Add `withRetry<T>(operation)`: retries up to `AI_MAX_RETRIES` on transient errors (429 / 5xx / timeout).
8. Validate API key presence at call time; throw descriptive error if missing or placeholder.

**Checkpoint:** Unit-test `parseJSON` with malformed inputs; all return fallback safely.

---

### Phase 3 — Weather Agent (`/api/weather/route.ts`)

**Goal:** Reliable, cached real-time weather with WMO code mapping.

1. Implement `weather-codes.ts`: map all relevant WMO codes to `{ description, icon }`.
2. Export `getWeatherInfo(code)` and `isRainy(code)`.
3. In `route.ts`:
   - Accept `lat` and `lon` query params; return 400 if missing.
   - Build Open-Meteo URL with `current` + `daily` params (5-day forecast).
   - Set `{ next: { revalidate: 900 } }` (15 min cache).
   - Map raw response to `WeatherData` type.
   - Return `{ success: true, data: WeatherData }`.
   - Catch errors; return `{ error: string }` with status 500.

**Checkpoint:** `GET /api/weather?lat=13.08&lon=80.27` returns valid `WeatherData` for Chennai.

---

### Phase 4 — News Agent (`/api/news/route.ts`)

**Goal:** Three-tier news pipeline with graceful degradation.

1. Accept `country`, `city`, `state` query params.
2. **Path A** (if `NEWSDATA_API_KEY` set):
   - Fetch up to 10 articles from NewsData.io.
   - Call `askClaude` with a ranking + sentiment prompt; parse response as `NewsArticle[]`.
   - Return top 3 with `source: 'newsdata'`.
3. **Path B** (no key or Path A fails):
   - Call `askClaude` with a generative news prompt using city + state + today's date.
   - Parse response as `NewsArticle[]`.
   - Return with `source: 'ai-generated'`.
4. **Path C** (Claude also unavailable):
   - Return 3 hardcoded static articles adapted to the requested city.
   - Return with `source: 'static'`.
5. All errors caught; never propagate to orchestrator as an exception.

**Checkpoint:** Endpoint returns 3 articles in all three paths (test by toggling env vars).

---

### Phase 5 — Recommendation Agent (`/api/recommend/route.ts`)

**Goal:** Five parallel Claude sub-agents, each with its own fallback.

1. Accept `RecommendPayload`: `{ weather, news, location, isHoliday, holidayName }`.
2. Build five prompts (Clothing, Safety, Greeting, Office, Summary).
3. Call `Promise.allSettled([askClaude×5])` — all run in parallel.
4. For each result:
   - If `fulfilled` → `parseJSON<T>(raw, fallback)`.
   - If `rejected` → log warning with agent label; use rule-based fallback.
5. Implement all five rule-based fallbacks:
   - `getRuleBasedClothing(weather, isOfficeDay)` — hot/cool/mild branches.
   - `getRuleBasedSafety(weather, news)` — weatherCode + UV + negative news count.
   - `getRuleBasedGreeting(dayName, weather, isOfficeDay, isHoliday, holidayName)`.
   - `getRuleBasedOfficeAdvice(isOfficeDay, weather)`.
   - `getRuleBasedNewsSummary(news, city)`.
6. Build `AgentSources` — record `'ai'` or `'fallback'` per module.
7. Return assembled recommendation object.

**Checkpoint:** All five sub-agents return coherent data when Claude key is absent.

---

### Phase 6 — Master Orchestrator (`/api/briefing/route.ts`)

**Goal:** Coordinate all agents; produce the final `BriefingResponse`.

1. Accept `POST` with `{ location: Location }` body; return 400 if missing.
2. Step 1 — Fan-out: `Promise.allSettled([fetchWeather, fetchNews, fetchCalendarific])`.
3. Step 2 — Extract results with graceful fallbacks for each.
4. Implement `fetchCalendarific(countryCode)`: returns `{ isHoliday, holidayName? }`, silently returns `false` if key is absent.
5. Step 3 — Call `/api/recommend` with all aggregated context.
6. Step 4 — Assemble `BriefingResponse`; merge `AgentSources.news` from orchestrator.
7. Log total duration: `[Orchestrator] Briefing ready in Xms`.
8. Implement `buildFallbackRecommendation()` — used if `/api/recommend` itself fails.
9. All timeouts configurable: `WEATHER_TIMEOUT_MS`, `NEWS_TIMEOUT_MS`, `RECOMMEND_TIMEOUT_MS`.
10. Set `export const maxDuration = 60`.

**Checkpoint:** Full pipeline returns `BriefingResponse` for Chennai with only `ANTHROPIC_API_KEY` set.

---

### Phase 7 — UI Components

**Goal:** Render the complete briefing with live agent status.

1. **`AgentPipeline.tsx`** — accept `AgentMessage[]`; render status dots (running / done / error) per agent.
2. **`WeatherCard.tsx`** — render current conditions + forecast strip; consume `WeatherData`.
3. **`NewsCard.tsx`** — render headline, summary, source, sentiment badge; consume `NewsArticle`.
4. **`ClothingCard.tsx`** — render outfit, items list, accessories, umbrella/jacket/raincoat flags; consume `ClothingRecommendation`.
5. **`SafetyCard.tsx`** — render level badge (colour-coded), summary, alerts list; consume `SafetyAssessment`.
6. **`AIBadge.tsx`** — small badge showing `AI` or `Fallback` source; accepts `AISource` prop.
7. **`ArchitectureDiagram.tsx`** — static diagram matching the architecture in this plan.
8. **`page.tsx`**:
   - On load: show "Get My Briefing" CTA.
   - On click: request `navigator.geolocation`; reverse-geocode via Nominatim.
   - Stream agent status updates to `AgentPipeline` during fetch.
   - On response: render all cards; hide pipeline.
   - On error: show descriptive error state per agent.

**Checkpoint:** Full briefing renders end-to-end in browser on localhost:3000.

---

### Phase 8 — Deployment

1. Push to GitHub; create Vercel project linked to repo.
2. Add all env vars in Vercel dashboard.
3. Set `APP_URL` to the deployed Vercel URL; redeploy.
4. Validate all three news paths and both AI providers on production.

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ Yes | — | Anthropic API key (sk-ant-...) |
| `NEWSDATA_API_KEY` | ❌ Optional | — | NewsData.io key (enables Path A) |
| `CALENDARIFIC_API_KEY` | ❌ Optional | — | Calendarific key (holiday detection) |
| `APP_URL` | ✅ Yes | `http://localhost:3000` | Base URL for internal agent-to-agent HTTP calls |
| `AI_PROVIDER` | ❌ Optional | `anthropic` | `anthropic` or `gemini` |
| `GEMINI_API_KEY` | ❌ Optional | — | Required only when `AI_PROVIDER=gemini` |
| `GEMINI_MODEL` | ❌ Optional | `gemini-1.5-flash` | Gemini model string |
| `WEATHER_TIMEOUT_MS` | ❌ Optional | `10000` | Weather agent HTTP timeout |
| `NEWS_TIMEOUT_MS` | ❌ Optional | `30000` | News agent HTTP timeout |
| `RECOMMEND_TIMEOUT_MS` | ❌ Optional | `45000` | Recommendation agent HTTP timeout |
| `AI_TIMEOUT_MS` | ❌ Optional | `30000` | Per-Claude-call timeout |
| `AI_MAX_RETRIES` | ❌ Optional | `1` | Retry attempts on transient AI errors |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Anthropic API quota exhausted | Medium | Medium | Full rule-based fallback covers all 5 sub-agents |
| NewsData.io rate limit hit | Low | Low | AI-generated news (Path B) is seamless fallback |
| Open-Meteo downtime | Very low | High | Default weather object used; briefing still renders |
| Vercel 60s function timeout | Low | High | Parallel agent execution keeps total well under limit |
| Geolocation permission denied | Medium | High | Descriptive error shown; user prompted to enable |
| Nominatim rate limiting | Low | Medium | Nominatim is only called once per briefing request |
