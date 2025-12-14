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
import { Level, BatchStrategy, StreamChunk } from '../types'

interface StreamingDemoProps {
  level: Level
  batchStrategy: BatchStrategy
  useTransition: boolean
  useDeferredValue: boolean
  useWindowing?: boolean
}

type HybridSegment = StreamChunk & { start?: number; end?: number; key?: string }

const WINDOW_SIZE = 4000 // Characters to render at a time
const WINDOW_BUFFER = 1000 // Extra buffer above/below
const LINE_HEIGHT = 24 // Approximate line height in pixels
const CHARS_PER_LINE = 80 // Approximate characters per line

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

  const [isStreaming, setIsStreaming] = useState(false)
  const [wordCount, setWordCount] = useState(300000)
  const [delay, setDelay] = useState(1)
  const [inputValue, setInputValue] = useState('')
  const [outputTab, setOutputTab] = useState<'text' | 'markdown' | 'hybrid'>('hybrid')
  const [scrollTop, setScrollTop] = useState(0)
  const [segments, setSegments] = useState<StreamChunk[]>([])

  const abortControllerRef = useRef<AbortController | null>(null)
  const bufferRef = useRef('')
  const segmentBufferRef = useRef<StreamChunk[]>([])
  const rafIdRef = useRef<number>()
  const outputContentRef = useRef<HTMLDivElement>(null)

  const handleReset = useCallback(() => {
    setText('')
    bufferRef.current = ''
    segmentBufferRef.current = []
    setScrollTop(0)
    setSegments([])
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
        setSegments((prev) => [...prev, chunk])
      } else if (batchStrategy === 'raf') {
        // Levels 2-6: Batch with requestAnimationFrame
        bufferRef.current += chunk.content
        segmentBufferRef.current.push(chunk)

        if (!rafIdRef.current) {
          rafIdRef.current = requestAnimationFrame(() => {
            const snapshot = bufferRef.current
            updateText(snapshot)
            setSegments([...segmentBufferRef.current])
            rafIdRef.current = undefined
          })
        }
      }
    }

    const onDone = () => {
      // Flush any remaining buffer
      if (batchStrategy !== 'none' && bufferRef.current) {
        updateText(bufferRef.current)
        setSegments([...segmentBufferRef.current])
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

  // Determine which text to render
  const displayText = shouldUseDeferredValue ? deferredText : text

  // Windowing logic
  const charsPerPixel = 0.12 // Approximate characters per pixel height
  const totalHeight = useWindowing ? displayText.length / charsPerPixel : 0

  const { windowedText, windowStart, windowEnd } = useMemo(() => {
    if (!useWindowing || !displayText) {
      return { windowedText: displayText, windowStart: 0, windowEnd: displayText.length }
    }

    const startChar = Math.max(0, Math.floor(scrollTop * charsPerPixel) - WINDOW_BUFFER)
    const endChar = Math.min(
      displayText.length,
      startChar + WINDOW_SIZE + WINDOW_BUFFER * 2
    )

    return {
      windowedText: displayText.slice(startChar, endChar),
      windowStart: startChar,
      windowEnd: endChar,
    }
  }, [displayText, scrollTop, useWindowing])

  const segmentsWithOffsets = useMemo(() => {
    let cursor = 0

    return segments.map((segment, index) => {
      const start = cursor
      const end = cursor + segment.content.length
      cursor = end

      return {
        ...segment,
        start,
        end,
        key: `${segment.format}-${index}-${start}`,
      }
    })
  }, [segments])

  const mergeSegments = useCallback((items: HybridSegment[]) => {
    return items.reduce<HybridSegment[]>((acc, segment) => {
      if (!segment.content) {
        return acc
      }

      const last = acc[acc.length - 1]

      if (last && last.format === segment.format) {
        acc[acc.length - 1] = {
          ...last,
          content: `${last.content}${segment.content}`,
          start: last.start ?? segment.start,
          end: segment.end ?? last.end,
        }
      } else {
        acc.push({ ...segment })
      }

      return acc
    }, [])
  }, [])

  const slicedHybridSegments = useMemo(() => {
    if (!useWindowing) {
      return segmentsWithOffsets
    }

    return segmentsWithOffsets
      .filter((segment) => segment.end !== undefined && segment.start !== undefined)
      .filter((segment) => segment.end! > windowStart && segment.start! < windowEnd)
      .map((segment) => {
        const sliceStart = Math.max(0, windowStart - (segment.start ?? 0))
        const sliceEnd = Math.min(segment.content.length, windowEnd - (segment.start ?? 0))

        return {
          ...segment,
          content: segment.content.slice(sliceStart, sliceEnd),
        }
      })
  }, [segmentsWithOffsets, useWindowing, windowEnd, windowStart])

  const mergedHybridSegments = useMemo(
    () => mergeSegments(segmentsWithOffsets),
    [mergeSegments, segmentsWithOffsets]
  )

  const windowedHybridSegments = useMemo(
    () => mergeSegments(slicedHybridSegments),
    [mergeSegments, slicedHybridSegments]
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

  const renderHybridSegments = (items: HybridSegment[]) =>
    items.map((segment, index) => (
      <div
        key={segment.key ?? `${segment.format}-${index}-${segment.start ?? 'start'}`}
        className={`llm-chunk llmChunk ${
          segment.format === 'markdown' ? 'llm-chunk--markdown llmChunk--markdown' : 'llm-chunk--text llmChunk--text'
        }`}
      >
        {segment.format === 'markdown' ? (
          <MarkdownRenderer content={segment.content} />
        ) : (
          <pre className="plain-text-output hybrid-text-block">{segment.content}</pre>
        )}
      </div>
    ))

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
            max="300000"
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
                    top: windowStart / charsPerPixel,
                    left: 0,
                    right: 0,
                  }}
                >
                  {outputTab === 'markdown' ? (
                    <div className="llm-chunk llmChunk llm-chunk--markdown llmChunk--markdown">
                      <MarkdownRenderer content={windowedText} />
                    </div>
                  ) : outputTab === 'hybrid' ? (
                    renderHybridSegments(windowedHybridSegments)
                  ) : (
                    <div className="llm-chunk llmChunk llm-chunk--text llmChunk--text">
                      <pre className="plain-text-output">{windowedText}</pre>
                    </div>
                  )}
                </div>
              </div>
            ) : outputTab === 'markdown' ? (
              <div className="llm-chunk llmChunk llm-chunk--markdown llmChunk--markdown">
                <MarkdownRenderer content={displayText} />
              </div>
            ) : outputTab === 'hybrid' ? (
              <div className="hybrid-output">{renderHybridSegments(mergedHybridSegments)}</div>
            ) : (
              <div className="llm-chunk llmChunk llm-chunk--text llmChunk--text">
                <pre className="plain-text-output">{displayText}</pre>
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
