export type TaggedSegmentType = 'text' | 'markdown' | 'tool'

export interface TaggedSegment {
  type: TaggedSegmentType
  content: string
  start: number
  end: number
}

const MARKDOWN_OPEN = '<markdown>'
const MARKDOWN_CLOSE = '</markdown>'
const TOOL_OPEN = '<use_tool>'
const TOOL_CLOSE = '</use_tool>'

function findNextTag(source: string, cursor: number) {
  const markdownIndex = source.indexOf(MARKDOWN_OPEN, cursor)
  const toolIndex = source.indexOf(TOOL_OPEN, cursor)

  if (markdownIndex === -1 && toolIndex === -1) {
    return { index: -1, type: null as TaggedSegmentType | null }
  }

  if (markdownIndex === -1) {
    return { index: toolIndex, type: 'tool' as TaggedSegmentType }
  }

  if (toolIndex === -1) {
    return { index: markdownIndex, type: 'markdown' as TaggedSegmentType }
  }

  if (markdownIndex < toolIndex) {
    return { index: markdownIndex, type: 'markdown' as TaggedSegmentType }
  }

  return { index: toolIndex, type: 'tool' as TaggedSegmentType }
}

export function parseTaggedSegments(source: string): TaggedSegment[] {
  const segments: TaggedSegment[] = []
  let cursor = 0

  const pushText = (from: number, to: number) => {
    if (to <= from) {
      return
    }
    segments.push({
      type: 'text',
      content: source.slice(from, to),
      start: from,
      end: to,
    })
  }

  while (cursor < source.length) {
    const { index, type } = findNextTag(source, cursor)

    if (index === -1 || !type) {
      pushText(cursor, source.length)
      break
    }

    if (index > cursor) {
      pushText(cursor, index)
    }

    if (type === 'markdown') {
      const contentStart = index + MARKDOWN_OPEN.length
      const closeIndex = source.indexOf(MARKDOWN_CLOSE, contentStart)
      const contentEnd = closeIndex === -1 ? source.length : closeIndex
      segments.push({
        type: 'markdown',
        content: source.slice(contentStart, contentEnd),
        start: contentStart,
        end: contentEnd,
      })
      cursor = closeIndex === -1 ? source.length : closeIndex + MARKDOWN_CLOSE.length
      continue
    }

    if (type === 'tool') {
      const contentStart = index + TOOL_OPEN.length
      const closeIndex = source.indexOf(TOOL_CLOSE, contentStart)
      const contentEnd = closeIndex === -1 ? source.length : closeIndex
      segments.push({
        type: 'tool',
        content: source.slice(contentStart, contentEnd).trim(),
        start: contentStart,
        end: contentEnd,
      })
      cursor = closeIndex === -1 ? source.length : closeIndex + TOOL_CLOSE.length
      continue
    }
  }

  return segments
}
