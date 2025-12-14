import React from 'react'

interface PlainTextRendererProps {
  content: string
  className?: string
}

export function PlainTextRenderer({ content, className }: PlainTextRendererProps) {
  return (
    <pre className={`plain-text-output ${className ?? ''}`.trim()}>
      {content}
    </pre>
  )
}
