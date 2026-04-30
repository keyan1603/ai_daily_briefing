// ============================================================
// SHARED TYPES — Daily Briefing Agent System
// ============================================================

export interface Location {
  lat: number
  lon: number
  city: string
  state: string
  country: string
  countryCode: string
  locality?: string
}

export interface WeatherData {
  temperature: number
  feelsLike: number
  humidity: number
  windSpeed: number
  weatherCode: number
  description: string
  icon: string
  uvIndex: number
  precipitation: number
  isRaining: boolean
  forecast: WeatherForecast[]
}

export interface WeatherForecast {
  date: string
  maxTemp: number
  minTemp: number
  precipitationChance: number
  weatherCode: number
}

export interface NewsArticle {
  title: string
  description: string
  url: string
  source: string
  publishedAt: string
  sentiment: 'positive' | 'negative' | 'neutral'
  category: string
  relevanceScore: number
}

export interface HolidayInfo {
  isHoliday: boolean
  holidayName?: string
  holidayType?: string
}

export interface SafetyAssessment {
  isSafe: boolean
  level: 'safe' | 'caution' | 'warning' | 'danger'
  summary: string
  alerts: string[]
}

export interface ClothingRecommendation {
  outfit: string
  items: string[]
  accessories: string[]
  reasoning: string
  colorPalette: string
  umbrella: boolean
  jacket: boolean
  raincoat: boolean
}

export type AISource = 'ai' | 'fallback'

export interface AgentSources {
  clothing: AISource
  safety: AISource
  greeting: AISource
  officeAdvice: AISource
  newsSummary: AISource
  news: AISource
}

export interface BriefingResponse {
  greeting: string
  dayContext: string
  weather: WeatherData
  holiday: HolidayInfo
  clothing: ClothingRecommendation
  safety: SafetyAssessment
  news: NewsArticle[]
  newsSummary: string
  officeAdvice: string
  generatedAt: string
  location: Location
  sources: AgentSources
}

export interface AgentMessage {
  agentName: string
  status: 'running' | 'done' | 'error'
  result?: unknown
  error?: string
  durationMs?: number
}
