# 🏛️ Project Constitution — AI Daily Briefing

> Governing principles and development guidelines for the AI Daily Briefing multi-agent system.  
> All development phases — specification, planning, implementation — must adhere to these principles.

---

## 1. Mission Statement

Build a hyper-personalised, AI-powered morning companion that delivers a reliable, graceful, and culturally aware daily briefing to users anywhere in the world. The system must work end-to-end even when individual agents fail, third-party APIs are unavailable, or AI quota is exhausted.

---

## 2. Core Principles

### 2.1 Reliability Over Perfection

- Every agent must have a **rule-based fallback**. A briefing that degrades gracefully is always better than one that crashes entirely.
- Use `Promise.allSettled()` — never `Promise.all()` — when fanning out to multiple agents or sub-agents. One failure must never propagate.
- Timeouts are mandatory on all external HTTP calls. No call should ever hang indefinitely.
- Log all agent failures with structured labels (e.g., `[ClothingAgent]`) so failures are observable without crashing the system.

### 2.2 Privacy First

- Location data (lat/lon, city, state, country) is **never persisted**. It is accepted per-request and discarded after the briefing is generated.
- API keys are **server-side only**. No secret may appear in client-side code, browser bundles, or environment variables prefixed without the Next.js server guard.
- `.env.local` must always be git-ignored. `.env.example` (with placeholder values) is the only file safe to commit.

### 2.3 AI as Enhancement, Not Dependency

- The application must render a **complete, usable briefing** even if the Anthropic API has zero credits.
- Rule-based fallbacks must produce output that is contextually coherent (weather-aware, day-aware, city-aware) — not generic placeholder text.
- Source attribution (`'ai' | 'fallback'`) must be tracked per-module in `AgentSources` and surfaced in the API response.

### 2.4 Separation of Concerns

- Each Next.js API route is a **single agent** with a single responsibility:
  - `/api/weather` — fetches and normalises weather only.
  - `/api/news` — fetches, ranks, and returns news only.
  - `/api/recommend` — consumes weather + news, runs sub-agents, returns recommendations only.
  - `/api/briefing` — orchestrates the above and assembles the final briefing only.
- No agent calls another agent's internal functions directly. Communication is always via HTTP, so agents remain independently deployable and replaceable.

### 2.5 Type Safety Throughout

- **No `any`** types. Every data structure flowing across agent boundaries must be defined in `lib/types.ts`.
- All Claude API responses must be parsed through `parseJSON<T>(raw, fallback)`. Never assume Claude returns valid JSON.
- TypeScript strict mode is on. Compile errors block deployment.

### 2.6 Cultural and Contextual Awareness

- Greeting copy, clothing advice, safety alerts, and office guidance must be sensitive to the user's **actual location** (city, state, country). Generic global copy is not acceptable when location is known.
- Date and time formatting must respect the locale: use `en-IN` for India by default, but keep the code locale-parameterisable for future expansion.
- Holiday detection must influence tone across all sub-agents (greeting, clothing, office advice).

### 2.7 Performance

- Weather and news fetches run **in parallel** in the orchestrator. Sequential fetching of independent data is a bug.
- All five Claude sub-agents in `/api/recommend` run in parallel via `Promise.allSettled()`.
- HTTP responses from stable external APIs must be cached at the edge where appropriate (e.g., weather: 15 min, news: 30 min). Cache durations are set via Next.js `revalidate`.
- `maxDuration` is set on all API routes that call external AI or data APIs. Vercel free-tier limits must be respected.

### 2.8 Observability

- Every agent logs its own status on success and failure using a consistent prefix format: `[AgentName]`.
- The orchestrator logs total pipeline duration in milliseconds.
- `AgentSources` in the briefing response provides per-module AI vs fallback attribution visible to the client.

---

## 3. Technology Governance

| Concern | Decision | Rationale |
|---|---|---|
| Framework | Next.js 14 App Router | File-based routing maps cleanly to agent-per-route architecture |
| Language | TypeScript (strict) | Type safety across agent boundaries prevents silent data corruption |
| AI Provider | Anthropic Claude Sonnet (primary), Gemini (optional) | Switchable via `AI_PROVIDER` env var; no hard coupling |
| Styling | Tailwind CSS + custom CSS | Utility-first for speed; custom CSS for bespoke card designs |
| Weather API | Open-Meteo | Free, no key required — zero operational risk |
| News API | NewsData.io (optional) → AI-generated → static fallback | Three-tier degradation |
| Geolocation | Browser Geolocation API + Nominatim reverse geocoding | Free, no key required |
| Hosting | Vercel | Zero-config Next.js deploy; free tier sufficient for personal use |
| Secret Management | Vercel Environment Variables | Encrypted at rest; never in source |

---

## 4. Code Quality Standards

- **No hardcoded secrets.** Any API key literal in source code is a blocking issue.
- **No `console.log` in client components.** Server-side agent logs only.
- **Fallbacks must be data-driven.** A fallback that ignores `weather.temperature` or `location.city` is incomplete.
- **JSON parsing is always defensive.** Wrap Claude responses in `parseJSON<T>(raw, fallback)`. Never `JSON.parse()` raw Claude output directly.
- **Environment variable access is validated at call time**, not at module load. Check for the placeholder value (e.g., `=== 'your_anthropic_api_key_here'`) and throw a descriptive error early.
- **All async operations on external APIs include a timeout.** Use `AbortController` + `setTimeout`. The timeout values are configurable via environment variables.
- **Retry logic applies only to transient errors** (429, 500, 502, 503, 504, timeouts). Do not retry on 400/401/403.

---

## 5. User Experience Principles

- The loading state must communicate **which agent is currently running** so the user understands the system is working, not broken.
- Cards must degrade individually. If the clothing card has no data, it shows a graceful empty state — it does not hide the entire briefing.
- All copy must feel human. AI-sourced and fallback-sourced copy should be indistinguishable to the end user in quality.
- The architecture diagram is a first-class educational feature. It must remain accurate as the system evolves.

---

## 6. Development Workflow Principles

- **Branch per feature.** No direct commits to `main`.
- **Environment parity.** Local `.env.local` must mirror the same variable names as Vercel Environment Variables. No local-only variables without a corresponding documented entry in `.env.example`.
- **The README is the contract.** Every environment variable, every optional key, and every deployment step must be documented in `README.md`. Undocumented config is forbidden.
- **Spec before code.** Functional requirements are written before implementation begins. Implementation that drifts from spec must update the spec first.

---

## 7. Extensibility Constraints

- Adding a new agent (e.g., a calendar agent, a commute agent) must follow the existing pattern: a new `/api/<agent>/route.ts` with its own fallback, its own type definitions in `lib/types.ts`, and its own `AgentSources` key.
- The `AI_PROVIDER` abstraction in `lib/anthropic.ts` must remain the only place where AI provider routing logic lives. Sub-agents must call `askClaude()`, never a provider SDK directly.
- New environment variables must be optional with documented fallback behaviour, or the app must fail fast at startup with a clear message.
