import type { Metadata } from 'next'
import { SpeedInsights } from "@vercel/speed-insights/next"
import './globals.css'

export const metadata: Metadata = {
  title: 'Daily Briefing — Your AI Morning Companion',
  description:
    'A multi-agent AI system that combines real-time weather, local news, and personalised recommendations to power your day.',
  keywords: ['AI agents', 'weather', 'news', 'daily briefing', 'Next.js', 'Claude'],
  openGraph: {
    title: 'Daily Briefing — AI Morning Companion',
    description: 'Hyper-personalised daily intelligence powered by multi-agent AI.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
