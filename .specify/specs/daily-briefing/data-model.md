# 🗄️ Data Model — AI Daily Briefing

> Source of truth for all TypeScript interfaces across agent boundaries.  
> All types are defined in `lib/types.ts` and imported by API routes and components.

---

## Core Entities

### `Location`

The resolved geographic context for the current briefing request. Captured once per request from the browser Geolocation API + Nominatim reverse geocoding. Never persisted.

```typescript
interface Location {
  lat: number           // Decimal degrees, e.g. 13.0827
  lon: number           // Decimal degrees, e.g. 80.2707
  city: string          // e.g. "Chennai"
  state: string         // e.g. "Tamil Nadu"
  country: string       // e.g. "India"
  countryCode: string   // ISO 3166-1 alpha-2, e.g. "IN"
  locality?: string     // Neighbourhood / suburb, optional
}
```

**Constraints:**
- `lat` must be in range `[-90, 90]`.
- `lon` must be in range `[-180, 180]`.
- `city`, `state`, `country`, `countryCode` must be non-empty strings.
- `locality` is optional; may be absent for rural coordinates.

---

### `WeatherData`

Current weather conditions as fetched from Open-Meteo and normalised by the Weather Agent. Passed to all Claude sub-agents as context.

```typescript
interface WeatherData {
  temperature: number      // °C, current (temperature_2m)
  feelsLike: number        // °C, apparent temperature
  humidity: number         // %, relative humidity (0–100)
  windSpeed: number        // km/h (wind_speed_10m)
  weatherCode: number      // WMO Weather Code (0–99)
  description: string      // Human-readable, e.g. "Partly cloudy"
  icon: string             // Emoji icon, e.g. "⛅"
  uvIndex: number          // UV Index (0–11+)
  precipitation: number    // mm, current hour precipitation
  isRaining: boolean       // true when weatherCode indicates rain/drizzle
  forecast: WeatherForecast[]  // 5-day daily forecast
}
```

**Derived fields:**
- `description` and `icon` are derived from `weatherCode` via `lib/weather-codes.ts`.
- `isRaining` is `true` for WMO codes: 51–67, 80–82, 95–96, 99.

**Default value** (used when Open-Meteo is unavailable):
```typescript
{
  temperature: 32, feelsLike: 36, humidity: 68, windSpeed: 12,
  weatherCode: 2, description: 'Partly cloudy', icon: '⛅',
  uvIndex: 7, precipitation: 0, isRaining: false, forecast: []
}
```

---

### `WeatherForecast`

One day in the 5-day forecast strip.

```typescript
interface WeatherForecast {
  date: string                   // ISO date string, e.g. "2026-05-09"
  maxTemp: number                // °C daily maximum
  minTemp: number                // °C daily minimum
  precipitationChance: number    // %, max probability in day (0–100)
  weatherCode: number            // WMO code for the day
}
```

---

### `NewsArticle`

A single news article as returned by the News Agent after AI ranking and sentiment labelling.

```typescript
interface NewsArticle {
  title: string                          // Article headline
  description: string                    // 2–3 sentence summary
  url: string                            // Full article URL (or "#" for generated)
  source: string                         // Publisher name, e.g. "The Hindu"
  publishedAt: string                    // ISO 8601 datetime string
  sentiment: 'positive' | 'negative' | 'neutral'
  category: string                       // e.g. "local" | "weather" | "transport" | "economy" | "health"
  relevanceScore: number                 // 0–100; higher = more relevant to user's city
}
```

**Relevance ranking priority (descending):**
1. Local city news
2. State-level news
3. National news
4. Weather and safety
5. Business and economy

---

### `HolidayInfo`

Result of Calendarific holiday detection for the user's country and today's date.

```typescript
interface HolidayInfo {
  isHoliday: boolean
  holidayName?: string    // e.g. "Diwali" — present only when isHoliday is true
  holidayType?: string    // e.g. "National", "Regional" — optional
}
```

**Fallback:** `{ isHoliday: false }` when key is absent or API call fails.

---

### `ClothingRecommendation`

Output of Sub-Agent A (Clothing). Drives the clothing card UI.

