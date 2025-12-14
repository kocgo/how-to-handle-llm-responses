import React, { memo } from 'react'
import { useFps } from '../hooks/useFps'

function FpsCounterInner() {
  const fps = useFps()

  const getColor = (fps: number): string => {
    if (fps >= 50) return '#22c55e' // Green
    if (fps >= 30) return '#eab308' // Yellow
    return '#ef4444' // Red
  }

  return (
    <div className="fps-counter" style={{ color: getColor(fps) }}>
      <span className="fps-value">{fps}</span>
      <span className="fps-label">FPS</span>
    </div>
  )
}

export const FpsCounter = memo(FpsCounterInner)
