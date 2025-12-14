import React, { useMemo, useCallback } from 'react'
import { PlainTextRenderer } from './PlainTextRenderer'
import { MarkdownRenderer } from './MarkdownRenderer'
import { parseTaggedSegments, TaggedSegment } from '../utils/segments'

interface HybridRendererProps {
  content?: string
  segments?: (TaggedSegment & { key?: string })[]
  animateWords?: boolean
}

export function HybridRenderer({
  content = '',
  segments,
  animateWords = false,
}: HybridRendererProps) {
  const computedSegments = useMemo((): (TaggedSegment & { key?: string })[] => {
    if (segments) {
      return segments
    }
    if (!content) {
      return []
    }
    return parseTaggedSegments(content)
  }, [content, segments])

  if (!computedSegments.length && content) {
    return (
      <div className="llm-chunk llmChunk llm-chunk--text llmChunk--text">
        <PlainTextRenderer content={content} animateWords={animateWords} />
      </div>
    )
  }

  const renderSegmentContent = useCallback(
    (segment: TaggedSegment) => {
      if (segment.type === 'markdown') {
        return <MarkdownRenderer content={segment.content} animateText={animateWords} />
      }

      if (segment.type === 'tool') {
        return (
          <pre className="plain-text-output tool-output" aria-label="Tool call">
            {segment.content}
          </pre>
        )
      }

      return (
        <PlainTextRenderer
          content={segment.content}
          className="hybrid-text-block"
          animateWords={animateWords}
        />
      )
    },
    [animateWords]
  )

  return (
    <>
      {computedSegments.map((segment, index) => (
        <div
          key={segment.key ?? `${segment.type}-${index}-${segment.start}`}
          className={`llm-chunk llmChunk ${
            segment.type === 'markdown'
              ? 'llm-chunk--markdown llmChunk--markdown'
              : segment.type === 'tool'
                ? 'llm-chunk--tool llmChunk--tool'
                : 'llm-chunk--text llmChunk--text'
          }`}
        >
          {renderSegmentContent(segment)}
        </div>
      ))}
    </>
  )
}
