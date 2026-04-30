'use client'

export default function ArchitectureDiagram() {
  return (
    <div
      className="glass rounded-3xl p-6 reveal reveal-delay-6"
      style={{ border: '1px solid rgba(255, 228, 180, 0.5)' }}
    >
      <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: 'var(--ink-faint)' }}>
        Agent Architecture
      </p>

      <div className="overflow-x-auto">
        <svg viewBox="0 0 640 200" width="100%" style={{ minWidth: 420 }}>
          <defs>
            <marker id="arch-arrow" viewBox="0 0 10 10" refX="8" refY="5"
              markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" fill="none" stroke="#c2763c" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round"/>
            </marker>
          </defs>

          {/* User node */}
          <g>
            <rect x="20" y="76" width="90" height="48" rx="10"
              fill="rgba(253,246,238,0.8)" stroke="#c2763c" strokeWidth="1"/>
            <text x="65" y="96" textAnchor="middle" fontSize="10"
              fill="#5c4a3a" fontFamily="DM Sans, sans-serif" fontWeight="500">
              👤 You
            </text>
            <text x="65" y="112" textAnchor="middle" fontSize="9"
              fill="#8a7060" fontFamily="DM Mono, monospace">
              Browser
            </text>
          </g>

          {/* Arrow: User → Orchestrator */}
          <line x1="110" y1="100" x2="158" y2="100"
            stroke="#c2763c" strokeWidth="1.2" markerEnd="url(#arch-arrow)"/>

          {/* Orchestrator */}
          <g>
            <rect x="160" y="64" width="110" height="72" rx="12"
              fill="rgba(212,168,67,0.12)" stroke="#d4a843" strokeWidth="1.5"/>
            <text x="215" y="87" textAnchor="middle" fontSize="10"
              fill="#3d1a09" fontFamily="DM Sans, sans-serif" fontWeight="600">
              🤖 Orchestrator
            </text>
            <text x="215" y="103" textAnchor="middle" fontSize="9"
              fill="#7c3d1e" fontFamily="DM Mono, monospace">
              /api/briefing
            </text>
            <text x="215" y="117" textAnchor="middle" fontSize="8"
              fill="#8a7060" fontFamily="DM Sans, sans-serif">
              Coordinates agents
            </text>
            <text x="215" y="129" textAnchor="middle" fontSize="8"
              fill="#8a7060" fontFamily="DM Sans, sans-serif">
              Aggregates results
            </text>
          </g>

          {/* Arrows from orchestrator to agents */}
          <line x1="270" y1="88" x2="348" y2="56"
            stroke="#c2763c" strokeWidth="1" strokeDasharray="4 2"
            markerEnd="url(#arch-arrow)"/>
          <line x1="270" y1="100" x2="348" y2="100"
            stroke="#c2763c" strokeWidth="1" strokeDasharray="4 2"
            markerEnd="url(#arch-arrow)"/>
          <line x1="270" y1="112" x2="348" y2="144"
            stroke="#c2763c" strokeWidth="1" strokeDasharray="4 2"
            markerEnd="url(#arch-arrow)"/>

          {/* Sub-agents */}
          {[
            { y: 30, label: '🌤 Weather Agent', sub: 'Open-Meteo API' },
            { y: 74, label: '📰 News Agent',    sub: 'NewsData.io + AI' },
            { y: 118, label: '✨ Recommend AI',  sub: 'Claude (5 calls)' },
          ].map(({ y, label, sub }) => (
            <g key={label}>
              <rect x="350" y={y} width="120" height="40" rx="8"
                fill="rgba(253,246,238,0.7)" stroke="#c2763c" strokeWidth="0.8"/>
              <text x="410" y={y + 16} textAnchor="middle" fontSize="9"
                fill="#3d1a09" fontFamily="DM Sans, sans-serif" fontWeight="500">
                {label}
              </text>
              <text x="410" y={y + 30} textAnchor="middle" fontSize="8"
                fill="#8a7060" fontFamily="DM Mono, monospace">
                {sub}
              </text>
            </g>
          ))}

          {/* Arrow: Recommend → Claude API */}
          <line x1="470" y1="138" x2="538" y2="138"
            stroke="#c2763c" strokeWidth="1" strokeDasharray="4 2"
            markerEnd="url(#arch-arrow)"/>

          {/* Claude API */}
          <g>
            <rect x="540" y="114" width="88" height="48" rx="10"
              fill="rgba(99,102,241,0.08)" stroke="rgba(99,102,241,0.4)" strokeWidth="1"/>
            <text x="584" y="134" textAnchor="middle" fontSize="9"
              fill="#4338ca" fontFamily="DM Sans, sans-serif" fontWeight="500">
              Claude API
            </text>
            <text x="584" y="148" textAnchor="middle" fontSize="8"
              fill="#6366f1" fontFamily="DM Mono, monospace">
              Sonnet 4
            </text>
            <text x="584" y="156" textAnchor="middle" fontSize="7"
              fill="#8a7060" fontFamily="DM Sans, sans-serif">
              5 agents parallel
            </text>
          </g>

          {/* Labels */}
          <text x="320" y="190" textAnchor="middle" fontSize="8"
            fill="#8a7060" fontFamily="DM Mono, monospace">
            All agent calls run concurrently via Promise.allSettled()
          </text>
        </svg>
      </div>
    </div>
  )
}
