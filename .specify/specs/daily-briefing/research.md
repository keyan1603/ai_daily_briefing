# 🔬 Research — AI Daily Briefing Tech Stack

> Recorded findings from technology investigation prior to `/speckit.plan`.  
> Each section covers why a technology was chosen, version-pinning rationale, and known gotchas.

---

## 1. Next.js 14 App Router

**Version in use:** `next@14.x` (App Router, not Pages Router)

### Why App Router?
The agent-per-route pattern maps directly to Next.js App Router's file-based routing. Each file at `app/api/<agent>/route.ts` becomes an independently deployable serverless function on Vercel with its own timeout budget. The Pages Router equivalent (`pages/api/`) works identically for this use case, but App Router offers cleaner co-location with React Server Components.

### Key findings
- **`export const maxDuration = 60`** is required on any route that calls external AI APIs. Without it, Vercel applies a 10-second default limit on hobby plans.
- **`{ next: { revalidate: N } }`** passed to `fetch()` options enables Next.js data cache. This is how weather (15 min) and news (30 min) caching is implemented — no Redis or external cache required.
- **`NextRequest` / `NextResponse`** are required imports for App Router route handlers; the old `req: Request / res: Response` pattern is Pages Router only.
- Route handlers do **not** support streaming responses in the version used. The briefing is returned as a single JSON payload.

### Gotcha: Internal HTTP calls require `APP_URL`
Agent-to-agent communication (orchestrator calling `/api/weather`, `/api/news`, `/api/recommend`) goes through HTTP. On Vercel this is fine; locally it requires `APP_URL=http://localhost:3000`. Without this env var the orchestrator cannot resolve its own API routes.

---

## 2. Anthropic Claude (`claude-sonnet-4-20250514`)

**Model string:** `claude-sonnet-4-20250514`  
**API version header:** `anthropic-version: 2023-06-01`

### Why Claude Sonnet?
- Produces valid JSON reliably when prompted with "Respond ONLY with valid JSON (no markdown)".
- Fast enough for five parallel sub-agent calls within the 45-second recommend timeout budget.
- Haiku would be faster but less reliable at structured output; Opus is overkill for clothing recommendations.

