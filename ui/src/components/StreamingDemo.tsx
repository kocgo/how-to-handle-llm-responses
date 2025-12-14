import React, {
  useState,
  useRef,
  useCallback,
  useTransition,
  useDeferredValue,
  useEffect,
  useMemo,
} from 'react'
import { fetchStream } from '../utils/stream'
import { MetricsPanel } from './MetricsPanel'
import { MarkdownRenderer } from './MarkdownRenderer'
import { PlainTextRenderer } from './PlainTextRenderer'
import { HybridRenderer } from './HybridRenderer'
import { useFps } from '../hooks/useFps'
import { parseTaggedSegments, TaggedSegment } from '../utils/segments'
import { Level, BatchStrategy, StreamChunk } from '../types'

interface StreamingDemoProps {
  level: Level
  batchStrategy: BatchStrategy
  useTransition: boolean
  useDeferredValue: boolean
  useWindowing?: boolean
}

type HybridSegment = TaggedSegment & { key: string }

const WINDOW_SIZE = 4000 // Characters to render at a time
const WINDOW_BUFFER = 1000 // Extra buffer above/below
const LINE_HEIGHT = 24 // Approximate line height in pixels
const CHARS_PER_LINE = 80 // Approximate characters per line
const MAX_FPS_HISTORY = 120