```typescript
interface ClothingRecommendation {
  outfit: string          // One-line summary, e.g. "Light breathable cotton for the heat"
  items: string[]         // 2–4 specific items, e.g. ["Cotton shirt", "Linen trousers"]
  accessories: string[]   // 0–3 accessories, e.g. ["Sunglasses", "Sunscreen SPF 50"]
  reasoning: string       // 2-sentence explanation referencing actual weather data
  colorPalette: string    // e.g. "Whites, pastels, light neutrals"
  umbrella: boolean       // true when isRaining or precipitation > 2mm
  jacket: boolean         // true when temperature < 22°C
  raincoat: boolean       // true when isRaining and precipitation > 5mm
}
```

---

### `SafetyAssessment`

Output of Sub-Agent B (Safety). Drives the safety card UI.

```typescript
interface SafetyAssessment {
  isSafe: boolean                                        // false only when level is 'danger'
  level: 'safe' | 'caution' | 'warning' | 'danger'
  summary: string                                        // One clear sentence about safety today
  alerts: string[]                                       // 0–3 specific, actionable alerts
}
```

**Level thresholds (rule-based fallback):**

| Condition | Level |
|---|---|
| weatherCode ≥ 95 (thunderstorm) | `warning` |
| UV index ≥ 9 OR ≥ 2 negative news articles | `caution` |
| Otherwise | `safe` |

---

### `AgentSources`

Tracks which modules were served by Claude AI vs the rule-based fallback. Included in every `BriefingResponse` for transparency.

```typescript
type AISource = 'ai' | 'fallback'

interface AgentSources {
  clothing: AISource
  safety: AISource
  greeting: AISource
  officeAdvice: AISource
  newsSummary: AISource
  news: AISource        // 'ai' for newsdata/ai-generated paths; 'fallback' for static
}
```

---

### `BriefingResponse`

The complete assembled briefing returned by `POST /api/briefing`. This is the single payload rendered by the frontend.

```typescript
interface BriefingResponse {
  greeting: string          // Sub-Agent C output
  dayContext: string        // Sub-Agent C output (day energy/mood line)
  weather: WeatherData
  holiday: HolidayInfo
  clothing: ClothingRecommendation
  safety: SafetyAssessment
  news: NewsArticle[]       // Top 3, ranked by relevance
  newsSummary: string       // Sub-Agent E output (2-sentence prose)
  officeAdvice: string      // Sub-Agent D output
  generatedAt: string       // ISO 8601 timestamp of briefing generation
  location: Location
  sources: AgentSources
}
```

---

### `AgentMessage`

Real-time status message from the backend pipeline to the frontend `AgentPipeline` component.

```typescript
interface AgentMessage {
  agentName: string                          // e.g. "Weather Agent"
  status: 'running' | 'done' | 'error'
  result?: unknown                           // Optional resolved data
  error?: string                             // Error message if status is 'error'
  durationMs?: number                        // Time taken in ms, set on 'done'
}
```

---

## Data Flow Diagram

```
Browser Geolocation API
        │
        ▼ lat/lon
Nominatim Reverse Geocoder
        │
        ▼ Location
POST /api/briefing
        │
        ├──────────────────────────────────┐
        ▼                                  ▼
GET /api/weather                   GET /api/news
        │                                  │
        ▼ WeatherData                      ▼ NewsArticle[]
        └──────────────────────────────────┤
                                           │
                               GET Calendarific
                                           │
                                           ▼ HolidayInfo
                               POST /api/recommend
                                           │
                    ┌──────────────────────┤
                    ▼          ▼           ▼           ▼          ▼
             ClothingRec  SafetyAss   {greeting,  {officeAdv} {summary}
                                       dayContext}
                    └──────────────────────┤
                                           ▼
                                   BriefingResponse
                                           │
                                           ▼
                                    page.tsx (render)
```

---

## Type Guards & Validation Rules

| Field | Validation |
|---|---|
| `Location.lat` | Must be number in `[-90, 90]`; return 400 if missing |
| `Location.lon` | Must be number in `[-180, 180]`; return 400 if missing |
| All Claude JSON responses | Always parsed via `parseJSON<T>(raw, fallback)`; never `JSON.parse()` directly |
| `SafetyAssessment.level` | Must be cast as `'safe' \| 'caution' \| 'warning' \| 'danger'` in rule-based path |
| `NewsArticle.sentiment` | Must be one of `'positive' \| 'negative' \| 'neutral'` |
| `AgentSources.*` | Must be `'ai' \| 'fallback'` — no other values |
