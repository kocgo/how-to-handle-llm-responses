import React, {
  useState,
  useRef,
  useCallback,
  useTransition,
  useDeferredValue,
  useEffect,
} from 'react'
import { fetchStream } from '../utils/stream'
import { MetricsPanel } from './MetricsPanel'
import { MarkdownRenderer } from './MarkdownRenderer'
import { Level, BatchStrategy } from '../types'

interface StreamingDemoProps {
  level: Level
  batchStrategy: BatchStrategy
  useTransition: boolean
  useDeferredValue: boolean
}

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

  const [isStreaming, setIsStreaming] = useState(false)
  const [wordCount, setWordCount] = useState(100000)
  const [delay, setDelay] = useState(1)
  const [inputValue, setInputValue] = useState('')
  const [outputTab, setOutputTab] = useState<'text' | 'markdown'>('markdown')

  const abortControllerRef = useRef<AbortController | null>(null)
  const bufferRef = useRef('')
  const rafIdRef = useRef<number>()

  const handleReset = useCallback(() => {
    setText('')
    bufferRef.current = ''
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

    const onChunk = (token: string) => {
      if (batchStrategy === 'none') {
        // Level 1: Naive - setState on every chunk
        setText((prev) => prev + token)
      } else if (batchStrategy === 'raf') {
        // Levels 2-5: Batch with requestAnimationFrame
        bufferRef.current += token

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

  // Determine which text to render
  const displayText = shouldUseDeferredValue ? deferredText : text

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
            max="100000"
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

      <div
        className={`output-area ${isPending && showIsPending ? 'pending' : ''} ${isStale && showIsStale ? 'stale' : ''}`}
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
        <div className="output-content">
          {displayText ? (
            outputTab === 'markdown' ? (
              <MarkdownRenderer content={displayText} />
            ) : (
              <pre className="plain-text-output">{displayText}</pre>
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