export function StreamingDemo({
  level,
  batchStrategy,
  useTransition: shouldUseTransition,
  useDeferredValue: shouldUseDeferredValue,
  useWindowing = false,
}: StreamingDemoProps) {
  const [text, setText] = useState('')
  const [isPending, startTransition] = useTransition()
  const deferredText = useDeferredValue(text)
  const isStale = text !== deferredText
  const displayText = shouldUseDeferredValue ? deferredText : text
  const currentFps = useFps()
  const [fpsHistory, setFpsHistory] = useState<number[]>([])
  const [elapsedMs, setElapsedMs] = useState(0)

  const [isStreaming, setIsStreaming] = useState(false)
  const [wordCount, setWordCount] = useState(1000000)
  const [delay, setDelay] = useState(1)
  const [inputValue, setInputValue] = useState('')
  const [outputTab, setOutputTab] = useState<'text' | 'markdown' | 'hybrid'>('hybrid')
  const [scrollTop, setScrollTop] = useState(0)

  const abortControllerRef = useRef<AbortController | null>(null)
  const bufferRef = useRef('')
  const rafIdRef = useRef<number>()
  const outputContentRef = useRef<HTMLDivElement>(null)
  const timerStartRef = useRef<number | null>(null)
  const timerRafRef = useRef<number>()

  useEffect(() => {
    const container = outputContentRef.current
    if (!container) {
      return
    }

    container.scrollTop = container.scrollHeight
    if (useWindowing) {
      setScrollTop(container.scrollTop)
    }
  }, [displayText, useWindowing])

  useEffect(() => {
    if (!isStreaming) {
      return
    }
    setFpsHistory((prev) => {
      const next = [...prev, currentFps]
      if (next.length > MAX_FPS_HISTORY) {
        return next.slice(next.length - MAX_FPS_HISTORY)
      }
      return next
    })
  }, [currentFps, isStreaming])

  const handleReset = useCallback(() => {
    setText('')
    bufferRef.current = ''
    setScrollTop(0)
    setFpsHistory([])
    setElapsedMs(0)
    if (timerRafRef.current) {
      cancelAnimationFrame(timerRafRef.current)
      timerRafRef.current = undefined
    }
    timerStartRef.current = null
  }, [])

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = undefined
    }
    setIsStreaming(false)
  }, [])

  const handleStart = useCallback(() => {
    handleReset()
    setIsStreaming(true)

    abortControllerRef.current = new AbortController()

    const updateText = (newText: string) => {
      if (shouldUseTransition) {
        startTransition(() => {
          setText(newText)
        })
      } else {
        setText(newText)
      }
    }

    const onChunk = (chunk: StreamChunk) => {
      if (batchStrategy === 'none') {
        // Level 1: Naive - setState on every chunk
        setText((prev) => prev + chunk.content)
      } else if (batchStrategy === 'raf') {
        // Levels 2-6: Batch with requestAnimationFrame
        bufferRef.current += chunk.content

        if (!rafIdRef.current) {
          rafIdRef.current = requestAnimationFrame(() => {
            const snapshot = bufferRef.current
            updateText(snapshot)
            rafIdRef.current = undefined
          })
        }
      }
    }

    const onDone = () => {
      // Flush any remaining buffer
      if (batchStrategy !== 'none' && bufferRef.current) {
        updateText(bufferRef.current)
      }
      setIsStreaming(false)
    }

    const onError = (error: Error) => {
      console.error('Stream error:', error)
      setIsStreaming(false)
    }

    fetchStream({
      words: wordCount,
      delay,
      signal: abortControllerRef.current.signal,
      onChunk,
      onDone,
      onError,
    })
  }, [wordCount, delay, batchStrategy, shouldUseTransition, handleReset])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleStop()
    }
  }, [handleStop])

  useEffect(() => {
    if (isStreaming) {
      timerStartRef.current = performance.now()
      const tick = () => {
        if (timerStartRef.current === null) {
          return
        }
        setElapsedMs(performance.now() - timerStartRef.current)
        timerRafRef.current = requestAnimationFrame(tick)
      }
      timerRafRef.current = requestAnimationFrame(tick)
      return () => {
        if (timerRafRef.current) {
          cancelAnimationFrame(timerRafRef.current)
          timerRafRef.current = undefined
        }
      }
    } else {
      if (timerRafRef.current) {
        cancelAnimationFrame(timerRafRef.current)
        timerRafRef.current = undefined
      }
      if (timerStartRef.current !== null) {
        setElapsedMs(performance.now() - timerStartRef.current)
        timerStartRef.current = null
      }
    }
  }, [isStreaming])

  const segmentsWithOffsets = useMemo(() => {
    const parsed = parseTaggedSegments(displayText)
    return parsed.map((segment, index) => ({
      ...segment,
      key: `${segment.type}-${index}-${segment.start}`,
    }))
  }, [displayText])

  // Windowing logic
  const charsPerPixel = 0.12 // Approximate characters per pixel height
  const totalHeight = useWindowing ? displayText.length / charsPerPixel : 0

  const {
    windowedText,
    windowStart,
    windowEnd,
    renderOffset,
    visibleSegments,
    hybridWindowText,
  } = useMemo(() => {
    if (!useWindowing || !displayText) {
      return {
        windowedText: displayText,
        windowStart: 0,
        windowEnd: displayText.length,
        renderOffset: 0,
        visibleSegments: segmentsWithOffsets,
        hybridWindowText: displayText,
      }
    }

    const startChar = Math.max(0, Math.floor(scrollTop * charsPerPixel) - WINDOW_BUFFER)
    const endChar = Math.min(
      displayText.length,
      startChar + WINDOW_SIZE + WINDOW_BUFFER * 2
    )

    const rawSlice = displayText.slice(startChar, endChar)
    const overlappingSegments = segmentsWithOffsets.filter(
      (segment) => segment.end > startChar && segment.start < endChar
    )

    const trimmedSegments = overlappingSegments
      .map((segment) => {
        const segmentStart = Math.max(segment.start, startChar)
        const segmentEnd = Math.min(segment.end, endChar)

        if (segmentEnd <= segmentStart) {
          return null
        }

        const relativeStart = segmentStart - segment.start
        const relativeEnd = segmentEnd - segment.start

        return {
          ...segment,
          content: segment.content.slice(relativeStart, relativeEnd),
          start: segmentStart,
          end: segmentEnd,
          key: `${segment.key}-${segmentStart}-${segmentEnd}`,
        }
      })
      .filter((segment): segment is HybridSegment => Boolean(segment && segment.content.length > 0))

    if (trimmedSegments.length === 0) {
      return {
        windowedText: rawSlice,
        windowStart: startChar,
        windowEnd: endChar,
        renderOffset: startChar,
        visibleSegments: [],
        hybridWindowText: rawSlice,
      }
    }

    const joinedContent = trimmedSegments.map((segment) => segment.content).join('')

    return {
      windowedText: rawSlice,
      windowStart: startChar,
      windowEnd: endChar,
      renderOffset: startChar,
      visibleSegments: trimmedSegments,
      hybridWindowText: joinedContent,
    }
  }, [charsPerPixel, displayText, scrollTop, segmentsWithOffsets, useWindowing])

  const mergeSegments = useCallback((items: HybridSegment[]) => {
    return items.reduce<HybridSegment[]>((acc, segment) => {
      if (!segment.content) {
        return acc
      }

      const last = acc[acc.length - 1]

      if (
        last &&
        last.type === segment.type &&
        segment.type !== 'tool'
      ) {
        acc[acc.length - 1] = {
          ...last,
          content: `${last.content}${segment.content}`,
          start: Math.min(last.start, segment.start),
          end: Math.max(last.end, segment.end),
        }
      } else {
        acc.push({ ...segment })
      }

      return acc
    }, [])
  }, [])

  const mergedHybridSegments = useMemo(
    () => mergeSegments(segmentsWithOffsets),
    [mergeSegments, segmentsWithOffsets]
  )

  const windowedHybridSegments = useMemo(
    () => mergeSegments(visibleSegments),
    [mergeSegments, visibleSegments]
  )

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (useWindowing) {
        setScrollTop(e.currentTarget.scrollTop)
      }
    },
    [useWindowing]
  )

  // Determine which state indicators to show
  const showIsPending = shouldUseTransition
  const showIsStale = shouldUseDeferredValue

  return (
    <div className="streaming-demo">
      <div className="demo-controls">
        <div className="control-group">
          <label htmlFor={`words-${level}`}>
            Words: <strong>{wordCount}</strong>
          </label>
          <input
            id={`words-${level}`}
            type="range"
            min="100"
            max="1000000"
            step="100"
            value={wordCount}
            onChange={(e) => setWordCount(Number(e.target.value))}
            disabled={isStreaming}
          />
        </div>
        <div className="control-group">
          <label htmlFor={`delay-${level}`}>
            Delay: <strong>{delay}ms</strong>
          </label>
          <input
            id={`delay-${level}`}
            type="range"
            min="1"
            max="300"
            step="1"
            value={delay}
            onChange={(e) => setDelay(Number(e.target.value))}
            disabled={isStreaming}
          />
        </div>
        <div className="button-group">
          <button
            className="btn btn-primary"
            onClick={handleStart}
            disabled={isStreaming}
          >
            Start
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleStop}
            disabled={!isStreaming}
          >
            Stop
          </button>
          <button className="btn btn-ghost" onClick={handleReset}>
            Reset
          </button>
        </div>
      </div>

      <div className="responsiveness-test">
        <label htmlFor={`input-${level}`}>
          Type here to test responsiveness:
        </label>
        <input
          id={`input-${level}`}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Try typing while streaming..."
          className="test-input"
        />
      </div>

      <MetricsPanel
        charCount={text.length}
        isStreaming={isStreaming}
        isPending={showIsPending ? isPending : undefined}
        isStale={showIsStale ? isStale : undefined}
        fpsHistory={fpsHistory}
        currentFps={currentFps}
        elapsedMs={elapsedMs}
      />

      {useWindowing && displayText && (
        <div className="window-indicator">
          <span>
            Rendering chars {windowStart.toLocaleString()} - {windowEnd.toLocaleString()} of{' '}
            {displayText.length.toLocaleString()}
          </span>
          <span className="window-percent">
            ({Math.round((WINDOW_SIZE / Math.max(displayText.length, 1)) * 100)}% rendered)
          </span>
        </div>
      )}

      <div
        className={`output-area ${isPending && showIsPending ? 'pending' : ''} ${
          isStale && showIsStale ? 'stale' : ''
        }`}
      >
        <div className="output-header">
          <div className="output-tabs">
            <button
              className={`output-tab ${outputTab === 'text' ? 'active' : ''}`}
              onClick={() => setOutputTab('text')}
            >
              Plain Text
            </button>
            <button
              className={`output-tab ${outputTab === 'markdown' ? 'active' : ''}`}
              onClick={() => setOutputTab('markdown')}
            >
              Markdown (Heavy)
            </button>
            <button
              className={`output-tab ${outputTab === 'hybrid' ? 'active' : ''}`}
              onClick={() => setOutputTab('hybrid')}
            >
              Hybrid
            </button>
          </div>
          <div className="output-badges">
            {useWindowing && (
              <span className="output-badge windowed-badge">Windowed</span>
            )}
            {showIsPending && isPending && (
              <span className="output-badge pending-badge">Pending...</span>
            )}
            {showIsStale && isStale && (
              <span className="output-badge stale-badge">Catching up...</span>
            )}
          </div>
        </div>
        <div
          ref={outputContentRef}
          className="output-content chat-scroller"
          onScroll={handleScroll}
          style={useWindowing ? { position: 'relative' } : undefined}
        >
          {displayText ? (
            useWindowing ? (
              <div style={{ height: totalHeight, position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    top: renderOffset / charsPerPixel,
                    left: 0,
                    right: 0,
                  }}
                >
                  {outputTab === 'markdown' ? (
                    <div className="llm-chunk llmChunk llm-chunk--markdown llmChunk--markdown">
                      <MarkdownRenderer content={windowedText} />
                    </div>
                  ) : outputTab === 'hybrid' ? (
                    <div className="hybrid-output">
                      <HybridRenderer
                        segments={windowedHybridSegments}
                        content={hybridWindowText}
                      />
                    </div>
                  ) : (
                    <div className="llm-chunk llmChunk llm-chunk--text llmChunk--text">
                      <PlainTextRenderer content={windowedText} />
                    </div>
                  )}
                </div>
              </div>
            ) : outputTab === 'markdown' ? (
              <div className="llm-chunk llmChunk llm-chunk--markdown llmChunk--markdown">
                <MarkdownRenderer content={displayText} />
              </div>
            ) : outputTab === 'hybrid' ? (
              <div className="hybrid-output">
                <HybridRenderer segments={mergedHybridSegments} content={displayText} />
              </div>
            ) : (
              <div className="llm-chunk llmChunk llm-chunk--text llmChunk--text">
                <PlainTextRenderer content={displayText} />
              </div>
            )
          ) : (
            <p className="placeholder-text">
              Click "Start" to begin streaming...
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