### JSON output reliability
Claude sometimes wraps JSON in markdown fences (` ```json `) despite the "no markdown" instruction. The `parseJSON<T>` helper in `lib/anthropic.ts` strips these before parsing. This was discovered during early testing and is now a hardened utility.

### Token budget per sub-agent

| Sub-Agent | Max Tokens | Rationale |
|---|---|---|
| Clothing | 600 | Moderate JSON object |
| Safety | 400 | Small object, short alerts |
| Greeting | 300 | Two short strings |
| Office Advice | 200 | Single sentence |
| News Summary | 300 | Two prose sentences |

Total max per briefing: ~1 800 tokens output. At ~$3/M output tokens for Sonnet, this is approximately $0.0054 per full briefing — consistent with the "$0.005 each" estimate in the README.

### Retry behaviour
Transient errors (429 rate limit, 500/502/503/504 server errors, timeouts, ECONNRESET) are retried once (`AI_MAX_RETRIES=1`) after a 600ms delay. Non-transient errors (401 invalid key, 400 bad request) are not retried — they propagate to the agent's fallback path.

---

## 3. Google Gemini (`gemini-1.5-flash`)

**Model string:** `gemini-1.5-flash`  
**API endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`

### Why offer Gemini as an alternative?
Some users may have Gemini API credits but not Anthropic credits, or vice versa. The `AI_PROVIDER=gemini` toggle lets the same codebase serve both without branching.

### Key difference from Claude: no system role
The Gemini API does not support a separate system-role message. The workaround is merging the system prompt into the first user turn:
```typescript
text: i === 0 && options.system
  ? `${options.system}\n\n${m.content}`
  : m.content
```
This was confirmed in the Gemini API documentation (v1beta, May 2026).

### JSON output reliability
Gemini 1.5 Flash is slightly less reliable at strict JSON output than Claude Sonnet. The `parseJSON<T>` helper with fence-stripping covers the most common failure modes.

---

## 4. Open-Meteo

**Endpoint:** `https://api.open-meteo.com/v1/forecast`  
**Authentication:** None required  
**Rate limit:** None documented; reasonable use only

### Why Open-Meteo?
Zero-friction weather data — no API key signup, no rate limit concerns, no cost. Suitable for a portfolio demo where removing setup barriers matters.

### WMO Weather Code mapping
Open-Meteo returns weather as integer codes defined by the World Meteorological Organization. The full mapping table was researched from the [Open-Meteo docs](https://open-meteo.com/en/docs) and implemented in `lib/weather-codes.ts`.

Key codes:
- `0` = Clear sky
- `1–3` = Mainly clear / partly cloudy / overcast
- `45, 48` = Fog
- `51–67` = Drizzle and rain (various intensities)
- `71–77` = Snow
- `80–82` = Rain showers
- `85–86` = Snow showers
- `95` = Thunderstorm (moderate)
- `96, 99` = Thunderstorm with hail

### Caching strategy
`{ next: { revalidate: 900 } }` = 15 minutes. Weather does not change faster than this for a morning briefing use case.

---

## 5. NewsData.io

**Endpoint:** `https://newsdata.io/api/1/news`  
**Free tier:** 200 requests/day  
**Filters used:** `country`, `language=en`, `size=10`

### Why NewsData.io?
Country-level filtering is the primary requirement. NewsData supports `country=in` (India) as a query param, returning English-language articles from Indian publishers. The 200 req/day free tier is adequate for demo use.

### AI ranking layer
Raw NewsData results include articles of mixed relevance. A Claude sub-agent re-ranks the top 10 by local relevance (city > state > national) and adds sentiment labels. This AI step converts a generic news list into a localised briefing component.

### Fallback path (Path B)
When no NewsData key is set, Claude generates plausible news articles using a prompt that specifies: real institutions and landmarks from the user's city, distinct categories (local / weather / transport / economy / health), and a mix of sentiments. Testing showed this produces credible-sounding Chennai articles (Corporation, IMD, Metro) without hallucinating fictional organisations.

---

## 6. Calendarific

**Endpoint:** `https://calendarific.com/api/v2/holidays`  
**Free tier:** 1 000 requests/month  
**Filters used:** `country`, `year`, `month`, `day`

### Usage pattern
Called once per briefing request if the key is set. Returns a list of holidays for the exact date. If the list is non-empty, `isHoliday: true` and the first holiday name are passed to all sub-agents.

### Graceful absence
The orchestrator wraps this call in its own `Promise.allSettled` slot. If the key is absent, the check is skipped and the function returns `{ isHoliday: false }` synchronously — zero network cost, zero blocking.

---

## 7. Nominatim (OpenStreetMap Reverse Geocoding)

**Endpoint:** `https://nominatim.openstreetmap.org/reverse`  
**Authentication:** None  
**Rate limit:** 1 request/second (do not poll)  
**Required header:** `User-Agent` must identify the application

### Usage pattern
Called once in the browser (client-side) after `navigator.geolocation` resolves lat/lon. Returns structured address data including `city`, `state`, `country`, and `country_code`. This is the only client-side external API call — all others are server-side.

### Key finding: `addresstype` field variance
Nominatim returns different field names depending on location granularity (`city`, `town`, `village`, `suburb`). The client code must check all variants and fall back gracefully to `state` or `country` for very rural coordinates.

---

## 8. Vercel (Hosting)

### `maxDuration` requirement
Routes calling AI APIs must declare `export const maxDuration = 60` or they will time out after 10 seconds on Vercel hobby plans. This applies to `/api/news`, `/api/recommend`, and `/api/briefing`.

### Environment variable propagation
Vercel Environment Variables are injected at build time and available at runtime in `process.env`. They are **never** exposed in the browser bundle — Next.js only passes env vars to the client if they are prefixed with `NEXT_PUBLIC_`. None of the API keys in this project use that prefix.

### Redeployment after `APP_URL` update
After the first Vercel deploy, the app URL is known. `APP_URL` must be updated to the Vercel URL and a redeploy triggered, otherwise internal agent-to-agent HTTP calls will fail on the deployed version.

---

## 9. Version Pins (package.json)

```json
{
  "next": "14.x",
  "react": "18.x",
  "react-dom": "18.x",
  "typescript": "5.x",
  "tailwindcss": "3.x",
  "@types/node": "20.x",
  "@types/react": "18.x",
  "@types/react-dom": "18.x",
  "eslint": "8.x",
  "eslint-config-next": "14.x",
  "postcss": "8.x",
  "autoprefixer": "10.x"
}
```

No AI provider SDK is used — all AI calls are raw `fetch()` to avoid SDK version churn and to keep the bundle size minimal (the SDK is server-only anyway, but tree-shaking is simpler with direct fetch).

---

## 10. Decisions Log

| Decision | Alternatives Considered | Rationale |
|---|---|---|
| Raw `fetch()` for AI calls | Anthropic SDK, Vercel AI SDK | No SDK = no version churn; fetch is universal; smaller bundle |
| `Promise.allSettled` everywhere | `Promise.all` | `allSettled` never rejects; one agent failure cannot crash the briefing |
| Rule-based fallbacks in every agent | Error boundary UI only | Silent degradation is better UX than visible errors for a morning companion |
| AI provider toggle via env var | Hard-code Anthropic | Makes the codebase useful to Gemini users; demonstrates provider abstraction |
| Open-Meteo (no key) | OpenWeatherMap, WeatherAPI | Zero friction for demos; removes a setup step for the reader |
| Nominatim (client-side) | Server-side geocoding | Avoids proxying lat/lon through the server; no key management |
