'use client'

import { useState, useCallback } from 'react'
import type { BriefingResponse, Location } from '@/lib/types'
import AgentPipeline from '@/components/AgentPipeline'
import WeatherCard from '@/components/WeatherCard'
import ClothingCard from '@/components/ClothingCard'
import NewsCard from '@/components/NewsCard'
import SafetyCard from '@/components/SafetyCard'
import ArchitectureDiagram from '@/components/ArchitectureDiagram'

type AgentStatus = 'idle' | 'running' | 'done' | 'error'

const PIPELINE_STEPS = [
  { id: 'location', label: 'Location Agent',       description: 'Detecting your GPS coordinates' },
  { id: 'weather',  label: 'Weather Agent',         description: 'Fetching from Open-Meteo API'   },
  { id: 'news',     label: 'News Agent',            description: 'Gathering & ranking local news'  },
  { id: 'recommend',label: 'Recommendation Agent',  description: '5 Claude sub-agents in parallel' },
  { id: 'assemble', label: 'Assembling Briefing',   description: 'Compiling your personalised report' },
]

export default function HomePage() {
  const [phase, setPhase] = useState<'landing' | 'loading' | 'briefing' | 'error'>('landing')
  const [briefing, setBriefing] = useState<BriefingResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [duration, setDuration] = useState<number>(0)
  const [agentSteps, setAgentSteps] = useState(
    PIPELINE_STEPS.map(s => ({ ...s, status: 'idle' as AgentStatus }))
  )

  const setStep = (id: string, status: AgentStatus) => {
    setAgentSteps(prev =>
      prev.map(s => (s.id === id ? { ...s, status } : s))
    )
  }

  const getBriefing = useCallback(async () => {
    setPhase('loading')
    setAgentSteps(PIPELINE_STEPS.map(s => ({ ...s, status: 'idle' as AgentStatus })))

    try {
      // Step 1: Geolocation
      setStep('location', 'running')
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, {
          timeout: 10000,
          enableHighAccuracy: true,
        })
      )
      const { latitude: lat, longitude: lon } = pos.coords
      setStep('location', 'done')

      // Reverse geocode (OpenStreetMap Nominatim — free, no key)
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
      )
      const geoData = await geoRes.json()
      const addr = geoData.address ?? {}

      const location: Location = {
        lat,
        lon,
        city:        addr.city ?? addr.town ?? addr.village ?? 'Chennai',
        state:       addr.state ?? 'Tamil Nadu',
        country:     addr.country ?? 'India',
        countryCode: (addr.country_code ?? 'in').toUpperCase(),
        locality:    addr.suburb ?? addr.neighbourhood ?? '',
      }

      // Step 2 & 3: Weather + News (shown as running simultaneously)
      setStep('weather', 'running')
      setStep('news', 'running')

      // Step 4: Recommendation (Claude agents)
      setStep('recommend', 'running')

      // Step 5: Assemble (full orchestration call)
      setStep('assemble', 'running')

      const t0 = Date.now()
      const resp = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location }),
      })

      if (!resp.ok) {
        const err = await resp.json()
        throw new Error(err.error ?? 'Briefing failed')
      }

      const result = await resp.json()
      if (!result.success) throw new Error(result.error ?? 'Unknown error')

      // Mark all done
      setStep('weather', 'done')
      setStep('news', 'done')
      setStep('recommend', 'done')
      setStep('assemble', 'done')

      setDuration(result.durationMs ?? Date.now() - t0)
      setBriefing(result.data)

      // Small delay so user sees the completed pipeline
      await new Promise(r => setTimeout(r, 800))
      setPhase('briefing')

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setErrorMsg(msg)
      setPhase('error')
    }
  }, [])

  // ── LANDING ──────────────────────────────────────────────────────────────
  if (phase === 'landing') {
    return (
      <main className="min-h-screen bg-morning flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-xl w-full text-center">
          {/* Logo mark */}
          <div className="mb-8 flex justify-center">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
              style={{
                background: 'linear-gradient(135deg, #fde68a, #fb923c)',
                boxShadow: '0 8px 32px rgba(249,115,22,0.25)',
              }}
            >
              🌅
            </div>
          </div>

          <h1
            className="font-display text-5xl md:text-6xl mb-4 leading-tight"
            style={{ color: 'var(--clay-900)' }}
          >
            Daily Briefing
          </h1>

          <p className="text-lg mb-2" style={{ color: 'var(--ink-muted)' }}>
            Your AI-powered morning companion
          </p>
          <p className="text-sm mb-10" style={{ color: 'var(--ink-faint)' }}>
            Weather · News · Clothing · Safety · All in one glance
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {[
              '🌤 Live Weather',
              '📰 Local News',
              '👔 Outfit Advice',
              '🛡 Safety Check',
              '🤖 5 AI Agents',
            ].map(f => (
              <span
                key={f}
                className="text-xs px-3.5 py-1.5 rounded-full font-medium"
                style={{
                  background: 'rgba(212,168,67,0.12)',
                  color: 'var(--clay-700)',
                  border: '1px solid rgba(212,168,67,0.25)',
                }}
              >
                {f}
              </span>
            ))}
          </div>

          {/* CTA button */}
          <button
            onClick={getBriefing}
            className="group relative px-10 py-4 rounded-2xl text-white font-semibold text-lg transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, var(--amber-500), var(--clay-500))',
              boxShadow: '0 8px 30px rgba(249,115,22,0.35)',
            }}
          >
            <span className="relative z-10">Get My Briefing</span>
            <div
              className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'linear-gradient(135deg, var(--clay-500), var(--amber-600))' }}
            />
          </button>

          <p className="text-xs mt-4" style={{ color: 'var(--ink-faint)' }}>
            Requires location access · Data stays on your device
          </p>

          {/* Architecture note */}
          <div
            className="mt-12 p-4 rounded-2xl text-left"
            style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}
          >
            <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--ink-faint)' }}>
              Agent Architecture
            </p>
            <p className="text-xs" style={{ color: 'var(--ink-muted)', lineHeight: 1.7 }}>
              This app demonstrates <strong>agent-to-agent communication</strong>: a master orchestrator
              fans out to 3 data agents (Weather, News, Holiday), then passes results to 5 parallel
              Claude sub-agents (Clothing, Safety, Greeting, Office Advice, News Summary) — all running
              concurrently via <code className="font-mono text-xs">Promise.allSettled()</code>.
            </p>
          </div>
        </div>
      </main>
    )
  }

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <main className="min-h-screen bg-morning flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <div className="text-5xl mb-4" style={{ animation: 'float 2s ease-in-out infinite' }}>
              🌅
            </div>
            <h2 className="font-display text-3xl mb-2" style={{ color: 'var(--clay-900)' }}>
              Preparing your briefing
            </h2>
            <p className="text-sm" style={{ color: 'var(--ink-faint)' }}>
              5 AI agents working in parallel…
            </p>
          </div>
          <AgentPipeline steps={agentSteps} />
        </div>
      </main>
    )
  }

  // ── ERROR ─────────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <main className="min-h-screen bg-morning flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="font-display text-2xl mb-3" style={{ color: 'var(--clay-900)' }}>
            Something went wrong
          </h2>
          <p className="text-sm mb-6 p-3 rounded-xl font-mono" style={{
            color: 'var(--ink-muted)', background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.15)',
          }}>
            {errorMsg}
          </p>
          <button
            onClick={() => setPhase('landing')}
            className="px-8 py-3 rounded-xl text-white font-medium"
            style={{ background: 'var(--amber-500)' }}
          >
            Try Again
          </button>
          <p className="text-xs mt-4" style={{ color: 'var(--ink-faint)' }}>
            Make sure ANTHROPIC_API_KEY is set in .env.local
          </p>
        </div>
      </main>
    )
  }

  // ── BRIEFING ──────────────────────────────────────────────────────────────
  if (!briefing) return null

  const b = briefing
  const timeStr = new Date(b.generatedAt).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <main className="min-h-screen bg-morning px-4 py-8 pb-16">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <header className="mb-8 reveal">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: 'var(--ink-faint)' }}>
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <h1 className="font-display text-4xl leading-tight" style={{ color: 'var(--clay-900)' }}>
                Good morning
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--ink-muted)' }}>
                📍 {b.location.city}{b.location.locality ? `, ${b.location.locality}` : ''}
              </p>
            </div>
            <button
              onClick={() => setPhase('landing')}
              className="text-xs px-3.5 py-2 rounded-xl font-medium transition-all hover:scale-105"
              style={{
                background: 'rgba(0,0,0,0.05)',
                color: 'var(--ink-muted)',
              }}
            >
              ↺ Refresh
            </button>
          </div>
        </header>

        {/* Greeting card */}
        <div
          className="glass rounded-3xl p-6 mb-4 reveal reveal-delay-1"
          style={{
            background: 'linear-gradient(135deg, rgba(253,230,138,0.4), rgba(249,115,22,0.15))',
            border: '1px solid rgba(212,168,67,0.35)',
          }}
        >
          <p className="font-display text-xl leading-relaxed mb-2" style={{ color: 'var(--clay-900)' }}>
            {b.greeting}
          </p>
          <p className="text-sm italic" style={{ color: 'var(--clay-500)' }}>
            {b.dayContext}
          </p>
          {b.holiday.isHoliday && (
            <div
              className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium"
              style={{ background: 'rgba(212,168,67,0.2)', color: 'var(--clay-700)' }}
            >
              🎉 {b.holiday.holidayName}
            </div>
          )}
        </div>

        {/* Cards grid */}
        <div className="space-y-4">
          <WeatherCard weather={b.weather} city={b.location.city} />
          <ClothingCard
            clothing={b.clothing}
            isOfficeDay={!b.holiday.isHoliday && new Date().getDay() > 0 && new Date().getDay() < 6}
            source={b.sources?.clothing ?? 'fallback'}
          />
          <NewsCard
            articles={b.news}
            summary={b.newsSummary}
            newsSrc={b.sources?.news ?? 'fallback'}
            summarySrc={b.sources?.newsSummary ?? 'fallback'}
          />
          <SafetyCard
            safety={b.safety}
            officeAdvice={b.officeAdvice}
            isOfficeDay={!b.holiday.isHoliday && new Date().getDay() > 0 && new Date().getDay() < 6}
            safetySrc={b.sources?.safety ?? 'fallback'}
            officeSrc={b.sources?.officeAdvice ?? 'fallback'}
          />
          <ArchitectureDiagram />
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center reveal">
          <p className="text-xs font-mono" style={{ color: 'var(--ink-faint)' }}>
            Generated in {(duration / 1000).toFixed(1)}s by 5 AI agents · {timeStr}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--ink-faint)' }}>
            Weather: Open-Meteo · News: NewsData.io · AI: Claude Sonnet
          </p>
        </footer>
      </div>
    </main>
  )
}
