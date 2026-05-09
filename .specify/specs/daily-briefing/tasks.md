# ✅ Task Breakdown — AI Daily Briefing (001-daily-briefing)

> Generated from `plan.md` · Each task maps to a user story in `spec.md`  
> `[P]` = can run in parallel with other `[P]` tasks in the same phase  
> `[→ filename]` = primary file(s) affected

---

## Phase 1 — Project Scaffold & Shared Types

_Dependency: none — start here_

- [ ] **T-01** · Initialise Next.js 14 project with TypeScript and Tailwind CSS  
  `[→ package.json, next.config.js, tailwind.config.js, postcss.config.js]`

- [ ] **T-02** · Configure `tsconfig.json`: `strict: true`, `@/` path alias pointing to project root  
  `[→ tsconfig.json]`

- [ ] **T-03** · Create `.env.example` with all variable names and placeholder values  
  `[→ .env.example]`

- [ ] **T-04** · Add `.env.local` to `.gitignore`; add `.vs/` and `node_modules/`  
  `[→ .gitignore]`

- [ ] **T-05** · Define all shared TypeScript interfaces in `lib/types.ts`:  
  `Location`, `WeatherData`, `WeatherForecast`, `NewsArticle`, `HolidayInfo`,  
  `ClothingRecommendation`, `SafetyAssessment`, `AgentSources`, `BriefingResponse`, `AgentMessage`, `AISource`  
  `[→ lib/types.ts]`

**Checkpoint 1:** `npx tsc --noEmit` passes with zero errors.

---

## Phase 2 — AI Provider Abstraction

_Dependency: T-05 (types must exist)_

- [ ] **T-06** · Implement `fetchWithTimeout(url, options, ms)` using `AbortController`  
  `[→ lib/anthropic.ts]`

- [ ] **T-07** · Implement `callAnthropic(messages, options)`: POST to `/v1/messages`, validate key, throw on non-200  
  `[→ lib/anthropic.ts]`

- [ ] **T-08** · Implement `callGemini(messages, options)`: POST to Generative Language API, merge system prompt into first user turn  
  `[→ lib/anthropic.ts]`

- [ ] **T-09** · Implement `callClaude(messages, options)` router: reads `AI_PROVIDER`, delegates to Anthropic or Gemini  
  `[→ lib/anthropic.ts]`

- [ ] **T-10** · Implement `askClaude(prompt, system?, maxTokens?)` convenience wrapper  
  `[→ lib/anthropic.ts]`

- [ ] **T-11** · Implement `parseJSON<T>(text, fallback)`: strip markdown fences, find JSON bounds `{...}` or `[...]`, safe `JSON.parse`; return `fallback` on any error  
  `[→ lib/anthropic.ts]`

- [ ] **T-12** · Implement `withRetry<T>(operation)`: retry up to `AI_MAX_RETRIES` on transient errors (429 / 5xx / timeout / ECONNRESET); exponential backoff  
  `[→ lib/anthropic.ts]`

**Checkpoint 2:** Call `askClaude('Return {"ok":true}')` with a valid key → parses to `{ ok: true }`. Call with invalid key → throws descriptive error.

---

## Phase 3 — Weather Agent

_Dependency: T-05 · [P] with Phase 4_

- [ ] **T-13** · Create `lib/weather-codes.ts`: map WMO codes 0–99 to `{ description: string, icon: string }`; export `getWeatherInfo(code)` and `isRainy(code)` and `getDayName()` and `isWeekend()`  
  `[→ lib/weather-codes.ts]`

- [ ] **T-14** · Implement `GET /api/weather/route.ts`:  
  — Accept `lat`, `lon` query params; return `400` if missing  
  — Fetch Open-Meteo with `current` + `daily` fields; set `{ next: { revalidate: 900 } }`  
  — Map to `WeatherData` type using `getWeatherInfo` and `isRainy`  
  — Return `{ success: true, data: WeatherData }`  
  — Catch all errors; return `{ error }` with status 500  
  `[→ app/api/weather/route.ts]`

**Checkpoint 3:** `GET /api/weather?lat=13.08&lon=80.27` → valid `WeatherData` for Chennai.

---

## Phase 4 — News Agent

_Dependency: T-10, T-11 · [P] with Phase 3_

- [ ] **T-15** · Implement Path A in `GET /api/news/route.ts`: fetch from NewsData.io; call `askClaude` to rank + sentiment-label; return top 3 as `NewsArticle[]` with `source: 'newsdata'`  
  `[→ app/api/news/route.ts]`

- [ ] **T-16** · Implement Path B in `GET /api/news/route.ts`: when no key or Path A fails; call `askClaude` to generate 3 realistic local articles; return with `source: 'ai-generated'`  
  `[→ app/api/news/route.ts]`

