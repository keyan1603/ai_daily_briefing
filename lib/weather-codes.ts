// WMO Weather Interpretation Codes → human-readable descriptions
export const WEATHER_CODES: Record<number, { description: string; icon: string }> = {
  0:  { description: 'Clear sky', icon: '☀️' },
  1:  { description: 'Mainly clear', icon: '🌤️' },
  2:  { description: 'Partly cloudy', icon: '⛅' },
  3:  { description: 'Overcast', icon: '☁️' },
  45: { description: 'Foggy', icon: '🌫️' },
  48: { description: 'Icy fog', icon: '🌫️' },
  51: { description: 'Light drizzle', icon: '🌦️' },
  53: { description: 'Moderate drizzle', icon: '🌦️' },
  55: { description: 'Dense drizzle', icon: '🌧️' },
  61: { description: 'Slight rain', icon: '🌧️' },
  63: { description: 'Moderate rain', icon: '🌧️' },
  65: { description: 'Heavy rain', icon: '🌧️' },
  66: { description: 'Freezing rain', icon: '🌨️' },
  67: { description: 'Heavy freezing rain', icon: '🌨️' },
  71: { description: 'Slight snowfall', icon: '❄️' },
  73: { description: 'Moderate snowfall', icon: '❄️' },
  75: { description: 'Heavy snowfall', icon: '❄️' },
  77: { description: 'Snow grains', icon: '🌨️' },
  80: { description: 'Slight showers', icon: '🌦️' },
  81: { description: 'Moderate showers', icon: '🌧️' },
  82: { description: 'Violent showers', icon: '⛈️' },
  85: { description: 'Slight snow showers', icon: '🌨️' },
  86: { description: 'Heavy snow showers', icon: '🌨️' },
  95: { description: 'Thunderstorm', icon: '⛈️' },
  96: { description: 'Thunderstorm w/ hail', icon: '⛈️' },
  99: { description: 'Thunderstorm w/ heavy hail', icon: '⛈️' },
}

export function getWeatherInfo(code: number) {
  return WEATHER_CODES[code] ?? { description: 'Unknown', icon: '🌡️' }
}

export function isRainy(code: number): boolean {
  return [51,53,55,61,63,65,66,67,71,73,75,80,81,82,95,96,99].includes(code)
}

export function formatTemp(celsius: number): string {
  return `${Math.round(celsius)}°C`
}

export function getDayName(date?: Date): string {
  const d = date ?? new Date()
  return d.toLocaleDateString('en-IN', { weekday: 'long' })
}

export function isWeekend(date?: Date): boolean {
  const d = date ?? new Date()
  const day = d.getDay()
  return day === 0 || day === 6
}
