'use client'

import type { ClothingRecommendation, AISource } from '@/lib/types'
import AIBadge from './AIBadge'

interface ClothingCardProps {
  clothing: ClothingRecommendation
  isOfficeDay: boolean
  source: AISource
}

export default function ClothingCard({ clothing, isOfficeDay, source }: ClothingCardProps) {
  const accessories = [
    ...(clothing.umbrella ? ['☂️ Carry umbrella'] : []),
    ...(clothing.raincoat ? ['🧥 Raincoat advised'] : []),
    ...(clothing.jacket ? ['🧣 Bring a jacket'] : []),
    ...clothing.accessories,
  ]

  return (
    <div
      className="glass rounded-3xl p-6 reveal reveal-delay-3"
      style={{ border: '1px solid rgba(255, 228, 180, 0.5)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <p className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--ink-faint)' }}>
              What to Wear
            </p>
            <AIBadge source={source} />
          </div>
          <span
            className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{
              background: isOfficeDay ? 'rgba(99,102,241,0.1)' : 'rgba(249,115,22,0.1)',
              color: isOfficeDay ? '#4338ca' : 'var(--amber-600)',
            }}
          >
            {isOfficeDay ? '🏢 Office Day' : '🏠 Day Off'}
          </span>
        </div>
        <div className="text-4xl">👔</div>
      </div>

      {/* Outfit summary */}
      <p
        className="font-display text-xl mb-3 leading-snug"
        style={{ color: 'var(--clay-700)' }}
      >
        {clothing.outfit}
      </p>

      {/* Reasoning */}
      <p className="text-sm mb-4" style={{ color: 'var(--ink-muted)' }}>
        {clothing.reasoning}
      </p>

      {/* Clothing items */}
      <div className="flex flex-wrap gap-2 mb-4">
        {clothing.items.map((item, i) => (
          <span
            key={i}
            className="text-xs px-3 py-1.5 rounded-full font-medium"
            style={{
              background: 'rgba(194,118,60,0.1)',
              color: 'var(--clay-700)',
              border: '1px solid rgba(194,118,60,0.2)',
            }}
          >
            {item}
          </span>
        ))}
      </div>

      {/* Accessories & alerts */}
      {accessories.length > 0 && (
        <div
          className="rounded-xl p-3 space-y-1.5"
          style={{ background: 'rgba(0,0,0,0.03)' }}
        >
          {accessories.map((a, i) => (
            <p key={i} className="text-xs font-medium" style={{ color: 'var(--ink-muted)' }}>
              {a}
            </p>
          ))}
        </div>
      )}

      {/* Color palette */}
      <p className="text-xs mt-3" style={{ color: 'var(--ink-faint)' }}>
        🎨 Palette: {clothing.colorPalette}
      </p>
    </div>
  )
}
