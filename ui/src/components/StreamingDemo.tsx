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
}

type HybridSegment = TaggedSegment & { key: string }
type OutputTab = 'text' | 'markdown' | 'hybrid' | 'css-optimized' | 'css-markdown'

const MAX_FPS_HISTORY = 120
// Chunk size for CSS-optimized rendering (chars per chunk)
const CSS_CHUNK_SIZE = 2000

export function StreamingDemo({
  level,
  batchStrategy,
  useTransition: shouldUseTransition,
  useDeferredValue: shouldUseDeferredValue,
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
  const [outputTab, setOutputTab] = useState<OutputTab>('hybrid')

  const abortControllerRef = useRef<AbortController | null>(null)
  const bufferRef = useRef('')
  const rafIdRef = useRef<number>()
  const outputContentRef = useRef<HTMLDivElement>(null)
  const timerStartRef = useRef<number | null>(null)
  const timerRafRef = useRef<number>()

  // Auto-scroll
  useEffect(() => {
    const container = outputContentRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [displayText])

  useEffect(() => {
    if (!isStreaming) return
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
        setText((prev) => prev + chunk.content)
      } else if (batchStrategy === 'raf') {
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

  // Timer effect
  useEffect(() => {
    if (isStreaming) {
      timerStartRef.current = performance.now()
      const tick = () => {
        if (timerStartRef.current === null) return
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

  // Segments for hybrid renderer
  const segmentsWithOffsets = useMemo(() => {
    const parsed = parseTaggedSegments(displayText)
    return parsed.map((segment, index) => ({
      ...segment,
      key: `${segment.type}-${index}-${segment.start}`,
    }))
  }, [displayText])

  const mergeSegments = useCallback((items: HybridSegment[]) => {
    return items.reduce<HybridSegment[]>((acc, segment) => {
      if (!segment.content) return acc
      const last = acc[acc.length - 1]
      if (last && last.type === segment.type && segment.type !== 'tool') {
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

  // CSS-optimized chunked rendering
  // Splits content into chunks that can benefit from content-visibility: auto
  const cssOptimizedChunks = useMemo(() => {
    if (!displayText) return []
    const result: { id: number; content: string; segments: HybridSegment[] }[] = []
    for (let i = 0; i < displayText.length; i += CSS_CHUNK_SIZE) {
      const chunkContent = displayText.slice(i, i + CSS_CHUNK_SIZE)
      const chunkSegments = parseTaggedSegments(chunkContent).map((seg, idx) => ({
        ...seg,
        key: `chunk-${i}-${seg.type}-${idx}-${seg.start}`,
      }))
      // Merge adjacent segments of the same type
      const merged = chunkSegments.reduce<HybridSegment[]>((acc, segment) => {
        if (!segment.content) return acc
        const last = acc[acc.length - 1]
        if (last && last.type === segment.type && segment.type !== 'tool') {
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
      result.push({
        id: Math.floor(i / CSS_CHUNK_SIZE),
        content: chunkContent,
        segments: merged,
      })
    }
    return result
  }, [displayText])

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

      {(outputTab === 'css-optimized' || outputTab === 'css-markdown') && displayText && (
        <div className="css-optimized-indicator">
          <span>
            CSS Optimized (
            {outputTab === 'css-markdown'
              ? 'Markdown Only'
              : 'Hybrid'}
            ): {' '}
            {cssOptimizedChunks.length.toLocaleString()} chunks
          </span>
          <span className="chunk-info">
            {displayText.length.toLocaleString()} chars | content-visibility: auto
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
              Markdown Only
            </button>
            <button
              className={`output-tab ${outputTab === 'hybrid' ? 'active' : ''}`}
              onClick={() => setOutputTab('hybrid')}
            >
              Hybrid (Text + Markdown Mix)
            </button>
            <button
              className={`output-tab ${outputTab === 'css-markdown' ? 'active' : ''}`}
              onClick={() => setOutputTab('css-markdown')}
            >
              Markdown Only (With CSS optimizations)
            </button>
            <button
              className={`output-tab ${outputTab === 'css-optimized' ? 'active' : ''}`}
              onClick={() => setOutputTab('css-optimized')}
            >
              Hybrid (With CSS optimization)
            </button>
          </div>
          <div className="output-badges">
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
        >
          {displayText ? (
            outputTab === 'css-optimized' || outputTab === 'css-markdown' ? (
              <div className="css-optimized-output">
                {cssOptimizedChunks.map((chunk) => (
                  <CssOptimizedChunk
                    key={chunk.id}
                    segments={chunk.segments}
                    content={chunk.content}
                    mode={outputTab === 'css-markdown' ? 'markdown' : 'hybrid'}
                  />
                ))}
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

// CSS-optimized chunk component with content-visibility: auto support
// Each chunk is isolated for layout/paint containment and can be skipped when offscreen
interface CssOptimizedChunkProps {
  segments: HybridSegment[]
  content: string
  mode?: 'hybrid' | 'markdown'
}

function CssOptimizedChunk({ segments, content, mode = 'hybrid' }: CssOptimizedChunkProps) {
  const chunkRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  // Use contentvisibilityautostatechange event to defer heavy work
  // This fires when content-visibility: auto transitions between visible/hidden
  useEffect(() => {
    const element = chunkRef.current
    if (!element) return

    const handleVisibilityChange = (event: Event) => {
      // The event tells us if the content is now visible or skipped
      const isNowVisible = !(event as ContentVisibilityAutoStateChangeEvent).skipped
      setIsVisible(isNowVisible)
    }

    // Add listener for content visibility changes
    element.addEventListener('contentvisibilityautostatechange', handleVisibilityChange)

    // Initial state - assume visible until proven otherwise
    setIsVisible(true)

    return () => {
      element.removeEventListener('contentvisibilityautostatechange', handleVisibilityChange)
    }
  }, [])

  return (
    <div
      ref={chunkRef}
      className="css-optimized-chunk"
      data-visible={isVisible}
    >
      {mode === 'markdown' ? (
        <div className="llm-chunk llmChunk llm-chunk--markdown llmChunk--markdown">
          <MarkdownRenderer content={content} />
        </div>
      ) : (
        <HybridRenderer segments={segments} content={content} />
      )}
    </div>
  )
}

// TypeScript declaration for the content visibility event
interface ContentVisibilityAutoStateChangeEvent extends Event {
  skipped: boolean
}
