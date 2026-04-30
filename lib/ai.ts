// ============================================================
// AI PROVIDER CLIENT - Anthropic or OpenAI via environment config
// ============================================================

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const OPENAI_RESPONSES_API_URL = 'https://api.openai.com/v1/responses'

const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-20250514'
const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini'

type AIProvider = 'anthropic' | 'openai'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AIOptions {
  system?: string
  maxTokens?: number
  temperature?: number
}

interface OpenAIResponseContent {
  type: string
  text?: string
}

interface OpenAIResponseOutput {
  type: string
  content?: OpenAIResponseContent[]
}

interface OpenAIResponse {
  output_text?: string
  output?: OpenAIResponseOutput[]
}

function getAIProvider(): AIProvider {
  const provider = (process.env.AI_PROVIDER ?? 'anthropic').toLowerCase()

  if (provider === 'anthropic' || provider === 'openai') {
    return provider
  }

  throw new Error('AI_PROVIDER must be either "anthropic" or "openai".')
}

export function getAIProviderName(): string {
  return getAIProvider() === 'openai' ? 'OpenAI' : 'Anthropic'
}

export async function callAI(
  messages: Message[],
  options: AIOptions = {}
): Promise<string> {
  const provider = getAIProvider()

  if (provider === 'openai') {
    return callOpenAI(messages, options)
  }

  return callAnthropic(messages, options)
}

async function callAnthropic(
  messages: Message[],
  options: AIOptions = {}
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    throw new Error('ANTHROPIC_API_KEY is not set. Add it to .env.local or set AI_PROVIDER=openai.')
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? DEFAULT_ANTHROPIC_MODEL,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.7,
      system: options.system,
      messages,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Anthropic API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  return data.content?.[0]?.text ?? ''
}

async function callOpenAI(
  messages: Message[],
  options: AIOptions = {}
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    throw new Error('OPENAI_API_KEY is not set. Add it to .env.local or set AI_PROVIDER=anthropic.')
  }

  const response = await fetch(OPENAI_RESPONSES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL,
      input: messages.map(message => ({
        role: message.role,
        content: message.content,
      })),
      instructions: options.system,
      max_output_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.7,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenAI API error ${response.status}: ${err}`)
  }

  const data = (await response.json()) as OpenAIResponse
  return extractOpenAIText(data)
}

function extractOpenAIText(data: OpenAIResponse): string {
  if (typeof data.output_text === 'string') {
    return data.output_text
  }

  const message = data.output?.find(item => item.type === 'message')
  const text = message?.content?.find(item => item.type === 'output_text')

  return text?.text ?? ''
}

export async function askAI(
  prompt: string,
  system?: string,
  maxTokens = 1024
): Promise<string> {
  return callAI([{ role: 'user', content: prompt }], { system, maxTokens })
}

export function parseJSON<T>(text: string, fallback: T): T {
  try {
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(clean) as T
  } catch {
    return fallback
  }
}