- [ ] **T-17** · Implement Path C (static fallback): 3 hardcoded articles adapted to `city` param; return with `source: 'static'`; used when Claude is also unavailable  
  `[→ app/api/news/route.ts]`

**Checkpoint 4:** All three paths return 3 valid `NewsArticle[]` objects (test by toggling env vars on/off).

---

## Phase 5 — Recommendation Agent (5 Sub-Agents)

_Dependency: T-10, T-11, T-13 · Must run after Phase 3+4 types confirmed_

- [ ] **T-18** · Define `RecommendPayload` interface; parse and validate POST body  
  `[→ app/api/recommend/route.ts]`

- [ ] **T-19** · Write Sub-Agent A prompt (Clothing): include temperature, feels-like, description, humidity, UV, wind, day type, holiday name; request JSON matching `ClothingRecommendation`  
  `[→ app/api/recommend/route.ts]`

- [ ] **T-20** · Write Sub-Agent B prompt (Safety): include full weather data + news headlines with sentiment; request JSON matching `SafetyAssessment`  
  `[→ app/api/recommend/route.ts]`

- [ ] **T-21** · Write Sub-Agent C prompt (Greeting): include city, day name, temperature, condition, holiday/weekend/workday context; request `{ greeting, dayContext }`  
  `[→ app/api/recommend/route.ts]`

- [ ] **T-22** · Write Sub-Agent D prompt (Office Advice): include isOfficeDay, city, weather summary, rain flag; request `{ officeAdvice }`  
  `[→ app/api/recommend/route.ts]`

- [ ] **T-23** · Write Sub-Agent E prompt (News Summary): include article titles; request `{ summary }` as 2-sentence prose  
  `[→ app/api/recommend/route.ts]`

- [ ] **T-24** · Run all five prompts in `Promise.allSettled([askClaude×5])`; parse each result with `parseJSON<T>(raw, fallback)`  
  `[→ app/api/recommend/route.ts]`

- [ ] **T-25** · Implement `getRuleBasedClothing(weather, isOfficeDay)`: hot ≥ 30 °C / cool < 22 °C / mild branches; include umbrella/jacket/raincoat logic  
  `[→ app/api/recommend/route.ts]`

- [ ] **T-26** · Implement `getRuleBasedSafety(weather, news)`: weatherCode ≥ 95 = warning; UV ≥ 9 = caution; negative news count = caution; generate 1–3 alerts  
  `[→ app/api/recommend/route.ts]`

- [ ] **T-27** · Implement `getRuleBasedGreeting(dayName, weather, isOfficeDay, isHoliday, holidayName)`: time-of-day salutation + day-type branch  
  `[→ app/api/recommend/route.ts]`

- [ ] **T-28** · Implement `getRuleBasedOfficeAdvice(isOfficeDay, weather)` and `getRuleBasedNewsSummary(news, city)`  
  `[→ app/api/recommend/route.ts]`

- [ ] **T-29** · Build `AgentSources` object: record `'ai'` when AI result parsed successfully, `'fallback'` otherwise  
  `[→ app/api/recommend/route.ts]`

- [ ] **T-30** · Return assembled response; log any sub-agent failures with `[AgentName]` prefix  
  `[→ app/api/recommend/route.ts]`

**Checkpoint 5:** All five sub-agents return coherent data with `ANTHROPIC_API_KEY` unset (rule-based fallback path).

---

## Phase 6 — Master Orchestrator

_Dependency: Phase 3, 4, 5 complete_

- [ ] **T-31** · Implement `fetchWithTimeout` helper in orchestrator (separate from lib version; uses `AbortController`)  
  `[→ app/api/briefing/route.ts]`

- [ ] **T-32** · Step 1: fan-out `Promise.allSettled([fetchWeather, fetchNews, fetchCalendarific])` in parallel  
  `[→ app/api/briefing/route.ts]`

- [ ] **T-33** · Implement `fetchCalendarific(countryCode)`: calls Calendarific API if key set; returns `{ isHoliday: false }` silently if key absent or call fails  
  `[→ app/api/briefing/route.ts]`

- [ ] **T-34** · Step 2: extract and validate each settled result with typed fallbacks (`getDefaultWeather()`, `[]`, `{ isHoliday: false }`)  
  `[→ app/api/briefing/route.ts]`

- [ ] **T-35** · Step 3: POST to `/api/recommend` with all aggregated context; handle non-OK response with `buildFallbackRecommendation()`  
  `[→ app/api/briefing/route.ts]`

- [ ] **T-36** · Implement `buildFallbackRecommendation(weather, news, location, isHoliday, holidayName)`: full rule-based briefing used when `/api/recommend` itself fails  
  `[→ app/api/briefing/route.ts]`

