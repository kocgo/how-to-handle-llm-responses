import React from 'react'
import { FpsCounter } from './FpsCounter'

interface MetricsPanelProps {
  charCount: number
  isStreaming: boolean
  isPending?: boolean
  isStale?: boolean
  fpsHistory: number[]
  currentFps: number
  elapsedMs: number
}

const formatElapsed = (ms: number): string => {
  if (!ms) {
    return '00:00.0'
  }
  const totalSeconds = ms / 1000
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds - minutes * 60
  const minuteString = String(minutes).padStart(2, '0')
  const secondString = seconds.toFixed(1).padStart(4, '0')
  return `${minuteString}:${secondString}`
}

export function MetricsPanel({
  charCount,
  isStreaming,
  isPending,
  isStale,
  fpsHistory,
  currentFps,
  elapsedMs,
}: MetricsPanelProps) {
  const timerLabel = isStreaming ? 'Elapsed Time' : elapsedMs > 0 ? 'Last Run Time' : 'Elapsed Time'

  return (
    <div className="metrics-panel">
      <div className="metrics-row">
        <FpsCounter history={fpsHistory} currentFps={currentFps} />
        <div className="metric timer-metric">
          <span className="metric-value">{formatElapsed(elapsedMs)}</span>
          <span className="metric-label">{timerLabel}</span>
        </div>
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
