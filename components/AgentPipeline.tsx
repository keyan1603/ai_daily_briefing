'use client'

interface AgentStep {
  id: string
  label: string
  description: string
  status: 'idle' | 'running' | 'done' | 'error'
}

interface AgentPipelineProps {
  steps: AgentStep[]
}

const ICONS: Record<string, string> = {
  location: '📍',
  weather: '🌤',
  news: '📰',
  recommend: '🤖',
  assemble: '✨',
}

export default function AgentPipeline({ steps }: AgentPipelineProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      <p className="text-center text-sm font-mono mb-6" style={{ color: 'var(--ink-faint)' }}>
        Agent pipeline initialising…
      </p>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div
            key={step.id}
            className="flex items-center gap-4 p-3 rounded-xl transition-all duration-300"
            style={{
              background:
                step.status === 'running'
                  ? 'rgba(249,115,22,0.08)'
                  : step.status === 'done'
                  ? 'rgba(34,197,94,0.06)'
                  : 'rgba(0,0,0,0.02)',
              border:
                step.status === 'running'
                  ? '1px solid rgba(249,115,22,0.2)'
                  : step.status === 'done'
                  ? '1px solid rgba(34,197,94,0.2)'
                  : '1px solid rgba(0,0,0,0.05)',
            }}
          >
            {/* Step number / check */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 transition-all duration-300"
              style={{
                background:
                  step.status === 'done'
                    ? '#22c55e'
                    : step.status === 'running'
                    ? 'var(--amber-500)'
                    : step.status === 'error'
                    ? '#ef4444'
                    : 'var(--clay-100)',
                color:
                  step.status === 'idle'
                    ? 'var(--ink-faint)'
                    : 'white',
              }}
            >
              {step.status === 'done' ? '✓' : step.status === 'error' ? '✕' : i + 1}
            </div>

            {/* Labels */}
            <div className="flex-1 min-w-0">
              <div
                className="text-sm font-medium"
                style={{
                  color:
                    step.status === 'idle' ? 'var(--ink-faint)' : 'var(--ink)',
                }}
              >
                {ICONS[step.id] ?? '⚙️'} {step.label}
              </div>
              <div className="text-xs truncate" style={{ color: 'var(--ink-faint)' }}>
                {step.description}
              </div>
            </div>

            {/* Status indicator */}
            <div className="flex-shrink-0">
              {step.status === 'running' && (
                <div className="flex gap-1">
                  {[0, 1, 2].map(j => (
                    <div
                      key={j}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: 'var(--amber-500)',
                        animation: `dotPulse 0.8s ease-in-out ${j * 0.15}s infinite`,
                      }}
                    />
                  ))}
                </div>
              )}
              {step.status === 'done' && (
                <span className="text-xs font-mono" style={{ color: '#22c55e' }}>
                  done
                </span>
              )}
              {step.status === 'error' && (
                <span className="text-xs font-mono" style={{ color: '#ef4444' }}>
                  error
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
