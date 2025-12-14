import { useEffect, useMemo, useRef, useState } from 'react'
import { animate } from 'framer-motion'

const DELIMITER = ''

export function useAnimatedText(text: string, enabled: boolean): string {
  const segments = useMemo(() => text.split(DELIMITER), [text])
  const totalSegments = segments.length
  const [cursor, setCursor] = useState(totalSegments)
  const cursorRef = useRef(cursor)
  const prevTextRef = useRef(text)

  useEffect(() => {
    cursorRef.current = cursor
  }, [cursor])

  useEffect(() => {
    if (!enabled) {
      setCursor(totalSegments)
      prevTextRef.current = text
      return
    }

    const previousText = prevTextRef.current
    const startingCursor =
      previousText && text.startsWith(previousText) ? cursorRef.current : 0

    prevTextRef.current = text

    const duration =
      totalSegments === startingCursor
        ? 0
        : Math.max(0.35, Math.min(6, (totalSegments - startingCursor) / 25))

    const controls = animate(startingCursor, totalSegments, {
      duration,
      ease: 'easeOut',
      onUpdate(latest) {
        setCursor(Math.min(totalSegments, Math.floor(latest)))
      },
    })

    return () => controls.stop()
  }, [text, totalSegments, enabled])

  if (!enabled) {
    return text
  }

  return segments.slice(0, Math.min(cursor, totalSegments)).join(DELIMITER)
}
