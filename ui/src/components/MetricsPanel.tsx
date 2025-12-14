import React from 'react'
import { FpsCounter } from './FpsCounter'

interface MetricsPanelProps {
  charCount: number
  isStreaming: boolean
  isPending?: boolean
  isStale?: boolean
}

export function MetricsPanel({
  charCount,
  isStreaming,
  isPending,
  isStale,
}: MetricsPanelProps) {
  return (
    <div className="metrics-panel">
      <div className="metrics-row">
        <FpsCounter />
        <div className="metric">
          <span className="metric-value">{charCount}</span>
          <span className="metric-label">Chars</span>
        </div>
        <div className="metric">
          <span
            className={`status-indicator ${isStreaming ? 'streaming' : 'idle'}`}
          >
            {isStreaming ? 'Streaming' : 'Idle'}
          </span>
        </div>
      </div>
      {(isPending !== undefined || isStale !== undefined) && (
        <div className="metrics-row state-indicators">
          {isPending !== undefined && (
            <div className={`state-badge ${isPending ? 'active' : ''}`}>
              <span className="state-dot" />
              isPending: {isPending ? 'true' : 'false'}
            </div>
          )}
          {isStale !== undefined && (
            <div className={`state-badge ${isStale ? 'active' : ''}`}>
              <span className="state-dot" />
              isStale: {isStale ? 'true' : 'false'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
