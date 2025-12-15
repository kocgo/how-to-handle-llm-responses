import { useState, useEffect, useRef, useCallback } from 'react';

interface FpsMetrics {
  current: number;
  avg: number;
  min: number;
  max: number;
  history: number[];
}

const MAX_HISTORY = 120;

/**
 * Hook to measure FPS using requestAnimationFrame
 * Only active when isActive is true (during streaming)
 */
export function useFpsMetrics(isActive: boolean): FpsMetrics {
  const [metrics, setMetrics] = useState<FpsMetrics>({
    current: 60,
    avg: 60,
    min: 60,
    max: 60,
    history: [],
  });

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafIdRef = useRef<number>();
  const historyRef = useRef<number[]>([]);

  const resetMetrics = useCallback(() => {
    historyRef.current = [];
    setMetrics({
      current: 60,
      avg: 60,
      min: 60,
      max: 60,
      history: [],
    });
  }, []);

  useEffect(() => {
    if (!isActive) {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = undefined;
      }
      return;
    }

    resetMetrics();
    frameCountRef.current = 0;
    lastTimeRef.current = performance.now();

    const tick = (now: number) => {
      frameCountRef.current++;
      const elapsed = now - lastTimeRef.current;

      if (elapsed >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / elapsed);
        historyRef.current = [...historyRef.current.slice(-(MAX_HISTORY - 1)), fps];

        const history = historyRef.current;
        const avg = Math.round(history.reduce((a, b) => a + b, 0) / history.length);
        const min = Math.min(...history);
        const max = Math.max(...history);

        setMetrics({ current: fps, avg, min, max, history });
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [isActive, resetMetrics]);

  return metrics;
}
