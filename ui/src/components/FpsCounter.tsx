import React, { memo, useMemo } from 'react'

interface FpsCounterProps {
  history: number[]
  currentFps: number
}

function getColor(fps: number): string {
  if (fps >= 50) return '#22c55e'
  if (fps >= 30) return '#eab308'
  return '#ef4444'
}

function FpsCounterInner({ history, currentFps }: FpsCounterProps) {
  const values = history.length
    ? history
    : currentFps
      ? [currentFps]
      : []
  const chartValues = values.length > 1 ? values : values.length === 1 ? [values[0], values[0]] : [currentFps || 0, currentFps || 0]
  const lastValue = values.length ? values[values.length - 1] : currentFps || 0
  const color = getColor(lastValue)

  const { points, lastY } = useMemo(() => {
    const maxValue = Math.max(...chartValues, 60)
    const minValue = Math.min(...chartValues, 0)
    const range = Math.max(maxValue - minValue, 1)
    const computedPoints = chartValues
      .map((value, index) => {
        const x = (index / (chartValues.length - 1 || 1)) * CHART_WIDTH
        const normalized = (value - minValue) / range
        const y = CHART_HEIGHT - normalized * CHART_HEIGHT
        return `${x},${y}`
      })
      .join(' ')
    const finalY = (() => {
      const value = chartValues[chartValues.length - 1]
      const normalized = (value - minValue) / range
      return CHART_HEIGHT - normalized * CHART_HEIGHT
    })()

    return { points: computedPoints, lastY: finalY }
  }, [chartValues])

  return (
    <div className="fps-counter">
      <div className="fps-chart">
        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="none" role="presentation">
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle cx={CHART_WIDTH} cy={lastY} r="3" fill={color} />
        </svg>
      </div>
      <div className="fps-meta" style={{ color }}>
        <span className="fps-value">{lastValue}</span>
        <span className="fps-label">FPS</span>
      </div>
    </div>
  )
}

export const FpsCounter = memo(FpsCounterInner)
const CHART_WIDTH = 140
const CHART_HEIGHT = 40
