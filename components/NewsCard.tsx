'use client'

import type { NewsArticle, AISource } from '@/lib/types'
import AIBadge from './AIBadge'

interface NewsCardProps {
  articles: NewsArticle[]
  summary: string
  newsSrc: AISource
  summarySrc: AISource
}

const SENTIMENT_BADGE = {
  positive: { bg: '#dcfce7', color: '#166534', label: '↑ Positive' },
  negative: { bg: '#fee2e2', color: '#991b1b', label: '↓ Negative' },
  neutral:  { bg: '#f3f4f6', color: '#374151', label: '→ Neutral'  },
}

const TIME_AGO = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function NewsCard({ articles, summary, newsSrc, summarySrc }: NewsCardProps) {
  return (
    <div
      className="glass rounded-3xl p-6 reveal reveal-delay-4"
      style={{ border: '1px solid rgba(255, 228, 180, 0.5)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">📰</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--ink-faint)' }}>
              Local Headlines
            </p>
            <AIBadge source={newsSrc} />
          </div>
        </div>
      </div>

      {/* AI-generated summary */}
      <div
        className="rounded-xl p-3.5 mb-5"
        style={{
          background: 'linear-gradient(135deg, rgba(212,168,67,0.12), rgba(249,115,22,0.08))',
          border: '1px solid rgba(212,168,67,0.2)',
        }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <p className="text-xs font-mono uppercase tracking-wide" style={{ color: 'var(--gold)' }}>✨ AI Summary</p>
          <AIBadge source={summarySrc} />
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
          {summary}
        </p>
      </div>

      {/* Articles */}
      <div className="space-y-4">
        {articles.map((article, i) => {
          const badge = SENTIMENT_BADGE[article.sentiment] ?? SENTIMENT_BADGE.neutral
          return (
            <a
              key={i}
              href={article.url !== '#' ? article.url : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
              style={{ cursor: article.url !== '#' ? 'pointer' : 'default' }}
            >
              <div
                className="p-4 rounded-xl transition-all duration-200"
                style={{
                  background: 'rgba(0,0,0,0.02)',
                  border: '1px solid rgba(0,0,0,0.05)',
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3
                    className="text-sm font-semibold leading-snug flex-1"
                    style={{ color: 'var(--ink)' }}
                  >
                    {article.title}
                  </h3>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    {badge.label}
                  </span>
                </div>
                <p className="text-xs mb-2 line-clamp-2" style={{ color: 'var(--ink-muted)' }}>
                  {article.description}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium" style={{ color: 'var(--clay-500)' }}>
                    {article.source}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>
                    · {TIME_AGO(article.publishedAt)}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--ink-faint)' }}
                  >
                    {article.category}
                  </span>
                </div>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