- [ ] **T-37** · Step 4: assemble `BriefingResponse`; merge `AgentSources.news` from orchestrator's own news-source tracking  
  `[→ app/api/briefing/route.ts]`

- [ ] **T-38** · Log `[Orchestrator] Briefing ready in Xms`; set `export const maxDuration = 60`  
  `[→ app/api/briefing/route.ts]`

**Checkpoint 6:** Full pipeline returns `BriefingResponse` with `sources` populated for Chennai with only `ANTHROPIC_API_KEY` set.

---

## Phase 7 — UI Components

_Dependency: Phase 6 complete (API contracts finalised) · [P] tasks can run together_

- [ ] **T-39** `[P]` · Implement `AIBadge.tsx`: accept `source: AISource`; render small `AI` (green) or `Fallback` (amber) badge  
  `[→ components/AIBadge.tsx]`

- [ ] **T-40** `[P]` · Implement `WeatherCard.tsx`: current conditions block + 5-day forecast strip; consume `WeatherData`  
  `[→ components/WeatherCard.tsx]`

- [ ] **T-41** `[P]` · Implement `NewsCard.tsx`: headline, description, source, time-ago, sentiment badge; consume `NewsArticle`  
  `[→ components/NewsCard.tsx]`

- [ ] **T-42** `[P]` · Implement `ClothingCard.tsx`: outfit summary, items list, accessories, umbrella/jacket/raincoat icons, colour palette, reasoning paragraph; consume `ClothingRecommendation`  
  `[→ components/ClothingCard.tsx]`

- [ ] **T-43** `[P]` · Implement `SafetyCard.tsx`: level badge (colour-coded by level), summary sentence, alerts list; consume `SafetyAssessment`  
  `[→ components/SafetyCard.tsx]`

- [ ] **T-44** `[P]` · Implement `AgentPipeline.tsx`: accept `AgentMessage[]`; render step list with animated status dots (`running` → spinner, `done` → ✓, `error` → ✗)  
  `[→ components/AgentPipeline.tsx]`

- [ ] **T-45** `[P]` · Implement `ArchitectureDiagram.tsx`: static diagram matching plan.md architecture; update if agents change  
  `[→ components/ArchitectureDiagram.tsx]`

- [ ] **T-46** · Implement `app/page.tsx`:  
  — Initial state: CTA button  
  — On click: `navigator.geolocation.getCurrentPosition()` → Nominatim reverse geocode → set `Location`  
  — Show `AgentPipeline` with running status; POST to `/api/briefing`  
  — On success: render all cards; dismiss pipeline  
  — On geolocation denied: show descriptive error  
  — On API error: show per-agent error state  
  `[→ app/page.tsx]`

- [ ] **T-47** · Style globals: CSS custom properties for card colours, safety level colours, sentiment badge colours; Tailwind base overrides  
  `[→ app/globals.css]`

**Checkpoint 7:** Full briefing renders end-to-end in browser on `localhost:3000` — all six cards visible, pipeline animates during load.

---

## Phase 8 — Deployment & Validation

_Dependency: Checkpoint 7 passed_

- [ ] **T-48** · Push to GitHub; create Vercel project; link to repository

- [ ] **T-49** · Add all env vars in Vercel dashboard; set `APP_URL` to deployed Vercel URL; trigger first deploy

- [ ] **T-50** · Post-deploy smoke test: verify all three news paths (`newsdata` / `ai-generated` / `static`) by toggling env vars in Vercel

- [ ] **T-51** · Post-deploy smoke test: verify `AI_PROVIDER=gemini` path with `GEMINI_API_KEY` set

- [ ] **T-52** · Verify `CALENDARIFIC_API_KEY` holiday detection on a known holiday date for country `IN`

- [ ] **T-53** · Add `APP_URL` to `.env.example` with deploy instruction comment

---

## Task Summary

| Phase | Tasks | Notes |
|---|---|---|
| 1 — Scaffold | T-01 → T-05 | Sequential; foundation for all phases |
| 2 — AI Abstraction | T-06 → T-12 | Sequential within phase |
| 3 — Weather Agent | T-13, T-14 | [P] with Phase 4 |
| 4 — News Agent | T-15 → T-17 | [P] with Phase 3 |
| 5 — Recommend Agent | T-18 → T-30 | Largest phase; 5 sub-agents |
| 6 — Orchestrator | T-31 → T-38 | Depends on 3, 4, 5 |
| 7 — UI Components | T-39 → T-47 | [P] tasks within phase |
| 8 — Deployment | T-48 → T-53 | Final validation gate |
| **Total** | **53 tasks** | |
