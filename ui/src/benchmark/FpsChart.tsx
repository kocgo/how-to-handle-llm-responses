import React, { memo, useMemo } from 'react';

interface FpsChartProps {
  history: number[];
  current: number;
  width?: number;
  height?: number;
}

function getColor(fps: number): string {
  if (fps >= 50) return '#22c55e';
  if (fps >= 30) return '#eab308';
  return '#ef4444';
}

function FpsChartInner({ history, current, width = 100, height = 32 }: FpsChartProps) {
  const values = history.length ? history : [current, current];
  const color = getColor(current);

  const { points, lastY } = useMemo(() => {
    const maxVal = Math.max(...values, 60);
    const minVal = Math.min(...values, 0);
    const range = Math.max(maxVal - minVal, 1);

    const pts = values
      .map((v, i) => {
        const x = (i / (values.length - 1 || 1)) * width;
        const y = height - ((v - minVal) / range) * height;
        return `${x},${y}`;
      })
      .join(' ');

    const lastVal = values[values.length - 1];
    const ly = height - ((lastVal - minVal) / range) * height;

    return { points: pts, lastY: ly };
  }, [values, width, height]);

  return (
    <div className="fps-chart" style={{ width, height }}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx={width} cy={lastY} r="3" fill={color} />
      </svg>
    </div>
  );
}

export const FpsChart = memo(FpsChartInner);
