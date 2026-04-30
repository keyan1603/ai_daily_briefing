'use client'

import type { SafetyAssessment, AISource } from '@/lib/types'
import AIBadge from './AIBadge'

const LEVEL_CONFIG = {
  safe:    { emoji: '✅', label: 'Safe to Go',     badge: 'badge-safe'    },
  caution: { emoji: '⚠️', label: 'Proceed Carefully', badge: 'badge-caution' },
  warning: { emoji: '🔶', label: 'Exercise Caution', badge: 'badge-warning' },
  danger:  { emoji: '🚨', label: 'Stay Alert',     badge: 'badge-danger'  },
}

interface SafetyCardProps {
  safety: SafetyAssessment
  officeAdvice: string
  isOfficeDay: boolean
  safetySrc: AISource
  officeSrc: AISource
}

export default function SafetyCard({ safety, officeAdvice, isOfficeDay, safetySrc, officeSrc }: SafetyCardProps) {
  const cfg = LEVEL_CONFIG[safety.level] ?? LEVEL_CONFIG.safe

  return (
    <div
      className="glass rounded-3xl p-6 reveal reveal-delay-5"
      style={{ border: '1px solid rgba(255, 228, 180, 0.5)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <p className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--ink-faint)' }}>
          Safety & Advice
        </p>
        <AIBadge source={safetySrc} />
      </div>

      {/* Safety level */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{cfg.emoji}</span>
        <div>
          <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${cfg.badge}`}>
            {cfg.label}
          </span>
          <p className="text-sm mt-1.5" style={{ color: 'var(--ink-muted)' }}>
            {safety.summary}
          </p>
        </div>
      </div>

      {/* Alerts */}
      {safety.alerts.length > 0 && (
        <div className="space-y-2 mb-4">
          {safety.alerts.map((alert, i) => (
            <div
              key={i}
              className="flex items-start gap-2 p-2.5 rounded-lg text-xs"
              style={{
                background: 'rgba(234,88,12,0.06)',
                border: '1px solid rgba(234,88,12,0.15)',
                color: 'var(--ink-muted)',
              }}
            >
              <span>⚠️</span>
              <span>{alert}</span>
            </div>
          ))}
        </div>
      )}

      {/* Office advice */}
      <div
        className="rounded-xl p-4"
        style={{
          background: isOfficeDay
            ? 'rgba(99,102,241,0.06)'
            : 'rgba(34,197,94,0.06)',
          border: isOfficeDay
            ? '1px solid rgba(99,102,241,0.15)'
            : '1px solid rgba(34,197,94,0.15)',
        }}
      >
        <p className="text-xs font-mono mb-1.5" style={{ color: 'var(--ink-faint)' }}>
          {isOfficeDay ? '🏢 Office Tip' : '🌿 Day Off Tip'}
        </p>
        <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
          {officeAdvice}
        </p>
      </div>
    </div>
  )
}
