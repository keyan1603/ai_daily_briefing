// ============================================================
// AI CLIENT — Supports Anthropic Claude OR Google Gemini
// Switch via AI_PROVIDER in .env.local:
//   AI_PROVIDER=gemini   → uses GEMINI_API_KEY
//   AI_PROVIDER=anthropic (default) → uses ANTHROPIC_API_KEY
// ============================================================

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AIOptions {
  system?: string
  maxTokens?: number
  temperature?: number
}

const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS ?? 30000)
const AI_MAX_RETRIES = Number(process.env.AI_MAX_RETRIES ?? 1)

async function fetchWithTimeout(url: string, options: RequestInit = {}, ms = AI_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`AI request timed out after ${ms}ms`)
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= AI_MAX_RETRIES; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (attempt >= AI_MAX_RETRIES || !isTransientAIError(error)) break
      await new Promise(resolve => setTimeout(resolve, 600 * (attempt + 1)))
    }
  }

  throw lastError
}

function isTransientAIError(error: unknown) {
  if (!(error instanceof Error)) return false
  return /timed out|429|500|502|503|504|ECONNRESET|ETIMEDOUT/i.test(error.message)
}

// ── Anthropic ──────────────────────────────────────────────
async function callAnthropic(messages: Message[], options: AIOptions): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    throw new Error('ANTHROPIC_API_KEY is not set in .env.local')
  }

  const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.7,
      system: options.system,
      messages,
    }),
  })

  if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

// ── Gemini ─────────────────────────────────────────────────
async function callGemini(messages: Message[], options: AIOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not set in .env.local')
  }

  const model = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash'

  // Merge system prompt into first user turn (Gemini doesn't have a system role)
  const contents = messages.map((m, i) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{
      text: i === 0 && options.system
        ? `${options.system}\n\n${m.content}`
        : m.content,
    }],
  }))

  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 1024,
        },
      }),
    }
  )

  if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

// ── Router — picks provider from env ───────────────────────
export async function callClaude(messages: Message[], options: AIOptions = {}): Promise<string> {
  const provider = (process.env.AI_PROVIDER ?? 'anthropic').toLowerCase()
  return withRetry(() => (
    provider === 'gemini'
      ? callGemini(messages, options)
      : callAnthropic(messages, options)
  ))
}

// Convenience: single user prompt
export async function askClaude(prompt: string, system?: string, maxTokens = 1024): Promise<string> {
  return callClaude([{ role: 'user', content: prompt }], { system, maxTokens })
}

// Parse JSON safely from any model's response
export function parseJSON<T>(text: string, fallback: T): T {
  try {
    const withoutFences = text
      .replace(/```(?:json)?/gi, '')
      .replace(/```/g, '')
      .trim()
    const start = Math.min(
      ...[withoutFences.indexOf('{'), withoutFences.indexOf('[')].filter(i => i >= 0)
    )
    const end = Math.max(withoutFences.lastIndexOf('}'), withoutFences.lastIndexOf(']'))
    const clean = start >= 0 && end >= start
      ? withoutFences.slice(start, end + 1)
      : withoutFences
    return JSON.parse(clean) as T
  } catch {
    return fallback
  }
}
