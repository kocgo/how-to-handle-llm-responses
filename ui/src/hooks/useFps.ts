import { useState, useEffect, useRef } from 'react'

export function useFps(): number {
  const [fps, setFps] = useState(60)
  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())
  const rafIdRef = useRef<number>()

  useEffect(() => {
    const tick = (now: number) => {
      frameCountRef.current++

      const elapsed = now - lastTimeRef.current

      // Update FPS every second
      if (elapsed >= 1000) {
        const currentFps = Math.round((frameCountRef.current * 1000) / elapsed)
        setFps(currentFps)
        frameCountRef.current = 0
        lastTimeRef.current = now
      }

      rafIdRef.current = requestAnimationFrame(tick)
    }

    rafIdRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [])

  return fps
}
